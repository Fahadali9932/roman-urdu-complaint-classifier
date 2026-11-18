"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.8 Unit and Integrity Verification Suite.
"""
import hashlib
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, ".")

from tools.ai_factory.curriculum.intent_graph import DEPARTMENTS


class TestV1148BenchmarkIntegrity(unittest.TestCase):
    """Verifies all structural, semantic, and safety invariants of the V11.4.8 evaluation benchmark."""

    @classmethod
    def setUpClass(cls):
        cls.benchmark_path = Path("data/v11/eval_v11_4_8/benchmark_2000.jsonl")
        cls.manifest_path = Path("data/v11/eval_v11_4_8/dataset_manifest.json")
        cls.summary_path = Path("data/v11/eval_v11_4_8/evaluation_summary.json")

        cls.assertTrue(cls.benchmark_path.exists(), "benchmark_2000.jsonl must exist")
        cls.assertTrue(cls.manifest_path.exists(), "dataset_manifest.json must exist")
        cls.assertTrue(cls.summary_path.exists(), "evaluation_summary.json must exist")

        cls.records = [
            json.loads(l)
            for l in cls.benchmark_path.read_text(encoding="utf-8").splitlines()
            if l.strip()
        ]
        cls.manifest = json.loads(cls.manifest_path.read_text(encoding="utf-8"))
        cls.summary = json.loads(cls.summary_path.read_text(encoding="utf-8"))

    def test_01_exact_count(self):
        """Must contain exactly 2,000 complaints."""
        self.assertEqual(len(self.records), 2000)
        self.assertEqual(self.manifest["sample_count"], 2000)

    def test_02_sha256_integrity(self):
        """Benchmark file hash must match frozen manifest hash bit-for-bit."""
        hasher = hashlib.sha256()
        with open(self.benchmark_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        calc_sha = hasher.hexdigest()
        self.assertEqual(calc_sha, self.manifest["sha256"])
        self.assertEqual(calc_sha, "7c6a15b98c19b68450f0d153322f9f3db1b4b84bce76aed1a238d51b448d4747")

    def test_03_word_count_bounds(self):
        """Every complaint must be between 5 and 200 words strictly."""
        for r in self.records:
            wc = r["word_count"]
            self.assertGreaterEqual(wc, 5, f"Record {r['id']} has word count {wc} < 5")
            self.assertLessEqual(wc, 200, f"Record {r['id']} has word count {wc} > 200")
            # Verify actual text word count
            actual_wc = len(r["text"].split())
            self.assertEqual(wc, actual_wc, f"Word count mismatch in {r['id']}")

    def test_04_department_support_bounds(self):
        """Every municipal department must have >= 200 gold instances."""
        dept_counts = {d: 0 for d in DEPARTMENTS}
        for r in self.records:
            for d in r["expected_departments"]:
                self.assertIn(d, DEPARTMENTS, f"Invalid department {d} in {r['id']}")
                dept_counts[d] += 1

        for d, count in dept_counts.items():
            self.assertGreaterEqual(count, 200, f"Department {d} has only {count} < 200 instances")

    def test_05_category_distribution(self):
        """Verify all 11 primary categories are represented according to specification."""
        cat_counts = {}
        for r in self.records:
            cat = r["category"]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        expected_cats = {
            "NORMAL_EVERYDAY": 300,
            "ANGRY_AGGRESSIVE": 200,
            "ABUSIVE_PROFANITY": 200,
            "SLANG_CODESWITCH": 200,
            "INDEPENDENT_DUAL": 250,
            "INDEPENDENT_TRIPLE": 150,
            "NEGATION_CONTRADICTION": 200,
            "CAUSAL_CONSEQUENCES": 150,
            "CORRUPTED_SPELLING_GRAMMAR": 150,
            "LONG_NARRATIVES": 100,
            "OUT_OF_SCOPE_HARD_NEGATIVES": 100,
        }
        self.assertEqual(cat_counts, expected_cats)

    def test_06_no_empty_texts(self):
        """No blank or whitespace-only texts."""
        for r in self.records:
            self.assertTrue(r["text"].strip())

    def test_07_evaluation_summary_completeness(self):
        """Verify evaluation summary contains all required models and valid metrics."""
        required_models = [
            "Active_Website_Model",
            "Run_004",
            "Run_005",
            "Run_006",
            "Run_004_ML_Civic",
            "Run_005_ML_Civic",
            "Run_006_ML_Civic",
        ]
        for m in required_models:
            self.assertIn(m, self.summary)
            m_res = self.summary[m]
            self.assertEqual(m_res["sample_size"], 2000)
            self.assertGreater(m_res["exact_set_accuracy"], 0.0)
            self.assertLessEqual(m_res["exact_set_accuracy"], 1.0)
            self.assertEqual(len(m_res["exact_set_ci_95"]), 2)
            self.assertGreater(m_res["macro_f1"], 0.0)
            self.assertGreater(m_res["micro_f1"], 0.0)


if __name__ == "__main__":
    unittest.main()
