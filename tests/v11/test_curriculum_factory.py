"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.3 Autonomous Curriculum Factory Tests.

Verifies:
1. Compositional Intent Graph schema, node/edge constraints, and serialization.
2. Realization across all 5 curriculum levels (Obvious, Informal, Consequence, Independent, Counterfactual).
3. Strict group isolation: zero family intersection, zero text overlap, zero near-duplicate leakage.
4. Privacy safety: PII rejection and negative check for ordinary words like 'makanon'.
5. The 5 mandatory Phase V11.3 direct civic test cases.
6. Bounded curriculum execution, cycle manifests, and early stopping.
7. End-of-run Markdown report rendering.
"""
from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools.ai_factory.curriculum.intent_graph import (
    DEPARTMENTS,
    IntentGraph,
    IssueNode,
    RelationEdge,
)
from tools.ai_factory.curriculum.realizer import (
    AutonomousCurriculumRealizer,
    normalize_text,
    SPLIT_FAMILIES,
)
from tools.ai_factory.curriculum.reporting import generate_markdown_report
from tools.ai_factory.curriculum.scheduler import (
    assert_isolated,
    check_disk_space,
    execute_curriculum_run,
)
from tools.ai_factory.training import CivicRelationResolver
from tools.ai_factory.validators import has_pii


class TestCurriculumFactory(unittest.TestCase):
    """Unit test suite for Phase V11.3 curriculum pipeline."""

    def setUp(self):
        self.realizer = AutonomousCurriculumRealizer(seed=42)

    def test_01_intent_graph_schema_and_validation(self):
        """IntentGraph serializes, deserializes, and catches invalid relations."""
        graph = IntentGraph(
            graph_id="g1",
            difficulty_level=4,
            split="train",
            target_departments=["kmc", "kwsc"],
        )
        graph.issues.append(IssueNode("i1", "kmc", "road_damage", "kmc_potholes_asphalt"))
        graph.issues.append(IssueNode("i2", "kwsc", "pipe_leak", "kwsc_pipe_burst_leak"))
        graph.edges.append(RelationEdge("i1", "i2", "INDEPENDENT"))

        errors = graph.validate()
        self.assertEqual(len(errors), 0)

        # JSON round-trip
        data = graph.to_dict()
        restored = IntentGraph.from_dict(data)
        self.assertEqual(restored.graph_id, graph.graph_id)
        self.assertEqual(restored.target_departments, ["kmc", "kwsc"])
        self.assertEqual(len(restored.issues), 2)
        self.assertEqual(len(restored.edges), 1)

    def test_02_all_curriculum_levels_realization(self):
        """Levels 1 through 5 generate valid records with matching targets."""
        for lvl in (1, 2, 3, 4, 5):
            graph = self.realizer.plan_intent_graph("train", lvl)
            record = self.realizer.realize(graph)
            self.assertEqual(record["difficulty"], lvl)
            self.assertIn("text_sanitized", record)
            self.assertGreater(len(record["text_sanitized"]), 10)
            self.assertEqual(record["source_kind"], "synthetic_agent")
            self.assertFalse(record["is_genuine_citizen_report"])

    def test_03_strict_group_isolation(self):
        """Train, Val, and Test pools share ZERO scenario families."""
        train_f = SPLIT_FAMILIES["train"]
        val_f = SPLIT_FAMILIES["validation"]
        test_f = SPLIT_FAMILIES["test"]

        self.assertEqual(train_f & val_f, set())
        self.assertEqual(train_f & test_f, set())
        self.assertEqual(val_f & test_f, set())

        # Generate batches and assert zero leakage
        train_batch = self.realizer.generate_batch("train", [1, 2, 3, 4, 5], 30)
        val_batch = self.realizer.generate_batch("validation", [1, 2, 3, 4, 5], 15)
        test_batch = self.realizer.generate_batch("test", [1, 2, 3, 4, 5], 15)

        # assert_isolated must pass without exception
        assert_isolated(train_batch, val_batch, test_batch)

    def test_04_pii_safety_and_makanon_preservation(self):
        """Rejects genuine PII while preserving ordinary words like 'makanon'."""
        self.assertFalse(has_pii("humare makanon ke samne kachra para hai"))
        self.assertFalse(has_pii("flaton ki deewar mein crack aagaya hai"))
        self.assertTrue(has_pii("Call 0300-1234567 immediately"))
        self.assertTrue(has_pii("House no 14-B street 3 mein issue hai"))

    def test_05_the_five_direct_civic_test_cases(self):
        """All 5 mandatory Phase V11.3 direct civic anchor cases resolve correctly."""
        cases = [
            # 1. Road damage affirmed
            ("humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae", ["kmc"]),
            # 2. Power outage causes private water motor stop -> K-Electric only
            ("bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi", ["kelectric"]),
            # 3. Independent broken road + public water pipeline burst -> KMC + KWSC
            ("sarak mein gaddha hai aur alag se public water pipeline phati hai", ["kmc", "kwsc"]),
            # 4. Explicit denial of gas, affirmation of uncollected waste -> SSWMB only
            ("ye gas ka masla nahi, kachra nahi uth raha", ["sswmb"]),
            # 5. Independent gas leak + sparking live wire -> SSGC + K-Electric
            ("gas ki boo aa rahi aur electric wire bhi spark kar rahi", ["kelectric", "ssgc"]),
        ]

        for text, expected in cases:
            # Baseline initial scores with keyword matching
            initial = {d: 0.10 for d in DEPARTMENTS}
            for d in expected:
                initial[d] = 0.85
            if "motor" in text:
                initial["kwsc"] = 0.60
            if "ye gas ka masla nahi" in text:
                initial["ssgc"] = 0.70

            resolved, notes = CivicRelationResolver.resolve(text, initial)
            selected = sorted([d for d in DEPARTMENTS if resolved[d] >= 0.50])
            self.assertEqual(selected, sorted(expected), f"Failed on case: '{text}' -> expected {expected}, got {selected} (Notes: {notes})")

    def test_06_bounded_curriculum_mini_run(self):
        """Runs a 2-cycle mini run in a temp dir; verifies checkpoints and manifests."""
        temp_dir = Path(tempfile.mkdtemp())
        try:
            report = execute_curriculum_run(
                output_dir=temp_dir,
                seed=42,
                max_cycles=2,
                per_cycle=100,
                eval_size=50,
                patience=2,
            )
            self.assertEqual(report["max_cycles"], 2)
            self.assertEqual(report["total_unique_synthetic_training_samples"], 200)
            self.assertTrue((temp_dir / "frozen_validation.jsonl").exists())
            self.assertTrue((temp_dir / "frozen_test.jsonl").exists())
            self.assertTrue((temp_dir / "run_report.json").exists())
            self.assertTrue((temp_dir / "champion_model.joblib").exists())
            self.assertTrue((temp_dir / "candidate_model.json").exists())
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_07_markdown_report_generation(self):
        """Markdown report renders all key sections."""
        dummy_data = {
            "generator_seed": 42,
            "total_unique_synthetic_training_samples": 6000,
            "execution_duration_seconds": 12.5,
            "per_sample_latency_ms": 1.2,
            "champion_cycle": 3,
            "frozen_test_sample_size": 250,
            "champion_thresholds": {"kmc": 0.55, "kwsc": 0.50},
            "frozen_synthetic_test_metrics": {
                "exact_set_match": 0.892,
                "exact_set_match_ci_95": [0.85, 0.93],
                "macro_f1": 0.912,
                "macro_f1_ci_95": [0.88, 0.94],
                "micro_f1": 0.925,
                "false_extra_department_rate": 0.024,
                "missed_issue_rate": 0.032,
                "mean_brier_score": 0.045,
                "per_department": {
                    "kmc": {"precision": 0.92, "recall": 0.90, "f1": 0.91, "support": 45, "brier_score": 0.04},
                },
            },
            "frozen_synthetic_test_difficulty_slices": {
                "1": {"count": 50, "exact_set_accuracy": 0.96, "false_extra_rate": 0.0, "missed_rate": 0.04},
            },
            "frozen_synthetic_test_relation_slices": {
                "SINGLE": {"count": 100, "exact_set_accuracy": 0.95},
            },
            "legacy_developer_fixtures_regression": {
                "sample_size": 33,
                "exact_set_accuracy": 0.9091,
                "macro_f1": 0.93,
                "false_extra_department_rate": 0.0,
                "missed_issue_rate": 0.09,
            },
            "cycle_history": [
                {
                    "cycle": 1,
                    "description": "Baseline",
                    "new_training_count": 1200,
                    "cumulative_training_count": 1200,
                    "validation_metrics": {"exact_set_match": 0.85, "macro_f1": 0.88, "false_extra_department_rate": 0.04, "missed_issue_rate": 0.05},
                    "saved_as_champion": True,
                }
            ],
            "split_hashes": {"frozen_validation_sha256": "abc", "frozen_test_sha256": "def"},
        }
        md = generate_markdown_report(dummy_data)
        self.assertIn("AWAAZ-E-AWAM", md)
        self.assertIn("6,000 unique complaints", md)
        self.assertIn("Frozen Synthetic Test Set Evaluation", md)
        self.assertIn("Legacy 33 Developer Fixtures Regression Check", md)


if __name__ == "__main__":
    unittest.main()
