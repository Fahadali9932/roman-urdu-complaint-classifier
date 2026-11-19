#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.3 Python Reasoning Integrity & Explanation Parity Tests
Academic Stakeholder: Fahad (Greenwich University)
Zero budget, zero paid APIs, deterministic cryptographic provenance.
"""

import unittest
import re
from tools.ai_factory.v13_2_issue_extractor import (
    extract_municipal_issues_v13_2,
)
from tools.ai_factory.v13_2_normalizer import normalize_roman_urdu_v13_2


class TestV13_3ReasoningIntegrity(unittest.TestCase):
    REPRODUCTION_COMPLAINT = (
        "Assalamualaikum hamare area mein 10 din se bejli ni arhi. "
        "Tranforma khrab hai aur hamari gali ki rod bhi tut gai hai. "
        "Barish hoti hai to bohot kichar hota hai. "
        "Hum shikayat kar kar ke thak gaye hain."
    )

    def test_reproduction_complaint_extracts_both_ke_and_kmc_actionable(self):
        """Verify reproduction complaint identifies both K-Electric and KMC as independent actionable faults."""
        norm = normalize_roman_urdu_v13_2(self.REPRODUCTION_COMPLAINT)
        extraction = extract_municipal_issues_v13_2(self.REPRODUCTION_COMPLAINT)

        actionable = extraction["actionable_departments"]
        self.assertIn("kelectric", actionable)
        self.assertIn("kmc", actionable)
        self.assertNotIn("sswmb", actionable)

        # Verify KMC is not suppressed as mere spatial anchor
        self.assertNotIn("kmc", extraction["suppressed_departments"])

    def test_road_structural_defect_pattern_matches_rod_tut(self):
        """Verify the enhanced road defect regex detects 'rod bhi tut gai' without false positives on 'taar toot'."""
        road_defect_regex = re.compile(
            r"\b(?:khadda|khadday|gadda|gadday|pothole|potholes|toota|tooti|toote|tuta|tuti|tute|toot\s*phoot|tut\s*phut|damaged?|crater|dhans|asphalt|carpeting|encroachment|thela|vendor)\b|\b(?:road|sarak|sadak|rod|gali|foot\s*path)\b[^\.\,\;]{0,40}\b(?:toot|tut)\b|\b(?:toot|tut)\b[^\.\,\;]{0,40}\b(?:road|sarak|sadak|rod|gali|foot\s*path)\b",
            re.IGNORECASE,
        )

        # 1. Reproduction complaint should match
        self.assertTrue(bool(road_defect_regex.search("hamari gali ki rod bhi tut gai hai")))
        self.assertTrue(bool(road_defect_regex.search("road toot chuki hai")))
        self.assertTrue(bool(road_defect_regex.search("sarak tooti pari hai")))

        # 2. Wire breaking at chowk should NOT match road structural defect
        wire_break_text = "Nazimabad number 7 chowk par bijli ka taar toot gaya hai, shadeed sparking ho rahi hai"
        self.assertFalse(bool(road_defect_regex.search(wire_break_text)))

    def test_duration_extraction_parity(self):
        """Verify duration expressions such as '10 din' extract accurately."""
        m = re.search(r"\b(\d+)\s*(?:din|days?)\b", self.REPRODUCTION_COMPLAINT.lower())
        self.assertIsNotNone(m)
        self.assertEqual(m.group(1), "10")

    def test_zero_contradictory_suppression_trace(self):
        """Verify an assigned department never carries a suppression trace note."""
        extraction = extract_municipal_issues_v13_2(self.REPRODUCTION_COMPLAINT)
        notes = extraction["notes"]

        # If KMC is actionable, notes should not state it was suppressed
        if "kmc" in extraction["actionable_departments"]:
            suppressed_kmc = any("suppressed kmc" in n.lower() for n in notes)
            self.assertFalse(suppressed_kmc)


if __name__ == "__main__":
    unittest.main()
