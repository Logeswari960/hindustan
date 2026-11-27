from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, OperationFailure, PyMongoError


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")


def check_mongodb() -> bool:
    uri = os.getenv("MONGODB_URI", "").strip()
    database = os.getenv("MONGODB_DATABASE", "benefitbridge").strip()
    if not uri:
        print("MongoDB: NOT CONFIGURED - set MONGODB_URI in backend/.env.")
        return False
    if not database:
        print("MongoDB: NOT CONFIGURED - set MONGODB_DATABASE in backend/.env.")
        return False
    try:
        hostname = (urlsplit(uri).hostname or "").lower()
    except ValueError:
        print("MongoDB: FAILED - the connection string is malformed or incomplete.")
        return False
    if any(marker in hostname for marker in ("xxxxx", "cluster-name", "your-cluster", "<cluster>")):
        print("MongoDB: NOT CONNECTED - replace the template hostname with the exact Atlas cluster hostname.")
        return False

    try:
        with MongoClient(uri, serverSelectionTimeoutMS=5000) as client:
            client[database].command("ping")
    except ConfigurationError as error:
        diagnostic = str(error).lower()
        if any(marker in diagnostic for marker in ("dns", "srv", "query name")):
            print("MongoDB: FAILED - SRV DNS lookup failed; verify the exact Atlas cluster URI, cluster status, and DNS/network access.")
        else:
            print("MongoDB: FAILED - the connection string is malformed or has invalid options.")
        return False
    except ValueError:
        print("MongoDB: FAILED - the connection string is malformed or incomplete.")
        return False
    except OperationFailure as error:
        if error.code in {13, 18}:
            print("MongoDB: FAILED - authentication or access was rejected; check Atlas database credentials and roles.")
        else:
            print("MongoDB: FAILED - the database rejected the ping operation.")
        return False
    except PyMongoError:
        print("MongoDB: FAILED - check Atlas network access, cluster availability, and database credentials.")
        return False

    print("MongoDB: CONNECTED - ping succeeded.")
    return True


def _groq_request(url: str, api_key: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST" if payload is not None else "GET",
    )
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def check_groq() -> bool:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        print("Groq: NOT CONFIGURED - set GROQ_API_KEY in backend/.env.")
        return False

    phase = "model-list request"
    try:
        models_response = _groq_request("https://api.groq.com/openai/v1/models", api_key)
        if not isinstance(models_response, dict):
            print("Groq: FAILED - the API returned an unexpected model list.")
            return False
        model_ids = [
            item.get("id")
            for item in models_response.get("data", [])
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        ]
        if not model_ids:
            print("Groq: FAILED - the API returned no available models.")
            return False

        preferred_models = ("llama-3.3-70b-versatile", "llama-3.1-8b-instant")
        model = next((candidate for candidate in preferred_models if candidate in model_ids), model_ids[0])
        phase = "chat-completion request"
        _groq_request(
            "https://api.groq.com/openai/v1/chat/completions",
            api_key,
            {
                "model": model,
                "messages": [{"role": "user", "content": "Reply with the single word OK."}],
                "max_tokens": 5,
                "temperature": 0,
            },
        )
    except HTTPError as error:
        if error.code == 401:
            message = "authentication was rejected; check the API key"
        elif error.code == 403:
            message = "access was denied; check key permissions and account status"
        elif error.code == 429:
            message = "rate or usage limit reached"
        elif error.code in {400, 404} and phase == "chat-completion request":
            message = "the selected model or completion request was rejected"
        else:
            message = f"request failed with HTTP status {error.code}"
        print(f"Groq: FAILED during {phase} - {message}.")
        return False
    except URLError:
        print("Groq: FAILED - could not reach the API; check network connectivity.")
        return False
    except (TimeoutError, OSError):
        print("Groq: FAILED - the request timed out or the response could not be read.")
        return False
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        print("Groq: FAILED - the API returned an unexpected response.")
        return False

    print(f"Groq: CONNECTED - test completion succeeded with model {model}.")
    return True


if __name__ == "__main__":
    mongodb_ok = check_mongodb()
    groq_ok = check_groq()
    raise SystemExit(0 if mongodb_ok and groq_ok else 1)
