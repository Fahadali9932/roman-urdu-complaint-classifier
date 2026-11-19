#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.4 Python Causal Reasoning & False-Extra Unit Tests
Academic Stakeholder: Fahad (Greenwich University)
Zero budget, zero paid APIs, deterministic cryptographic provenance.
"""

import unittest
from tools.ai_factory.v13_4_issue_relation_graph import build_issue_relation_graph


class TestV13_4CausalReasoning(unittest.TestCase):
    def test_case_1_independent_power_and_road(self):
        """1. Independent dual issue: Power outage AND broken road -> kelectric + kmc."""
        text = "Do din se bijli nahi aa rahi aur hamari gali ki road bhi toot gayi hai."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["kelectric", "kmc"])
        self.assertEqual(len(graph["causal_chains"]), 0)

    def test_case_2_causal_power_outage_to_motor_stoppage(self):
        """2. Causal consequence: Power outage -> domestic water motor -> kelectric ONLY."""
        text = "Do din se bijli nahi aa rahi is wajah se pani ki motor nahi chal rahi."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["kelectric"])
        self.assertIn("kwsc", graph["suppressed_departments"])

    def test_case_3_causal_water_burst_to_road_erosion(self):
        """3. Causal consequence: Water board main line burst -> road erosion -> kwsc ONLY."""
        text = "Water board ki main line phat gayi hai jis ke paani se pori road toot kar beh gayi."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["kwsc"])
        self.assertIn("kmc", graph["suppressed_departments"])

    def test_case_4_causal_gas_digging_to_road_trench(self):
        """4. Causal consequence: Gas company pipeline digging -> road trench -> ssgc ONLY."""
        text = "Sui gas walon ne pipeline dalne k liye sarak khodi aur khadda chor kar chale gaye."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["ssgc"])
        self.assertIn("kmc", graph["suppressed_departments"])

    def test_case_5_causal_garbage_dump_to_gutter_choke(self):
        """5. Causal consequence: Solid waste dump -> gutter choke -> sswmb ONLY."""
        text = "Kachray ka dher para hai jis ki wajah se gutter choke ho kar ubal raha hai."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["sswmb"])
        self.assertIn("kwsc", graph["suppressed_departments"])

    def test_case_6_location_only_road_with_fallen_electric_pole(self):
        """6. Location only: Road is spatial landmark for fallen electric pole -> kelectric ONLY."""
        text = "Road par bijli ka khamba gir gaya hai aur taar latak rahi hain."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["kelectric"])
        self.assertNotIn("kmc", graph["actionable_departments"])

    def test_case_7_safely_handles_explicit_negations(self):
        """7. Explicit negation: Electricity confirmed fine -> kelectric suppressed, sswmb actionable."""
        text = "Gali mein bijli ka masla bilkul nahi hai sirf kachray ka dher laga hua hai."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["sswmb"])
        self.assertIn("kelectric", graph["suppressed_departments"])

    def test_case_8_suppresses_historical_resolved_issues(self):
        """8. Historical/resolved: Electricity resolved last week -> kelectric suppressed, kwsc actionable."""
        text = "Pichle hafte bijli ka masla to hal ho gaya tha ab gutter ubal raha hai."
        graph = build_issue_relation_graph(text)
        self.assertEqual(graph["actionable_departments"], ["kwsc"])
        self.assertIn("kelectric", graph["suppressed_departments"])


if __name__ == "__main__":
    unittest.main()
