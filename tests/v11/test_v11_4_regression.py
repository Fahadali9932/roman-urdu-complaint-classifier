"""AWAAZ-E-AWAM (آوازِ عوام) — Phase V11.4 Python Regression Test Suite.

Verifies:
1. All 31 developer-authored behavioral regression cases match 100% on:
   - Proposed departments
   - Pairwise relation type
   - Review triage gate
2. All 10 critical behavioral expectations from Section 5 of the Master Prompt.
"""

import json
from pathlib import Path
import unittest

from tools.ai_factory.curriculum.relation_engine import (
    RelationAwareComplaintAnalyzer,
    IssueCandidate,
    RelationEdge,
    ComplaintAnalysisResult,
    DEPARTMENTS,
)


class TestV11_4RelationEngineRegression(unittest.TestCase):
    """Behavioral regression test suite for V11.4 Relation Engine."""

    @classmethod
    def setUpClass(cls):
        reg_file = Path("data/v11/regression/regression_cases.jsonl")
        if not reg_file.exists():
            raise FileNotFoundError(f"Missing regression file: {reg_file}")
        cls.cases = [json.loads(line) for line in reg_file.read_text(encoding="utf-8").splitlines() if line.strip()]

    def test_01_all_31_behavioral_regression_cases(self):
        """All 31 developer-authored regression cases must match expected output."""
        self.assertEqual(len(self.cases), 31)
        for c in self.cases:
            with self.subTest(case_id=c["id"], text=c["text"]):
                res = RelationAwareComplaintAnalyzer.analyze(c["text"], complaint_id=c["id"])
                expected_depts = sorted(c["expected_departments"])
                actual_depts = sorted(res.proposed_departments)

                self.assertEqual(actual_depts, expected_depts, f"Case {c['id']} department mismatch")
                self.assertEqual(res.relation_summary, c["relation"], f"Case {c['id']} relation mismatch")
                self.assertEqual(res.needs_review, c["review"], f"Case {c['id']} review mismatch")

    def test_02_expectation_1_missing_public_location_distinguished(self):
        """1. Road defect with missing location details flags INCOMPLETE_PUBLIC_LOCATION."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae"
        )
        self.assertEqual(res.proposed_departments, ["kmc"])
        self.assertTrue(res.missing_public_location)
        self.assertFalse(res.needs_review)

    def test_03_expectation_2_power_outage_consequence_routes_to_kelectric_only(self):
        """2. Electricity outage making domestic water motor stop routes to K-Electric only."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi"
        )
        self.assertEqual(res.proposed_departments, ["kelectric"])
        self.assertNotIn("kwsc", res.proposed_departments)
        self.assertEqual(res.relation_summary, "CAUSES_CONTEXT_ONLY")

    def test_04_expectation_3_independent_road_and_pipe_routes_both(self):
        """3. Broken road AND public water pipeline leak routes to both KMC and KWSC."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "sarak mein gaddha hai aur alag se public water pipeline phati hai"
        )
        self.assertEqual(sorted(res.proposed_departments), ["kmc", "kwsc"])
        self.assertEqual(res.relation_summary, "INDEPENDENT")

    def test_05_expectation_4_negated_gas_routes_to_sswmb_only(self):
        """4. Negated gas with uncollected garbage routes to SSWMB only."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "ye gas ka masla nahi, kachra nahi uth raha"
        )
        self.assertEqual(res.proposed_departments, ["sswmb"])
        self.assertEqual(res.relation_summary, "NEGATED")

    def test_06_expectation_5_gas_odor_and_sparking_wire_routes_both(self):
        """5. Gas odor AND sparking electric wire routes to SSGC and K-Electric."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "gas ki boo aa rahi aur electric wire bhi spark kar rahi"
        )
        self.assertEqual(sorted(res.proposed_departments), ["kelectric", "ssgc"])
        self.assertEqual(res.relation_summary, "INDEPENDENT")

    def test_07_expectation_6_recipient_mention_does_not_route(self):
        """6. K-Electric addressed as recipient routes to KMC only."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "K-Electric ko bataya tha magar complaint road gaddhe ki hai"
        )
        self.assertEqual(res.proposed_departments, ["kmc"])
        self.assertNotIn("kelectric", res.proposed_departments)

    def test_08_expectation_7_spatial_proximity_without_defect_suppressed(self):
        """7. Electric pole as spatial proximity landmark without wire fault routes to SSWMB only."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "electric pole ke paas kachra jama hai"
        )
        self.assertEqual(res.proposed_departments, ["sswmb"])
        self.assertNotIn("kelectric", res.proposed_departments)
        self.assertEqual(res.relation_summary, "SPATIAL_PROXIMITY_ONLY")

    def test_09_expectation_8_same_incident_different_repairs(self):
        """8. Burst water main damaging road requiring both repairs routes to KWSC and KMC."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "pani main phat gaya aur road dhans gayi; dono pipe aur road repair karna hai"
        )
        self.assertEqual(sorted(res.proposed_departments), ["kmc", "kwsc"])
        self.assertEqual(res.relation_summary, "SAME_INCIDENT_DIFFERENT_REPAIRS")

    def test_10_expectation_9_vague_complaint_triggers_review_without_guesses(self):
        """9. Vague complaint triggers review with UNCERTAIN_DEFECT reason and zero guessed departments."""
        res = RelationAwareComplaintAnalyzer.analyze("yahan koi masla hai")
        self.assertEqual(res.proposed_departments, [])
        self.assertTrue(res.needs_review)
        self.assertEqual(res.review_reason, "UNCERTAIN_DEFECT")

    def test_11_expectation_10_three_independent_faults_routes_all(self):
        """10. Three independent faults (water, electricity, road) route to all 3 departments."""
        res = RelationAwareComplaintAnalyzer.analyze(
            "pani main leak hai, alag se feeder band hai aur market ki road bhi toot gai"
        )
        self.assertEqual(sorted(res.proposed_departments), ["kelectric", "kmc", "kwsc"])
        self.assertEqual(res.relation_summary, "INDEPENDENT")
        self.assertFalse(res.needs_review)


if __name__ == "__main__":
    unittest.main()
