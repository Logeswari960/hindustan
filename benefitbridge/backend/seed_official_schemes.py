from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from pymongo import AsyncMongoClient

from app.main import BenefitCreate, missing_benefit_verification_fields
from app.official_catalogue import load_official_catalogue


BACKEND_DIR = Path(__file__).resolve().parent

SCHEMES = load_official_catalogue()


async def seed() -> tuple[int, int]:
    load_dotenv(BACKEND_DIR / ".env")
    uri = os.getenv("MONGODB_URI", "").strip()
    database = os.getenv("MONGODB_DATABASE", "benefitbridge").strip()
    if not uri or not database:
        raise RuntimeError("Configure MONGODB_URI and MONGODB_DATABASE in backend/.env.")

    validated_records = []
    for scheme in SCHEMES:
        record = BenefitCreate.model_validate(scheme).model_dump(mode="json")
        missing = missing_benefit_verification_fields(record)
        if missing:
            raise ValueError(f"{scheme['name']} is incomplete: {', '.join(missing)}")
        validated_records.append(record)

    client = AsyncMongoClient(uri, serverSelectionTimeoutMS=8000)
    inserted = 0
    existing = 0
    try:
        await client.admin.command("ping")
        collection = client[database].benefits
        await collection.create_index("scheme_id", unique=True, sparse=True)
        now = datetime.now(timezone.utc)
        for record in validated_records:
            record.update({
                "verification_status": "verified",
                "created_at": now,
                "updated_at": now,
            })
            key = {"scheme_id": record["scheme_id"]}
            existing_record = await collection.find_one({
                "name": record["name"],
                "official_url": record["official_url"],
            })
            if existing_record is not None:
                synchronized_fields = {
                    "scheme_id",
                    "official_source_url",
                    "official_application_url",
                    "application_url",
                    "application_status",
                    "application_status_note",
                    "application_deadline",
                    "last_verified_date",
                    "eligibility_criteria",
                    "income_limit",
                    "category_criteria",
                    "location_criteria",
                    "required_documents_note",
                }
                missing_fields = {
                    field: value
                    for field, value in record.items()
                    if field not in {"created_at", "updated_at"}
                    and (
                        field not in existing_record
                        or (field in synchronized_fields and existing_record[field] != value)
                    )
                }
                if missing_fields:
                    await collection.update_one(
                        {"_id": existing_record["_id"]},
                        {"$set": missing_fields},
                    )
                existing += 1
                continue
            result = await collection.update_one(
                key,
                {"$setOnInsert": record},
                upsert=True,
            )
            if result.upserted_id is not None:
                inserted += 1
            else:
                existing += 1

        verified = await collection.count_documents({"verification_status": "verified"})
        return inserted, verified
    finally:
        await client.close()


if __name__ == "__main__":
    added, verified_count = asyncio.run(seed())
    print(f"Official schemes inserted: {added}")
    print(f"Verified scheme records in database: {verified_count}")
    print("Existing scheme details were preserved; catalogue metadata was synchronized. No records were deleted.")
