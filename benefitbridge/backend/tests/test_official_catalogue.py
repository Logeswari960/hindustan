import asyncio
import unittest
from pymongo.errors import PyMongoError

from app.main import built_in_catalogue, get_benefit, list_benefits, recommendations
from app.official_catalogue import load_official_catalogue


class EmptyCursor:
    def limit(self, _limit):
        return self

    async def to_list(self, length):
        return []


class EmptyCollection:
    def find(self, *_args, **_kwargs):
        return EmptyCursor()


class EmptyProfiles:
    def __init__(self, profile=None):
        self.profile = profile

    async def find_one(self, *_args, **_kwargs):
        return self.profile


class EmptyDatabase:
    def __init__(self, profile=None):
        self.benefits = EmptyCollection()
        self.user_profiles = EmptyProfiles(profile)


class UnavailableCursor(EmptyCursor):
    async def to_list(self, length):
        raise PyMongoError("simulated Atlas outage")


class UnavailableCollection:
    def find(self, *_args, **_kwargs):
        return UnavailableCursor()


class UnavailableDatabase:
    def __init__(self):
        self.benefits = UnavailableCollection()


class OfficialCatalogueTests(unittest.TestCase):
    def test_json_catalogue_has_twenty_unique_verified_schemes(self):
        schemes = load_official_catalogue()

        self.assertEqual(len(schemes), 20)
        self.assertEqual(len({scheme["scheme_id"] for scheme in schemes}), 20)
        self.assertTrue(all(scheme["verification_status"] == "verified" for scheme in schemes))
        self.assertTrue(all(scheme["official_url"].startswith("https://") for scheme in schemes))

    def test_all_benefits_endpoint_uses_catalogue_when_database_has_no_verified_records(self):
        benefits = asyncio.run(list_benefits(user=None, db=EmptyDatabase()))

        self.assertEqual(len(benefits), 20)
        self.assertEqual(len({benefit["scheme_id"] for benefit in benefits}), 20)
        self.assertTrue(all(benefit["verification_status"] == "verified" for benefit in benefits))
        self.assertTrue(all("eligibility_summary" in benefit for benefit in benefits))
        self.assertFalse(any("bcmbcscholarship.tn.gov.in" in str(benefit["application_url"]) for benefit in benefits))

    def test_public_catalogue_endpoint_works_without_a_database_connection(self):
        benefits = asyncio.run(list_benefits(user=None, db=None))

        self.assertEqual(len(benefits), 20)
        self.assertTrue(all(benefit["verification_status"] == "verified" for benefit in benefits))

    def test_public_catalogue_falls_back_when_mongodb_query_fails(self):
        benefits = asyncio.run(list_benefits(user=None, db=UnavailableDatabase()))

        self.assertEqual(len(benefits), 20)
        self.assertTrue(all(benefit["verification_status"] == "verified" for benefit in benefits))

    def test_details_include_both_official_links_and_application_status(self):
        scheme = built_in_catalogue()[0]
        benefit = asyncio.run(get_benefit(str(scheme["_id"]), user=None, db=EmptyDatabase()))

        self.assertEqual(benefit["scheme_id"], scheme["scheme_id"])
        self.assertEqual(benefit["official_source_url"], scheme["official_url"])
        self.assertIsNone(benefit["official_application_url"])
        self.assertEqual(benefit["application_status"], "Status Not Confirmed")
        self.assertTrue(benefit["conditions"])

    def test_recommendations_use_profile_and_keep_eligibility_separate(self):
        profile = {
            "state": "Tamil Nadu",
            "education": "Undergraduate (pursuing)",
            "course": "BCA",
            "institution_type": "Government",
            "community_category": "OBC",
            "annual_income": 200000,
            "gender": "Female",
        }
        matches = asyncio.run(
            recommendations(user={"_id": "test-user"}, db=EmptyDatabase(profile))
        )

        self.assertTrue(matches)
        self.assertEqual(
            [item["recommendation_score"] for item in matches],
            sorted((item["recommendation_score"] for item in matches), reverse=True),
        )
        self.assertTrue(all(item["recommendation_score"] >= 5 for item in matches))
        self.assertLessEqual(len(matches), len(load_official_catalogue()))
        self.assertTrue(all(item["recommendation_reasons"] for item in matches))
        for item in matches:
            if item["eligibility_status"] == "not_eligible":
                self.assertEqual(item["eligibility_result"], "Does Not Meet a Mandatory Condition")


if __name__ == "__main__":
    unittest.main()
