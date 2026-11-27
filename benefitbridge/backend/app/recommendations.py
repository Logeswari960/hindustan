from __future__ import annotations

import math
import re
from collections import Counter


_TOKEN = re.compile(r"[a-z0-9]+")
_STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "in", "is", "it", "of", "on", "or", "that", "the", "to",
    "with",
}


def _tokens(text: str) -> list[str]:
    return [token for token in _TOKEN.findall(text.casefold()) if token not in _STOP_WORDS]


def tfidf_cosine_scores(query: str, documents: list[str]) -> list[float]:
    """Return cosine relevance scores in [0, 1] using a corpus-local TF-IDF model."""
    document_tokens = [_tokens(document) for document in documents]
    query_tokens = _tokens(query)
    if not query_tokens or not documents:
        return [0.0] * len(documents)

    document_frequency: Counter[str] = Counter()
    for tokens in document_tokens:
        document_frequency.update(set(tokens))

    document_count = len(document_tokens)

    def vectorize(tokens: list[str]) -> dict[str, float]:
        counts = Counter(tokens)
        vector = {}
        for token, count in counts.items():
            frequency = document_frequency.get(token, 0)
            vector[token] = (1.0 + math.log(count)) * (
                math.log((document_count + 1) / (frequency + 1)) + 1.0
            )
        magnitude = math.sqrt(sum(weight * weight for weight in vector.values()))
        if magnitude:
            return {token: weight / magnitude for token, weight in vector.items()}
        return {}

    query_vector = vectorize(query_tokens)
    scores = []
    for tokens in document_tokens:
        document_vector = vectorize(tokens)
        scores.append(sum(weight * document_vector.get(token, 0.0) for token, weight in query_vector.items()))
    return scores


def profile_text(profile: dict) -> str:
    labels = {
        "age": "age",
        "gender": "gender",
        "state": "state",
        "education": "education",
        "course": "course",
        "course_year": "course year",
        "institution_type": "institution type",
        "annual_income": "annual family income",
        "income_range": "family income range",
        "community_category": "community category",
        "academic_percentage": "academic marks percentage",
        "employment_status": "employment status",
        "has_disability": "disability",
    }
    return " ".join(
        f"{label} {profile[key]}"
        for key, label in labels.items()
        if profile.get(key) not in (None, "")
    )


def scheme_text(scheme: dict) -> str:
    parts = [
        scheme.get("name", ""),
        scheme.get("description", ""),
        scheme.get("category", ""),
        scheme.get("official_department", ""),
        scheme.get("education_level", ""),
        scheme.get("course", ""),
        scheme.get("institution_type", ""),
        scheme.get("state", ""),
        " ".join(scheme.get("required_documents", [])),
        " ".join(scheme.get("tags", [])),
    ]
    for rule in scheme.get("eligibility_rules", []):
        parts.extend((rule.get("label", ""), str(rule.get("value", ""))))
    return " ".join(str(part) for part in parts if part)


def relevance_reasons(
    profile: dict,
    scheme: dict,
    conditions: list[dict] | None = None,
) -> list[str]:
    if conditions:
        groups = {
            "education": "education",
            "course": "education",
            "course_year": "education",
            "institution_type": "education",
            "academic_percentage": "education",
            "state": "location",
            "district": "location",
            "annual_income": "income",
            "income_range": "income",
            "community_category": "community category",
            "age": "age",
            "gender": "gender",
            "has_disability": "disability",
            "employment_status": "employment status",
        }
        reasons = []
        for condition in conditions:
            label = str(condition.get("label") or "scheme requirement")
            group = groups.get(condition.get("field"), "profile")
            if condition.get("met") is True:
                reasons.append(f"Your {group} meets the published requirement: {label}.")
            elif condition.get("met") is False:
                qualifier = "mandatory" if condition.get("mandatory") else "optional"
                reasons.append(f"Your {group} does not meet the {qualifier} requirement: {label}.")
            elif condition.get("met") is None:
                reasons.append(f"More information is needed to assess: {label}.")
        if reasons:
            return reasons

    scheme_tokens = set(_tokens(scheme_text(scheme)))
    reasons = []
    for field, label in (
        ("education", "education"),
        ("course", "course"),
        ("course_year", "course year"),
        ("institution_type", "institution type"),
        ("state", "state"),
        ("community_category", "community category"),
    ):
        value = profile.get(field)
        if value and set(_tokens(str(value))) & scheme_tokens:
            reasons.append(f"Your {label} information overlaps with this scheme's published details.")
    if not reasons:
        reasons.append("Ranked by text similarity between the available profile and scheme details.")
    return reasons


_CATEGORICAL_FEATURES = {
    "education": "education_level",
    "course": "course",
    "course_year": "course_year",
    "institution_type": "institution_type",
    "state": "state",
    "community_category": "community_category",
    "gender": "gender",
    "employment_status": "employment_status",
    "has_disability": "has_disability",
}
_NUMERIC_SCALES = {
    "age": 100.0,
    "annual_income": 1_000_000.0,
    "academic_percentage": 100.0,
    "course_year": 6.0,
}


def _values(value: object) -> list[object]:
    return value if isinstance(value, list) else [value]


def _categorical_distance(profile_value: object, scheme_values: list[object]) -> float | None:
    profile_tokens = set(_tokens(str(profile_value)))
    scheme_tokens = {
        token
        for value in scheme_values
        for token in _tokens(str(value))
    }
    if not profile_tokens or not scheme_tokens:
        return None

    vocabulary = profile_tokens | scheme_tokens
    profile_vector = [float(token in profile_tokens) for token in vocabulary]
    scheme_vector = [float(token in scheme_tokens) for token in vocabulary]
    squared_distance = sum((left - right) ** 2 for left, right in zip(profile_vector, scheme_vector))
    return math.sqrt(squared_distance / len(vocabulary))


def _numeric_distance(profile_value: object, rule: dict) -> float | None:
    if not isinstance(profile_value, (int, float)) or isinstance(profile_value, bool):
        return None
    operator = rule.get("operator")
    values = _values(rule.get("value"))
    numeric_values = [value for value in values if isinstance(value, (int, float)) and not isinstance(value, bool)]
    if not numeric_values:
        return None
    scale = _NUMERIC_SCALES.get(str(rule.get("field")), 1.0)
    if operator == "lte":
        distance = max(0.0, float(profile_value) - float(numeric_values[0]))
    elif operator == "gte":
        distance = max(0.0, float(numeric_values[0]) - float(profile_value))
    else:
        distance = min(abs(float(profile_value) - float(value)) for value in numeric_values)
    return min(distance / scale, 1.0)


def knn_recommendation_scores(profile: dict, schemes: list[dict]) -> list[tuple[int, float]]:
    """Rank scheme records by mixed-feature KNN distance from the student's profile."""
    ranked = []
    for index, scheme in enumerate(schemes):
        distances = []
        rules = scheme.get("eligibility_rules", [])

        for profile_field, scheme_field in _CATEGORICAL_FEATURES.items():
            profile_value = profile.get(profile_field)
            if profile_value in (None, ""):
                continue
            allowed_values = _values(scheme.get(scheme_field)) if scheme.get(scheme_field) not in (None, "") else []
            for rule in rules:
                if rule.get("field") == profile_field and rule.get("operator") in {"equals", "one_of"}:
                    allowed_values.extend(_values(rule.get("value")))
            if profile_field == "state" and any(
                "all india" in str(value).casefold() for value in allowed_values
            ):
                continue
            distance = _categorical_distance(profile_value, allowed_values)
            if distance is not None:
                distances.append(distance)

        for field in _NUMERIC_SCALES:
            profile_value = profile.get(field)
            if profile_value in (None, ""):
                continue
            field_rules = [rule for rule in rules if rule.get("field") == field]
            numeric_distances = [
                distance
                for rule in field_rules
                if (distance := _numeric_distance(profile_value, rule)) is not None
            ]
            if numeric_distances:
                distances.append(max(numeric_distances))

        if distances:
            distance = math.sqrt(sum(value * value for value in distances) / len(distances))
            ranked.append((index, max(0.0, 1.0 - distance)))

    ranked.sort(key=lambda item: (-item[1], item[0]))
    neighbor_count = math.ceil(math.sqrt(len(ranked)))
    return [(index, score) for index, score in ranked[:neighbor_count] if score > 0]
