#!/usr/bin/env python3
"""
Unit tests for Phase V13.5 Python Two-Department Policy Engine.
"""

import unittest
import json
import os
from tools.ai_factory.v13_5_two_department_policy import classify_v13_5_python

class TestV13_5TwoDepartmentPolicy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        model_path = os.path.join("data", "v11", "curriculum_runs", "run_004", "candidate_model.json")
        with open(model_path, "r", encoding="utf-8") as f:
            cls.model_artifact = json.load(f)

    def test_single_department_auto_routes(self):
        text = "Hamare ghar ke samne bijli ka transformer blast ho gaya hai aur light ghayab hai"
        res = classify_v13_5_python(text, self.model_artifact)
        self.assertFalse(res["twoDeptPolicyTriggered"])
        self.assertTrue(res["isTwoDepartmentCompliant"])
        self.assertFalse(res["needsReview"])
        self.assertEqual(res["departments"], ["kelectric"])
        self.assertEqual(res["allDetectedDepartments"], ["kelectric"])

    def test_dual_department_auto_routes(self):
        text = "Do din se bijli nahi aa rahi aur hamari gali ki road bhi toot gayi hai."
        res = classify_v13_5_python(text, self.model_artifact)
        self.assertFalse(res["twoDeptPolicyTriggered"])
        self.assertTrue(res["isTwoDepartmentCompliant"])
        self.assertFalse(res["needsReview"])
        self.assertIn("kelectric", res["departments"])
        self.assertIn("kmc", res["departments"])
        self.assertEqual(len(res["departments"]), 2)

    def test_three_department_escalates_to_human_triage(self):
        # 3 independent issues: Road (KMC), Electricity (KE), Sewer (KWSC)
        text = (
            "Gali ki road toot chuki hai khaday hain aur bijli ka transformer blast ho gaya hai "
            "aur sath mein gutter ka ganda pani ubal kar gali mein beh raha hai"
        )
        res = classify_v13_5_python(text, self.model_artifact)
        self.assertTrue(res["twoDeptPolicyTriggered"])
        self.assertFalse(res["isTwoDepartmentCompliant"])
        self.assertTrue(res["needsReview"])
        self.assertEqual(res["reviewReason"], "EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED")
        self.assertEqual(res["departments"], [])  # not arbitrarily truncated
        self.assertGreaterEqual(len(res["allDetectedDepartments"]), 3)
        self.assertIn("kmc", res["allDetectedDepartments"])
        self.assertIn("kelectric", res["allDetectedDepartments"])
        self.assertIn("kwsc", res["allDetectedDepartments"])

if __name__ == "__main__":
    unittest.main()
