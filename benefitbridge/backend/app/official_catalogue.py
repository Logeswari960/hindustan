from __future__ import annotations

import json
from pathlib import Path
from typing import Any


CATALOGUE_PATH = Path(__file__).resolve().parents[1] / "official_scholarships.json"


def load_official_catalogue() -> list[dict[str, Any]]:
    try:
        records = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not load the built-in scholarship catalogue: {error}") from error
    if not isinstance(records, list):
        raise ValueError("The built-in scholarship catalogue must be a JSON array.")

    scheme_ids = [record.get("scheme_id") for record in records]
    if any(not isinstance(scheme_id, str) or not scheme_id for scheme_id in scheme_ids):
        raise ValueError("Every built-in scholarship must have a non-empty scheme_id.")
    if len(set(scheme_ids)) != len(scheme_ids):
        raise ValueError("Built-in scholarship scheme_id values must be unique.")

    normalized = []
    for record in records:
        if record.get("verification_status") != "verified":
            continue
        normalized.append({
            **record,
            "official_url": record["official_source_url"],
            "application_url": record.get("official_application_url"),
            "last_verified_at": record["last_verified_date"],
            "deadline": record.get("application_deadline"),
        })
    return normalized
