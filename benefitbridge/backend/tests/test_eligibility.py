import unittest

from fastapi import HTTPException

from app.main import assess_rules


class EligibilityTests(unittest.TestCase):
    def test_all_known_rules_are_eligible(self):
        result, conditions = assess_rules(
            [{"field": "age", "operator": "lte", "value": 30, "label": "Maximum age"}],
            {"age": 20},
        )

        self.assertEqual(result, "Appears Eligible Based on Provided Information")
        self.assertEqual(conditions[0]["field"], "age")
        self.assertEqual(conditions[0]["operator"], "lte")
        self.assertTrue(conditions[0]["met"])
        self.assertEqual(conditions[0]["reason"], "Requirement matched.")

    def test_failed_mandatory_rule_is_not_eligible(self):
        result, conditions = assess_rules(
            [{"field": "age", "operator": "lte", "value": 18, "label": "Maximum age"}],
            {"age": 20},
        )

        self.assertEqual(result, "Does Not Meet a Mandatory Condition")
        self.assertFalse(conditions[0]["met"])
        self.assertTrue(conditions[0]["mandatory"])

    def test_missing_mandatory_information_requires_more_information(self):
        result, conditions = assess_rules(
            [{"field": "annual_income", "operator": "lte", "value": 300000, "label": "Income limit"}],
            {},
        )

        self.assertEqual(result, "More Information Required")
        self.assertIsNone(conditions[0]["met"])

    def test_missing_optional_information_does_not_block_result(self):
        result, conditions = assess_rules(
            [{"field": "gender", "operator": "equals", "value": "Female", "mandatory": False, "label": "Gender"}],
            {},
        )

        self.assertEqual(result, "Appears Eligible Based on Provided Information")
        self.assertIn("missing", conditions[0]["reason"])

    def test_manual_review_never_claims_eligibility_from_profile_data(self):
        result, conditions = assess_rules(
            [{
                "field": "community_category",
                "operator": "manual_review",
                "value": "Confirm the state-specific community classification.",
                "label": "Confirm community classification",
            }],
            {"community_category": "OBC (Other Backward Class)"},
        )

        self.assertEqual(result, "More Information Required")
        self.assertIsNone(conditions[0]["met"])
        self.assertIn("manual confirmation", conditions[0]["reason"])

    def test_scheme_specific_manual_review_does_not_require_a_fake_profile_field(self):
        result, conditions = assess_rules(
            [{
                "field": "scheme_specific",
                "operator": "manual_review",
                "value": "Confirm the student's officially listed scheme circumstance.",
                "label": "Confirm scheme-specific circumstance",
            }],
            {},
        )

        self.assertEqual(result, "More Information Required")
        self.assertIsNone(conditions[0]["met"])

    def test_invalid_profile_field_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            assess_rules(
                [{"field": "email", "operator": "equals", "value": "x", "label": "Email"}],
                {},
            )

        self.assertEqual(error.exception.status_code, 500)


if __name__ == "__main__":
    unittest.main()
