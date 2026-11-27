from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


BACKEND_DIR = Path(__file__).resolve().parent


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env")
    parser = argparse.ArgumentParser(
        description="Promote an existing BenefitBridge account to administrator."
    )
    parser.add_argument("email", help="Email address of the existing account to promote")
    args = parser.parse_args()

    uri = os.getenv("MONGODB_URI", "").strip()
    database = os.getenv("MONGODB_DATABASE", "benefitbridge").strip()
    if not uri or not database:
        parser.error("Configure MONGODB_URI and MONGODB_DATABASE in backend/.env first.")

    email = args.email.strip().lower()
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    try:
        client.admin.command("ping")
        users = client[database].users
        user = users.find_one({"email": email}, {"_id": 1, "role": 1})
        if user is None:
            parser.error("No existing account was found for that email.")
        if user.get("role") == "admin":
            print("This account is already an administrator.")
            return 0

        confirmation = input(
            "Promote the selected existing account to administrator? Type PROMOTE to continue: "
        )
        if confirmation != "PROMOTE":
            print("No changes made.")
            return 1

        result = users.update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
        if result.modified_count != 1:
            raise RuntimeError("The account role was not changed.")
        print("Administrator role assigned. Sign in again before using /admin.")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
