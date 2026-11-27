import unittest

from app.main import benefit_matches_education, normalize_state


class BenefitFilterTests(unittest.TestCase):
    def test_education_filter_matches_scheme_fields_case_insensitively(self):
        benefit = {
            "education_level": "Undergraduate",
            "course": "Computer Science",
            "tags": ["Tamil Nadu"],
        }

        self.assertTrue(benefit_matches_education(benefit, "undergrad"))
        self.assertTrue(benefit_matches_education(benefit, "COMPUTER SCIENCE"))
        self.assertFalse(benefit_matches_education(benefit, "postgraduate"))

    def test_education_filter_handles_missing_or_invalid_tags(self):
        self.assertTrue(benefit_matches_education({"tags": None}, ""))
        self.assertFalse(benefit_matches_education({"tags": None}, "undergraduate"))

    def test_state_comparison_ignores_case_and_extra_whitespace(self):
        self.assertEqual(normalize_state("  Tamil   Nadu "), normalize_state("tamil nadu"))


if __name__ == "__main__":
    unittest.main()
