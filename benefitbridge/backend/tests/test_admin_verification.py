import unittest

from pydantic import ValidationError

from app.main import BenefitCreate, missing_benefit_verification_fields


class AdminVerificationTests(unittest.TestCase):
    def test_verification_requires_official_details_amount_and_application_url(self):
        record = {
            "scheme_id": "verified-scheme",
            "official_source": "Ministry of Education",
            "official_url": "https://example.gov.in/scheme",
            "application_url": "https://scholarships.gov.in/",
            "benefit_amount": "Amount not specified by official source",
            "eligibility_rules": [{"field": "education", "operator": "equals", "value": "Undergraduate"}],
        }

        self.assertEqual(missing_benefit_verification_fields(record), [])

        del record["application_url"]
        del record["benefit_amount"]
        self.assertEqual(
            missing_benefit_verification_fields(record),
            [
                "official benefit amount or 'Amount not specified by official source'",
                "official application URL or explicit unconfirmed-status note",
            ],
        )

    def test_unconfirmed_application_route_can_be_recorded_without_a_url(self):
        record = {
            "scheme_id": "tn-scheme",
            "official_source": "Tamil Nadu Government",
            "official_url": "https://bcmbcmw.tn.gov.in/welfschemes.htm",
            "application_status": "Status Not Confirmed",
            "application_status_note": "The department has not published a working application URL.",
            "benefit_amount": "Amount not specified by official source",
            "eligibility_rules": [{"field": "state", "operator": "equals", "value": "Tamil Nadu"}],
        }

        self.assertEqual(missing_benefit_verification_fields(record), [])

    def test_http_application_urls_are_rejected(self):
        record = {
            "name": "Tamil Nadu College Scholarship",
            "description": "Official scheme entry.",
            "category": "Education",
            "official_url": "https://bcmbcmw.tn.gov.in/welfschemes.htm",
            "application_url": "http://www.bcmbcscholarship.tn.gov.in/",
            "official_source": "Tamil Nadu Government",
            "last_verified_at": "2026-11-18",
        }

        with self.assertRaises(ValidationError):
            BenefitCreate.model_validate(record)


if __name__ == "__main__":
    unittest.main()
