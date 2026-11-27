from __future__ import annotations

import os
import re
import logging
import hashlib
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

import jwt
from bson import Binary, ObjectId
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from pwdlib import PasswordHash
from pymongo import AsyncMongoClient, DESCENDING
from pymongo.errors import DuplicateKeyError
from pymongo.errors import PyMongoError

from .recommendations import knn_recommendation_scores, profile_text, relevance_reasons
from .official_catalogue import load_official_catalogue


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

PASSWORD_HASHER = PasswordHash.recommended()
BEARER = HTTPBearer(auto_error=False)
ALLOWED_DOCUMENT_TYPES = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
}
PROFILE_FIELDS = {
    "age", "gender", "state", "district", "education", "institution",
    "course", "course_year", "institution_type", "annual_income",
    "income_range", "academic_percentage", "employment_status",
    "community_category", "has_disability",
}
APPLICATION_STATUSES = {
    "not_started", "preparing_documents", "ready_to_apply",
    "applied", "under_review", "approved", "rejected",
}
def get_setting(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def benefit_matches_education(benefit: dict[str, Any], education: str) -> bool:
    needle = education.casefold().strip()
    if not needle:
        return True
    tags = benefit.get("tags")
    if not isinstance(tags, list):
        tags = []
    fields = (
        benefit.get("education_level", ""),
        benefit.get("course", ""),
        benefit.get("institution_type", ""),
        benefit.get("academic_requirements", ""),
        *tags,
    )
    return needle in " ".join(str(value) for value in fields if value).casefold()


def benefit_search_text(benefit: dict[str, Any]) -> str:
    tags = benefit.get("tags")
    if not isinstance(tags, list):
        tags = []
    fields = (
        benefit.get("name", ""),
        benefit.get("description", ""),
        benefit.get("category", ""),
        benefit.get("official_department", ""),
        benefit.get("education_level", ""),
        benefit.get("course", ""),
        *tags,
    )
    return " ".join(str(value) for value in fields if value).casefold()


def normalize_state(value: Any) -> str:
    return " ".join(str(value or "").casefold().split())


def generate_scheme_id(name: str, official_url: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-")[:140].strip("-")
    suffix = hashlib.sha256(f"{name}\n{official_url}".encode("utf-8")).hexdigest()[:10]
    return f"{slug}-{suffix}"


def built_in_catalogue() -> list[dict[str, Any]]:
    records = []
    for scheme in load_official_catalogue():
        stable_id = hashlib.sha256(scheme["scheme_id"].encode("utf-8")).hexdigest()[:24]
        records.append({
            **scheme,
            "_id": ObjectId(stable_id),
            "verification_status": "verified",
        })
    return records


def normalize_benefit_record(benefit: dict[str, Any]) -> dict[str, Any]:
    record = dict(benefit)
    record.setdefault(
        "scheme_id",
        "legacy-" + hashlib.sha256(str(record.get("name", "")).encode("utf-8")).hexdigest()[:24],
    )
    record.setdefault("official_source_url", record.get("official_url"))
    record.setdefault("official_application_url", record.get("application_url"))
    record.setdefault("application_status", "Status Not Confirmed")
    record.setdefault("application_status_note", "Check the official portal for current application status.")
    record.setdefault("application_deadline", record.get("deadline"))
    record.setdefault("last_verified_date", record.get("last_verified_at"))
    record.setdefault(
        "eligibility_criteria",
        [rule.get("label", "") for rule in record.get("eligibility_rules", [])],
    )
    record.setdefault("income_limit", "Not specified")
    record.setdefault("category_criteria", "Not specified")
    record.setdefault("location_criteria", record.get("state") or "Not specified")
    record.setdefault("required_documents_note", "Not specified by the source")
    return record


async def verified_benefit_records(db: Any | None, limit: int = 500) -> list[dict[str, Any]]:
    if db is None:
        return [normalize_benefit_record(record) for record in built_in_catalogue()]
    try:
        cursor = db.benefits.find({"verification_status": "verified"}).limit(limit)
        records = await cursor.to_list(length=limit)
    except PyMongoError as error:
        logging.getLogger("benefitbridge").warning(
            "MongoDB scholarship query failed; serving built-in catalogue: %s",
            error,
        )
        records = []
    return [normalize_benefit_record(record) for record in records] if records else [
        normalize_benefit_record(record) for record in built_in_catalogue()
    ]


async def find_verified_benefit(db: Any | None, benefit_id: str) -> dict[str, Any] | None:
    record_id = object_id(benefit_id)
    for benefit in await verified_benefit_records(db):
        if benefit["_id"] == record_id:
            return benefit
    return None


def get_db(request: Request) -> Any:
    db = request.app.state.db
    if db is None:
        if not get_setting("MONGODB_URI"):
            detail = "Database is not configured. Set MONGODB_URI in backend/.env."
        else:
            detail = (
                "Database is temporarily unavailable. Check the API startup logs, "
                "Atlas cluster status, network access, and database user permissions."
            )
        raise HTTPException(status_code=503, detail=detail)
    return db


def get_optional_db(request: Request) -> Any | None:
    return request.app.state.db


def issue_token(user_id: str) -> str:
    secret = get_setting("JWT_SECRET")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="JWT_SECRET must be configured with at least 32 characters.")
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(minutes=30)},
        secret,
        algorithm="HS256",
    )


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    secret = get_setting("JWT_SECRET")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
        user_id = payload.get("sub", "")
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user identifier.")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user


async def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
    db: Any | None = Depends(get_optional_db),
) -> dict[str, Any] | None:
    if credentials is None:
        return None
    if db is None:
        raise HTTPException(status_code=503, detail="Database is unavailable; authenticated account data cannot be loaded.")
    secret = get_setting("JWT_SECRET")
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
        user_id = payload.get("sub", "")
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user identifier.")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user


async def admin_user(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user


def public_user(user: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user.get("role", "user"),
    }


def object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Record not found.")
    return ObjectId(value)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
            raise ValueError("Password must contain letters and numbers.")
        return value

    @field_validator("first_name", "last_name")
    @classmethod
    def trim_names(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank.")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str
    password: str


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    age: int | None = Field(default=None, ge=5, le=120)
    gender: str | None = Field(default=None, max_length=60)
    state: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    education: str | None = Field(default=None, max_length=120)
    institution: str | None = Field(default=None, max_length=200)
    course: str | None = Field(default=None, max_length=160)
    course_year: str | None = Field(default=None, max_length=40)
    institution_type: str | None = Field(default=None, max_length=80)
    annual_income: int | None = Field(default=None, ge=0, le=100_000_000)
    income_range: str | None = Field(default=None, max_length=100)
    academic_percentage: float | None = Field(default=None, ge=0, le=100)
    employment_status: str | None = Field(default=None, max_length=80)
    community_category: str | None = Field(default=None, max_length=80)
    has_disability: bool | None = None
    privacy_consent: bool


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    benefit_id: str


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal[
        "not_started", "preparing_documents", "ready_to_apply",
        "applied", "under_review", "approved", "rejected",
    ] | None = None
    reference_number: str | None = Field(default=None, max_length=120)
    submission_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class EligibilityRule(BaseModel):
    field: str
    operator: Literal["equals", "lte", "gte", "one_of", "manual_review"]
    value: Any
    mandatory: bool = True
    label: str = Field(min_length=1, max_length=120)

    @field_validator("field")
    @classmethod
    def validate_profile_field(cls, value: str) -> str:
        if value not in PROFILE_FIELDS and value != "scheme_specific":
            raise ValueError("Eligibility rule uses an unsupported profile field.")
        return value

    @model_validator(mode="after")
    def validate_manual_scheme_condition(self) -> "EligibilityRule":
        if self.field == "scheme_specific" and self.operator != "manual_review":
            raise ValueError("scheme_specific fields require the manual_review operator.")
        return self

    @field_validator("value")
    @classmethod
    def validate_operator_value(cls, value: Any, info: Any) -> Any:
        if info.data.get("operator") == "one_of" and not isinstance(value, list):
            raise ValueError("one_of rules require a list of allowed values.")
        if info.data.get("operator") == "manual_review" and (
            not isinstance(value, str) or not value.strip()
        ):
            raise ValueError("manual_review rules require a non-empty review instruction.")
        return value


class BenefitCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scheme_id: str | None = Field(default=None, min_length=3, max_length=180)
    name: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    category: str = Field(min_length=1, max_length=80)
    state: str | None = Field(default=None, max_length=100)
    benefit_amount: str | None = Field(default=None, max_length=300)
    benefit_summary: str | None = Field(default=None, max_length=2000)
    official_url: str = Field(min_length=8, max_length=1000)
    application_url: str | None = Field(default=None, min_length=8, max_length=1000)
    official_source_url: str | None = Field(default=None, min_length=8, max_length=1000)
    official_application_url: str | None = Field(default=None, min_length=8, max_length=1000)
    official_source: str = Field(min_length=1, max_length=200)
    official_department: str | None = Field(default=None, max_length=200)
    education_level: str | None = Field(default=None, max_length=200)
    course: str | None = Field(default=None, max_length=200)
    institution_type: str | None = Field(default=None, max_length=120)
    academic_requirements: str | None = Field(default=None, max_length=1000)
    last_verified_at: date
    application_open_date: date | None = None
    deadline: date | None = None
    application_deadline: date | None = None
    application_status: Literal["Open", "Closed", "Upcoming", "Status Not Confirmed"] = "Status Not Confirmed"
    application_status_note: str | None = Field(default=None, max_length=500)
    income_limit: str | None = Field(default=None, max_length=300)
    category_criteria: str | None = Field(default=None, max_length=500)
    location_criteria: str | None = Field(default=None, max_length=200)
    eligibility_criteria: list[str] = Field(default_factory=list, max_length=50)
    required_documents_note: str | None = Field(default=None, max_length=300)
    last_verified_date: date | None = None
    verification_status: Literal["verified", "pending"] | None = None
    required_documents: list[str] = Field(default_factory=list, max_length=50)
    eligibility_rules: list[EligibilityRule] = Field(default_factory=list, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("official_url")
    @classmethod
    def require_https_source(cls, value: str) -> str:
        if not value.startswith("https://"):
            raise ValueError("Official source URLs must use HTTPS.")
        return value

    @field_validator("official_source_url")
    @classmethod
    def require_https_source_alias(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("https://"):
            raise ValueError("Official source URLs must use HTTPS.")
        return value

    @field_validator("application_url")
    @classmethod
    def validate_application_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("https://"):
            raise ValueError("Official application URLs must use HTTPS.")
        return value

    @field_validator("official_application_url")
    @classmethod
    def validate_official_application_url(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith("https://"):
            raise ValueError("Official application URLs must use HTTPS.")
        return value

@asynccontextmanager
async def lifespan(app: FastAPI):
    uri = get_setting("MONGODB_URI")
    app.state.mongo_client = None
    app.state.db = None
    if uri:
        client = AsyncMongoClient(uri, serverSelectionTimeoutMS=5000)
        try:
            await client.admin.command("ping")
            db = client[get_setting("MONGODB_DATABASE", "benefitbridge")]
            await db.users.create_index("email", unique=True)
            await db.user_profiles.create_index("user_id", unique=True)
            await db.benefits.create_index("scheme_id", unique=True, sparse=True)
            await db.applications.create_index([("user_id", DESCENDING), ("benefit_id", DESCENDING)], unique=True)
            await db.documents.create_index([("user_id", DESCENDING), ("created_at", DESCENDING)])
            app.state.mongo_client = client
            app.state.db = db
        except PyMongoError:
            await client.close()
            logging.getLogger("benefitbridge").exception(
                "MongoDB is unavailable; database-backed endpoints will return 503."
            )
    try:
        yield
    finally:
        if app.state.mongo_client is not None:
            await app.state.mongo_client.close()


app = FastAPI(title="BenefitBridge API", version="1.0.0", lifespan=lifespan)
origins = [origin.strip() for origin in get_setting(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health(request: Request) -> dict[str, Any]:
    client = request.app.state.mongo_client
    if client is None:
        return JSONResponse(
            status_code=503,
            content={"ok": False, "database_configured": bool(get_setting("MONGODB_URI")), "database_connected": False},
        )
    try:
        await client.admin.command("ping")
    except PyMongoError:
        logging.getLogger("benefitbridge").exception("MongoDB health ping failed.")
        return JSONResponse(
            status_code=503,
            content={"ok": False, "database_configured": True, "database_connected": False},
        )
    return {"ok": True, "database_configured": True, "database_connected": True}


@app.post("/auth/register", status_code=201)
async def register(payload: RegisterRequest, db: Any = Depends(get_db)) -> dict[str, Any]:
    record = {
        "email": payload.email,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "password_hash": PASSWORD_HASHER.hash(payload.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = await db.users.insert_one(record)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = {**record, "_id": result.inserted_id}
    return {"access_token": issue_token(str(result.inserted_id)), "token_type": "bearer", "user": public_user(user)}


@app.post("/auth/login")
async def login(payload: LoginRequest, db: Any = Depends(get_db)) -> dict[str, Any]:
    email = payload.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if user is None or not PASSWORD_HASHER.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"access_token": issue_token(str(user["_id"])), "token_type": "bearer", "user": public_user(user)}


@app.get("/auth/me")
async def get_me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return public_user(user)


@app.get("/profile")
async def get_profile(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> dict[str, Any] | None:
    profile = await db.user_profiles.find_one({"user_id": user["_id"]}, {"_id": 0, "user_id": 0})
    return profile


@app.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    if not payload.privacy_consent:
        raise HTTPException(status_code=422, detail="Privacy consent is required to save a profile.")
    values = payload.model_dump()
    values["updated_at"] = datetime.now(timezone.utc)
    await db.user_profiles.update_one(
        {"user_id": user["_id"]},
        {"$set": values, "$setOnInsert": {"user_id": user["_id"], "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return await get_profile(user, db) or {}


@app.delete("/account", status_code=204)
async def delete_account(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> None:
    user_id = user["_id"]
    await db.documents.delete_many({"user_id": user_id})
    await db.applications.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    await db.user_profiles.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": user_id})


@app.get("/benefits")
async def list_benefits(
    q: str = "",
    category: str = "",
    state: str = "",
    education: str = "",
    sort: str = "relevance",
    user: dict[str, Any] | None = Depends(optional_user),
    db: Any | None = Depends(get_optional_db),
) -> list[dict[str, Any]]:
    benefits = await verified_benefit_records(db, limit=500)
    if category:
        benefits = [benefit for benefit in benefits if benefit.get("category") == category]
    if state:
        requested_state = normalize_state(state)
        benefits = [
            benefit for benefit in benefits
            if normalize_state(benefit.get("state")) in {requested_state, "all india"}
        ]
    if q:
        needle = q.casefold()
        benefits = [benefit for benefit in benefits if needle in benefit_search_text(benefit)]
    if education:
        benefits = [benefit for benefit in benefits if benefit_matches_education(benefit, education)]
    if sort == "deadline":
        benefits.sort(key=lambda benefit: benefit.get("deadline") or "9999-12-31")
    elif sort == "newest":
        benefits.sort(key=lambda benefit: benefit.get("last_verified_at") or "", reverse=True)
    profile = (
        await db.user_profiles.find_one({"user_id": user["_id"]}) or {}
        if user else {}
    )
    for benefit in benefits:
        result, conditions = assess_rules(benefit.get("eligibility_rules", []), profile)
        benefit["is_saved"] = bool(
            user and benefit["_id"] in user.get("saved_benefit_ids", [])
        )
        benefit["conditions"] = conditions
        benefit["eligibility_result"] = result
        benefit["eligibility_status"] = (
            "not_eligible" if result == "Does Not Meet a Mandatory Condition" else
            "eligible" if result == "Appears Eligible Based on Provided Information" else
            "more_info_needed"
        )
        benefit["eligibility_summary"] = "; ".join(
            rule["label"] for rule in benefit.get("eligibility_rules", [])
        )
        benefit["id"] = str(benefit.pop("_id"))
        benefit.pop("eligibility_rules", None)
        benefit["official_info_url"] = benefit.get("official_url")
    return benefits[:100]


@app.get("/benefits/{benefit_id}")
async def get_benefit(
    benefit_id: str,
    user: dict[str, Any] | None = Depends(optional_user),
    db: Any | None = Depends(get_optional_db),
) -> dict[str, Any]:
    benefit = await find_verified_benefit(db, benefit_id)
    if benefit is None:
        raise HTTPException(status_code=404, detail="Verified benefit record not found.")
    profile = (
        await db.user_profiles.find_one({"user_id": user["_id"]}) or {}
        if user else {}
    )
    result, conditions = assess_rules(benefit.get("eligibility_rules", []), profile)
    benefit["is_saved"] = bool(user and benefit["_id"] in user.get("saved_benefit_ids", []))
    benefit["conditions"] = conditions
    benefit["eligibility_result"] = result
    benefit["eligibility_status"] = (
        "not_eligible" if result == "Does Not Meet a Mandatory Condition" else
        "eligible" if result == "Appears Eligible Based on Provided Information" else
        "more_info_needed"
    )
    benefit["eligibility_summary"] = "; ".join(
        rule["label"] for rule in benefit.get("eligibility_rules", [])
    )
    benefit.pop("eligibility_rules", None)
    benefit["id"] = str(benefit.pop("_id"))
    benefit["official_info_url"] = benefit.get("official_url")
    return benefit


@app.post("/eligibility/check/{benefit_id}")
async def check_eligibility(
    benefit_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    benefit = await find_verified_benefit(db, benefit_id)
    if benefit is None:
        raise HTTPException(status_code=404, detail="Verified benefit record not found.")
    profile = await db.user_profiles.find_one({"user_id": user["_id"]}) or {}
    result, conditions = assess_rules(benefit.get("eligibility_rules", []), profile)
    return {
        "benefit_id": benefit_id,
        "result": result,
        "conditions": conditions,
        "disclaimer": "Eligibility results are preliminary assessments based on the information provided. Final eligibility and approval are determined by the respective scheme authority.",
        "assessed_at": datetime.now(timezone.utc),
    }


def assess_rules(raw_rules: list[dict[str, Any]], profile: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    mandatory_failure = False
    information_missing = not bool(raw_rules)
    conditions = []
    for raw_rule in raw_rules:
        try:
            rule = EligibilityRule.model_validate(raw_rule)
        except ValidationError as error:
            raise HTTPException(status_code=500, detail="Scheme record contains an invalid eligibility rule.") from error
        actual = profile.get(rule.field)
        if rule.operator == "manual_review":
            met = None
            information_missing = information_missing or rule.mandatory
        elif actual is None or (rule.operator in {"lte", "gte"} and not isinstance(actual, (int, float))):
            met = None
            information_missing = information_missing or rule.mandatory
        elif rule.operator == "equals":
            met = actual == rule.value
        elif rule.operator == "lte":
            met = actual <= rule.value
        elif rule.operator == "gte":
            met = actual >= rule.value
        else:
            met = actual in rule.value
        if met is False and rule.mandatory:
            mandatory_failure = True
        conditions.append({
            "field": rule.field,
            "operator": rule.operator,
            "label": rule.label,
            "user_value": actual,
            "required_value": rule.value,
            "met": met,
            "mandatory": rule.mandatory,
            "reason": (
                "Requirement matched." if met is True else
                "Mandatory requirement is not met." if met is False and rule.mandatory else
                "Optional requirement is not met." if met is False else
                "The official scheme requires a manual confirmation not captured by the profile." if rule.operator == "manual_review" else
                "Profile information is missing."
            ),
        })
    result = (
        "Does Not Meet a Mandatory Condition" if mandatory_failure else
        "More Information Required" if information_missing else
        "Appears Eligible Based on Provided Information"
    )
    return result, conditions


@app.get("/recommendations")
async def recommendations(
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> list[dict[str, Any]]:
    profile = await db.user_profiles.find_one({"user_id": user["_id"]})
    if profile is None or not profile_text(profile).strip():
        return []
    candidates = []
    for benefit in await verified_benefit_records(db):
        if not benefit.get("eligibility_rules"):
            continue
        state = benefit.get("state")
        normalized_state = normalize_state(state)
        if normalized_state and normalized_state != "all india" and normalized_state != normalize_state(profile.get("state")):
            continue
        result, conditions = assess_rules(benefit.get("eligibility_rules", []), profile)
        candidates.append((benefit, result, conditions))

    candidates = [
        candidate for candidate in candidates
        if candidate[1] != "Does Not Meet a Mandatory Condition"
    ]
    ranked = knn_recommendation_scores(profile, [benefit for benefit, _, _ in candidates])
    matches = []
    for index, score in ranked:
        benefit, result, conditions = candidates[index]
        benefit_id = benefit.pop("_id")
        benefit["id"] = str(benefit_id)
        benefit["is_saved"] = benefit_id in user.get("saved_benefit_ids", [])
        benefit["recommendation_score"] = round(score * 100)
        benefit["recommendation_reasons"] = [
            f"Profile criteria are the closest match among the available schemes (KNN score: {round(score * 100)}%).",
            *relevance_reasons(profile, benefit, conditions),
        ]
        benefit["eligibility_summary"] = "; ".join(
            rule["label"] for rule in benefit.get("eligibility_rules", [])
        )
        benefit["eligibility_result"] = result
        benefit["eligibility_status"] = (
            "not_eligible" if result == "Does Not Meet a Mandatory Condition" else
            "eligible" if result == "Appears Eligible Based on Provided Information" else
            "more_info_needed"
        )
        benefit["conditions"] = conditions
        benefit["official_info_url"] = benefit.get("official_url")
        benefit.pop("eligibility_rules", None)
        matches.append(benefit)
    return sorted(matches, key=lambda benefit: benefit["recommendation_score"], reverse=True)


@app.post("/benefits/{benefit_id}/save", status_code=204)
async def save_benefit(
    benefit_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> None:
    benefit = await find_verified_benefit(db, benefit_id)
    if benefit is None:
        raise HTTPException(status_code=404, detail="Verified benefit record not found.")
    await db.users.update_one({"_id": user["_id"]}, {"$addToSet": {"saved_benefit_ids": benefit["_id"]}})


@app.delete("/benefits/{benefit_id}/save", status_code=204)
async def unsave_benefit(user: dict[str, Any] = Depends(current_user), benefit_id: str = "", db: Any = Depends(get_db)) -> None:
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"saved_benefit_ids": object_id(benefit_id)}})


def public_document(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "type": document["type"],
        "content_type": document["content_type"],
        "size": document["size"],
        "status": "needs_review",
        "uploaded_at": document.get("updated_at", document["created_at"]),
    }


async def validated_document(file: UploadFile, document_type: str) -> dict[str, Any]:
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    allowed_types = ALLOWED_DOCUMENT_TYPES.get(extension)
    if not filename or allowed_types is None or file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Only PDF, JPG, and PNG documents are supported.")
    if not document_type.strip() or len(document_type) > 120:
        raise HTTPException(status_code=422, detail="Document type must be between 1 and 120 characters.")
    max_bytes = int(get_setting("MAX_UPLOAD_SIZE_MB", "10")) * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
    if not content:
        raise HTTPException(status_code=422, detail="The selected file is empty.")
    signatures = {
        ".pdf": content.startswith(b"%PDF-"),
        ".jpg": content.startswith(b"\xff\xd8\xff"),
        ".jpeg": content.startswith(b"\xff\xd8\xff"),
        ".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
    }
    if not signatures[extension]:
        raise HTTPException(status_code=415, detail="File content does not match the selected document format.")
    return {
        "name": filename[:180],
        "type": document_type.strip(),
        "content_type": file.content_type,
        "size": len(content),
        "content": Binary(content),
    }


@app.get("/documents")
async def list_documents(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> list[dict[str, Any]]:
    cursor = db.documents.find({"user_id": user["_id"]}, {"content": 0}).sort("created_at", DESCENDING).limit(200)
    return [public_document(document) for document in await cursor.to_list(length=200)]


@app.post("/documents", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "Other",
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record = {
        "user_id": user["_id"],
        **await validated_document(file, document_type),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.documents.insert_one(record)
    record["_id"] = result.inserted_id
    return public_document(record)


@app.put("/documents/{document_id}")
async def replace_document(
    document_id: str,
    file: UploadFile = File(...),
    document_type: str = "Other",
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record_id = object_id(document_id)
    content = await validated_document(file, document_type)
    result = await db.documents.update_one(
        {"_id": record_id, "user_id": user["_id"]},
        {"$set": {**content, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found.")
    document = await db.documents.find_one({"_id": record_id, "user_id": user["_id"]})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return public_document(document)


@app.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> StreamingResponse:
    document = await db.documents.find_one({"_id": object_id(document_id), "user_id": user["_id"]})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", document["name"])[:180]
    return StreamingResponse(
        BytesIO(bytes(document["content"])),
        media_type=document["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@app.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> None:
    result = await db.documents.delete_one({"_id": object_id(document_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found.")


@app.get("/applications")
async def list_applications(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> list[dict[str, Any]]:
    cursor = db.applications.find({"user_id": user["_id"]}).sort("updated_at", DESCENDING).limit(200)
    applications = await cursor.to_list(length=200)
    for application in applications:
        application["id"] = str(application.pop("_id"))
        application["benefit_id"] = str(application["benefit_id"])
        application.pop("user_id", None)
    return applications


@app.post("/applications", status_code=201)
async def start_application(
    payload: ApplicationCreate,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    benefit = await find_verified_benefit(db, payload.benefit_id)
    if benefit is None:
        raise HTTPException(status_code=404, detail="Verified benefit record not found.")
    benefit_id = benefit["_id"]
    existing = await db.applications.find_one({"user_id": user["_id"], "benefit_id": benefit_id})
    if existing is not None:
        existing["id"] = str(existing.pop("_id"))
        existing["benefit_id"] = str(existing["benefit_id"])
        existing.pop("user_id", None)
        return existing
    now = datetime.now(timezone.utc)
    application = {
        "user_id": user["_id"],
        "benefit_id": benefit_id,
        "benefit_name": benefit["name"],
        "category": benefit["category"],
        "status": "preparing_documents",
        "reference_number": None,
        "submission_date": None,
        "notes": "",
        "history": [{"status": "preparing_documents", "date": now.date().isoformat()}],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.applications.insert_one(application)
    application["id"] = str(result.inserted_id)
    application["benefit_id"] = payload.benefit_id
    application.pop("_id", None)
    application.pop("user_id", None)
    return application


@app.put("/applications/{application_id}")
async def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record = await db.applications.find_one({"_id": object_id(application_id), "user_id": user["_id"]})
    if record is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] not in APPLICATION_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid application status.")
    if changes.get("status") and changes["status"] != record["status"]:
        record.setdefault("history", []).append({
            "status": changes["status"],
            "date": datetime.now(timezone.utc).date().isoformat(),
        })
    changes["updated_at"] = datetime.now(timezone.utc)
    update_fields = {key: value.isoformat() if isinstance(value, date) else value for key, value in changes.items()}
    if "history" in record:
        update_fields["history"] = record["history"]
    await db.applications.update_one({"_id": record["_id"], "user_id": user["_id"]}, {"$set": update_fields})
    updated = {**record, **changes}
    updated["id"] = str(updated.pop("_id"))
    updated["benefit_id"] = str(updated["benefit_id"])
    updated.pop("user_id", None)
    return updated


@app.get("/deadlines")
async def list_deadlines(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> list[dict[str, Any]]:
    today = date.today()
    cursor = db.benefits.find({
        "verification_status": "verified",
        "deadline": {"$gte": today.isoformat()},
    }, {"name": 1, "deadline": 1})
    benefits = await cursor.to_list(length=500)
    return [{
        "benefit_id": str(benefit["_id"]),
        "benefit_name": benefit["name"],
        "date": benefit["deadline"],
        "days_remaining": (date.fromisoformat(benefit["deadline"]) - today).days,
    } for benefit in benefits]


@app.get("/notifications")
async def list_notifications(user: dict[str, Any] = Depends(current_user), db: Any = Depends(get_db)) -> list[dict[str, Any]]:
    cursor = db.notifications.find({"user_id": user["_id"]}).sort("created_at", DESCENDING).limit(200)
    values = await cursor.to_list(length=200)
    for value in values:
        value["id"] = str(value.pop("_id"))
    return values


@app.put("/notifications/{notification_id}/read", status_code=204)
async def mark_notification_read(
    notification_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> None:
    result = await db.notifications.update_one(
        {"_id": object_id(notification_id), "user_id": user["_id"]},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")


@app.put("/notifications/read-all", status_code=204)
async def mark_all_notifications_read(
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> None:
    await db.notifications.update_many({"user_id": user["_id"]}, {"$set": {"is_read": True}})


@app.delete("/notifications/{notification_id}", status_code=204)
async def dismiss_notification(
    notification_id: str,
    user: dict[str, Any] = Depends(current_user),
    db: Any = Depends(get_db),
) -> None:
    result = await db.notifications.delete_one({"_id": object_id(notification_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")


@app.get("/admin/benefits")
async def admin_list_benefits(
    user: dict[str, Any] = Depends(admin_user),
    db: Any = Depends(get_db),
) -> list[dict[str, Any]]:
    cursor = db.benefits.find({}).sort("updated_at", DESCENDING).limit(500)
    values = await cursor.to_list(length=500)
    for value in values:
        value["id"] = str(value.pop("_id"))
    return values


@app.post("/admin/benefits", status_code=201)
async def admin_create_benefit(
    payload: BenefitCreate,
    user: dict[str, Any] = Depends(admin_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record = payload.model_dump(mode="json")
    record["scheme_id"] = record.get("scheme_id") or generate_scheme_id(
        record["name"],
        record["official_source_url"] or record["official_url"],
    )
    record.update({
        "verification_status": "pending",
        "created_by": user["_id"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    try:
        result = await db.benefits.insert_one(record)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A scheme with this unique scheme ID already exists.")
    record["id"] = str(result.inserted_id)
    record.pop("_id", None)
    record.pop("created_by", None)
    return record


@app.put("/admin/benefits/{benefit_id}")
async def admin_update_benefit(
    benefit_id: str,
    payload: BenefitCreate,
    user: dict[str, Any] = Depends(admin_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record_id = object_id(benefit_id)
    values = payload.model_dump(mode="json")
    existing = await db.benefits.find_one({"_id": record_id})
    if existing is None:
        raise HTTPException(status_code=404, detail="Benefit record not found.")
    values["scheme_id"] = values.get("scheme_id") or existing.get("scheme_id") or generate_scheme_id(
        values["name"],
        values["official_source_url"] or values["official_url"],
    )
    values.update({
        "verification_status": "pending",
        "updated_by": user["_id"],
        "updated_at": datetime.now(timezone.utc),
    })
    try:
        await db.benefits.update_one({"_id": record_id}, {"$set": values})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A scheme with this unique scheme ID already exists.")
    values["id"] = benefit_id
    values.pop("updated_by", None)
    return values


@app.post("/admin/benefits/{benefit_id}/verify")
async def admin_verify_benefit(
    benefit_id: str,
    user: dict[str, Any] = Depends(admin_user),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    record_id = object_id(benefit_id)
    record = await db.benefits.find_one({"_id": record_id})
    if record is None:
        raise HTTPException(status_code=404, detail="Benefit record not found.")
    missing_fields = missing_benefit_verification_fields(record)
    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot verify this scheme. Add or confirm: {', '.join(missing_fields)}.",
        )
    now = datetime.now(timezone.utc)
    await db.benefits.update_one(
        {"_id": record_id},
        {"$set": {
            "verification_status": "verified",
            "last_verified_at": now.date().isoformat(),
            "verified_by": user["_id"],
            "updated_at": now,
        }},
    )
    record.update({
        "id": benefit_id,
        "verification_status": "verified",
        "last_verified_at": now.date().isoformat(),
    })
    record.pop("_id", None)
    record.pop("verified_by", None)
    return record


def missing_benefit_verification_fields(record: dict[str, Any]) -> list[str]:
    required_fields = (
        ("scheme_id", "unique scheme ID"),
        ("official_source", "official source name"),
        ("official_url", "official scheme information URL"),
        ("benefit_amount", "official benefit amount or 'Amount not specified by official source'"),
    )
    missing = [
        label for field, label in required_fields
        if not isinstance(record.get(field), str) or not record[field].strip()
    ]
    application_url = record.get("official_application_url") or record.get("application_url")
    if not isinstance(application_url, str) or not application_url.strip():
        has_manual_status = (
            record.get("application_status") == "Status Not Confirmed"
            and isinstance(record.get("application_status_note"), str)
            and bool(record["application_status_note"].strip())
        )
        if not has_manual_status:
            missing.append("official application URL or explicit unconfirmed-status note")
    if not record.get("eligibility_rules"):
        missing.append("eligibility rules")
    return missing


@app.get("/resources")
async def list_resources() -> list[dict[str, Any]]:
    return []
