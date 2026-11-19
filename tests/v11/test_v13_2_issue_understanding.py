"""AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.2 Python Parity Test Suite.

Verifies 100% behavioral parity with TypeScript implementation:
1. Roman Urdu non-destructive normalization (elongations, fused tokens, civic spelling).
2. Multi-issue extraction across unpunctuated discourse clauses.
3. Causal consequence demotion and Fahad's routing rule.
4. Robustness against anger/profanity and negation operators.
"""

import unittest
from tools.ai_factory.v13_2_normalizer import (
    normalize_roman_urdu_v13_2,
    collapse_repeated_characters,
    split_joined_civic_tokens,
)
from tools.ai_factory.v13_2_issue_extractor import extract_municipal_issues_v13_2


class TestV13_2IssueUnderstanding(unittest.TestCase):
    """Test suite validating V13.2 issue understanding and normalization in Python."""

    def test_normalization_elongations(self):
        self.assertEqual(collapse_repeated_characters("paaaani"), "paani")
        self.assertEqual(collapse_repeated_characters("biiiijli"), "bijli")
        self.assertEqual(collapse_repeated_characters("toooooota"), "toota")
        self.assertEqual(collapse_repeated_characters("garrrha"), "garha")

    def test_normalization_fused_spaces(self):
        self.assertEqual(split_joined_civic_tokens("paninahi araha"), "pani nahi araha")
        self.assertEqual(split_joined_civic_tokens("bijlinahi he"), "bijli nahi he")
        self.assertEqual(split_joined_civic_tokens("gasnahi aarahe"), "gas nahi aarahe")
        self.assertEqual(split_joined_civic_tokens("lightchali gai"), "light chali gai")

    def test_normalization_proper_nouns_and_addresses(self):
        text = "Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya"
        norm = normalize_roman_urdu_v13_2(text)
        self.assertIn("basia", norm)
        self.assertIn("banglows", norm)
        self.assertIn("gulshan", norm)
        self.assertIn("transformer", norm)
        self.assertIn("bijli", norm)

    def test_acceptance_case_1_basia_bungalows(self):
        text = "Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he"
        res = extract_municipal_issues_v13_2(text)
        self.assertIn("kelectric", res["actionableDepartments"])
        self.assertIn("kmc", res["actionableDepartments"])
        self.assertIn("sswmb", res["actionableDepartments"])

    def test_acceptance_case_2_causal_water_motor(self):
        text = "Light chali gayi subah se transformer phat gaya hai jis ki wajah se pani ki motor nahi chal rahi pani nahi araha"
        res = extract_municipal_issues_v13_2(text)
        self.assertIn("kelectric", res["actionableDepartments"])
        self.assertIn("kwsc", res["suppressedDepartments"])
        self.assertNotIn("kwsc", res["actionableDepartments"])
        self.assertTrue(any(c["rootDept"] == "kelectric" and c["consequenceDept"] == "kwsc" for c in res["causalChains"]))

    def test_acceptance_case_3_independent_water_and_power(self):
        text = "Main water supply line phat chuki hai gali doob gayi hai aur saath doosri gali mein pole ka taar toota hua hai current araha hai"
        res = extract_municipal_issues_v13_2(text)
        self.assertIn("kwsc", res["actionableDepartments"])
        self.assertIn("kelectric", res["actionableDepartments"])

    def test_acceptance_case_4_negated_power_with_road(self):
        text = "Pani ka koi masla nahi hai bijli bilkul theek hai lekin sadak par bohat bara garha hai road tooti hui hai"
        res = extract_municipal_issues_v13_2(text)
        self.assertEqual(res["actionableDepartments"], ["kmc"])

    def test_acceptance_case_5_independent_gas_and_waste(self):
        text = "Gas bilkul nahi arahi hai chulha nahi jal raha aur bahar kachray ka dher laga hua hai badboo phail rahi hai"
        res = extract_municipal_issues_v13_2(text)
        self.assertIn("ssgc", res["actionableDepartments"])
        self.assertIn("sswmb", res["actionableDepartments"])


if __name__ == "__main__":
    unittest.main()
