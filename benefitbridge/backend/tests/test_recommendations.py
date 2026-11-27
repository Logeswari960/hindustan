import unittest

from app.recommendations import (
    knn_recommendation_scores,
    profile_text,
    relevance_reasons,
    scheme_text,
    tfidf_cosine_scores,
)


class RecommendationTests(unittest.TestCase):
    def test_tfidf_ranks_the_document_with_more_profile_overlap(self):
        scores = tfidf_cosine_scores(
            "education undergraduate Tamil Nadu annual income",
            [
                "undergraduate education in Tamil Nadu with income eligibility",
                "housing support for rural households",
            ],
        )

        self.assertGreater(scores[0], scores[1])
        self.assertTrue(all(0 <= score <= 1 for score in scores))

    def test_empty_profile_does_not_create_recommendations(self):
        self.assertEqual(tfidf_cosine_scores("", ["education scholarship"]), [0.0])

    def test_profile_text_excludes_personal_identifiers_and_keeps_relevant_fields(self):
        text = profile_text({
            "first_name": "Private",
            "email": "private@example.test",
            "education": "Undergraduate",
            "state": "Tamil Nadu",
        })

        self.assertIn("Undergraduate", text)
        self.assertIn("Tamil Nadu", text)
        self.assertNotIn("Private", text)
        self.assertNotIn("private@example.test", text)

    def test_scheme_text_includes_published_rule_values(self):
        text = scheme_text({
            "name": "College grant",
            "eligibility_rules": [{"label": "Minimum marks", "value": 60}],
        })

        self.assertIn("Minimum marks", text)
        self.assertIn("60", text)

    def test_reasons_only_claim_profile_fields_found_in_scheme_text(self):
        reasons = relevance_reasons(
            {"state": "Tamil Nadu", "education": "Undergraduate", "course": "Biology"},
            {"name": "Tamil Nadu undergraduate support", "eligibility_rules": []},
        )

        self.assertTrue(any("state" in reason for reason in reasons))
        self.assertTrue(any("education" in reason for reason in reasons))
        self.assertFalse(any("course" in reason for reason in reasons))

    def test_rule_reasons_distinguish_matches_failures_and_missing_information(self):
        reasons = relevance_reasons(
            {},
            {},
            [
                {"field": "education", "label": "Undergraduate students", "met": True, "mandatory": True},
                {"field": "annual_income", "label": "Income below limit", "met": False, "mandatory": True},
                {"field": "state", "label": "Tamil Nadu residents", "met": None, "mandatory": True},
            ],
        )

        self.assertIn("Your education meets the published requirement: Undergraduate students.", reasons)
        self.assertIn("Your income does not meet the mandatory requirement: Income below limit.", reasons)
        self.assertIn("More information is needed to assess: Tamil Nadu residents.", reasons)

    def test_knn_ranks_matching_categorical_and_scaled_numeric_features_first(self):
        profile = {
            "education": "Undergraduate",
            "course": "BCA",
            "state": "Tamil Nadu",
            "annual_income": 200000,
        }
        schemes = [
            {
                "education_level": "Undergraduate",
                "course": "BCA",
                "state": "Tamil Nadu",
                "eligibility_rules": [
                    {"field": "annual_income", "operator": "lte", "value": 300000},
                ],
            },
            {
                "education_level": "Postgraduate",
                "course": "Engineering",
                "state": "Karnataka",
                "eligibility_rules": [
                    {"field": "annual_income", "operator": "lte", "value": 100000},
                ],
            },
        ]

        scores = knn_recommendation_scores(profile, schemes)

        self.assertEqual(scores[0][0], 0)
        self.assertEqual(scores[0][1], 1.0)
        self.assertTrue(all(0 < score <= 1 for _, score in scores))


if __name__ == "__main__":
    unittest.main()
