"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.2B Human Data & Annotation Test Suite.

Verifies:
1. Human complaint schema validation and constraints.
2. Automated PII detection gate on human submissions.
3. Character-grounded span verification.
4. Inter-annotator agreement metrics (Cohen's Kappa, Jaccard, Exact Match).
5. Dual-annotator adjudication and dispute packet generation.
6. Partitioning and split manifest integrity (Train / Val / Untouched Test).
"""
from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools.ai_factory.human_data.agreement import (
    adjudicate_annotations,
    calculate_cohen_kappa,
    compute_detailed_inter_annotator_agreement,
)
from tools.ai_factory.human_data.cli import (
    generate_annotation_templates,
    split_human_dataset,
)
from tools.ai_factory.human_data.schema import (
    HumanAnnotationMeta,
    HumanComplaintRecord,
    HumanContextAnnotation,
    HumanIssueSpan,
    HumanProvenanceAnnotation,
    HumanRelationAnnotation,
    validate_human_dataset,
    validate_human_record,
)


class TestHumanDataPipeline(unittest.TestCase):
    """Test suite for Phase V11.2B Human Data & Annotation Infrastructure."""

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_valid_record_dict(self, record_id: str = "human_001") -> dict:
        text = "Disco bakery ke samne main road par bara khadda hai jis se bikes gir rahi hain"
        span = "main road par bara khadda hai"
        start = text.index(span)
        end = start + len(span)

        return {
            "record_id": record_id,
            "complaint_text": text,
            "issues": [
                {
                    "issue_id": f"{record_id}_iss1",
                    "department_key": "kmc",
                    "issue_type": "road_damage",
                    "span_text": span,
                    "start_char": start,
                    "end_char": end,
                    "severity": "high",
                }
            ],
            "relations": [],
            "context": {
                "negated_departments": [],
                "negated_spans": [],
                "mentioned_only_departments": [],
                "mentioned_spans": [],
                "has_hazard": False,
                "hazard_type": None,
            },
            "provenance": {
                "provenance_id": f"prov_{record_id}",
                "source_channel": "direct_citizen_interview",
                "consent_confirmed": True,
                "collected_at": "2026-11-16T12:00:00Z",
                "locality": "Gulshan-e-Iqbal Block 13-D",
                "district": "District East",
                "pii_scrubbed": True,
                "source_kind": "human_authored",
            },
            "annotation_meta": {
                "annotator_id": "annotator_01",
                "annotated_at": "2026-11-16T12:30:00Z",
                "adjudication_status": "SINGLE_ANNOTATED",
                "adjudicated_by": None,
                "adjudicated_at": None,
                "notes": "Verified roadside interview",
            },
            "needs_review": False,
            "review_reason": None,
            "review_explanation": None,
            "language_profile": "roman_urdu",
        }

    def test_01_valid_record_passes_validation(self):
        """A complete, well-formed human complaint record passes with 0 errors."""
        data = self._create_valid_record_dict()
        errors = validate_human_record(data)
        self.assertEqual(errors, [])

    def test_02_pii_scanner_rejects_unredacted_citizen_pii(self):
        """Human records containing raw citizen phone numbers or CNICs fail validation."""
        # Test phone violation
        d1 = self._create_valid_record_dict()
        d1["complaint_text"] = "Mera phone 0300-1234567 hai sadak par khadda hai"
        errs1 = validate_human_record(d1)
        self.assertTrue(any("PII detected" in e and "phone_number" in e for e in errs1))

        # Test CNIC violation
        d2 = self._create_valid_record_dict()
        d2["complaint_text"] = "CNIC 42101-1234567-1 per darj hai bijli band hai"
        errs2 = validate_human_record(d2)
        self.assertTrue(any("PII detected" in e and "cnic" in e for e in errs2))

        # Test private residence address with unit number violation
        d3 = self._create_valid_record_dict()
        d3["complaint_text"] = "House no 14-B street 3 mein gutter ubal raha hai"
        errs3 = validate_human_record(d3)
        self.assertTrue(any("PII detected" in e and "private_residence" in e for e in errs3))

    def test_03_character_span_bounds_verification(self):
        """Span offsets must match the exact substring in the complaint text."""
        data = self._create_valid_record_dict()
        # Set offsets that do not match the span text
        data["issues"][0]["start_char"] = 0
        data["issues"][0]["end_char"] = 10
        errs = validate_human_record(data)
        self.assertTrue(any("Span mismatch" in e for e in errs))

        # Test invalid bounds (start >= end)
        data2 = self._create_valid_record_dict()
        data2["issues"][0]["start_char"] = 30
        data2["issues"][0]["end_char"] = 15
        errs2 = validate_human_record(data2)
        self.assertTrue(any("Invalid char offsets" in e for e in errs2))

    def test_04_relational_edge_integrity(self):
        """Relations must reference valid issue IDs and permitted relation types."""
        text = "Bijli band hone ki wajah se pani ki motor nahi chal rahi"
        iss1_span = "Bijli band hone"
        iss2_span = "motor nahi chal rahi"
        s1 = text.index(iss1_span)
        e1 = s1 + len(iss1_span)
        s2 = text.index(iss2_span)
        e2 = s2 + len(iss2_span)

        data = self._create_valid_record_dict()
        data["complaint_text"] = text
        data["issues"] = [
            {
                "issue_id": "iss_power",
                "department_key": "kelectric",
                "issue_type": "power_outage",
                "span_text": iss1_span,
                "start_char": s1,
                "end_char": e1,
                "severity": "medium",
            },
            {
                "issue_id": "iss_motor",
                "department_key": "kwsc",
                "issue_type": "motor_stopped",
                "span_text": iss2_span,
                "start_char": s2,
                "end_char": e2,
                "severity": "low",
            },
        ]
        # Valid causal relation
        data["relations"] = [
            {
                "source_issue_id": "iss_power",
                "target_issue_id": "iss_motor",
                "relation_type": "CAUSES",
            }
        ]
        self.assertEqual(validate_human_record(data), [])

        # Invalid target ID
        data["relations"][0]["target_issue_id"] = "nonexistent_id"
        errs = validate_human_record(data)
        self.assertTrue(any("not found in annotated issues" in e for e in errs))

    def test_05_consent_and_provenance_validation(self):
        """Human records must strictly have consent_confirmed=True and source_kind=human_authored."""
        data = self._create_valid_record_dict()
        data["provenance"]["consent_confirmed"] = False
        errs = validate_human_record(data)
        self.assertTrue(any("consent_confirmed must be True" in e for e in errs))

        data2 = self._create_valid_record_dict()
        data2["provenance"]["source_kind"] = "synthetic_factory"
        errs2 = validate_human_record(data2)
        self.assertTrue(any("source_kind must be strictly 'human_authored'" in e for e in errs2))

    def test_06_review_gate_consistency(self):
        """When needs_review is True, an approved review_reason must be provided."""
        data = self._create_valid_record_dict()
        data["needs_review"] = True
        data["review_reason"] = "INVALID_REASON"
        errs = validate_human_record(data)
        self.assertTrue(any("review_reason must be one of" in e for e in errs))

        data["review_reason"] = "UNCERTAIN_DEFECT"
        self.assertEqual(validate_human_record(data), [])

    def test_07_cohen_kappa_calculation(self):
        """Cohen's Kappa matches standard mathematical agreement values."""
        # Complete agreement
        y1 = [1, 1, 0, 0, 1]
        y2 = [1, 1, 0, 0, 1]
        self.assertEqual(calculate_cohen_kappa(y1, y2), 1.0)

        # Complete disagreement
        y3 = [1, 1, 1, 1, 1]
        y4 = [0, 0, 0, 0, 0]
        self.assertEqual(calculate_cohen_kappa(y3, y4), 0.0)

        # Realistic non-trivial agreement
        y5 = [1, 0, 1, 1, 0, 0, 1, 0]
        y6 = [1, 0, 1, 0, 0, 0, 1, 1]
        k = calculate_cohen_kappa(y5, y6)
        self.assertGreater(k, 0.40)
        self.assertLess(k, 0.90)

    def test_08_inter_annotator_agreement_and_adjudication(self):
        """Inter-annotator agreement computes metrics and adjudicates consensus vs. disputed."""
        # Create two annotator files
        rec1 = self._create_valid_record_dict("rec_01")
        rec2_agree = self._create_valid_record_dict("rec_01")
        rec2_agree["annotation_meta"]["annotator_id"] = "annotator_02"

        rec_diff_1 = self._create_valid_record_dict("rec_02")
        rec_diff_2 = self._create_valid_record_dict("rec_02")
        rec_diff_2["issues"][0]["department_key"] = "sswmb"  # Discrepancy!

        f1 = self.temp_dir / "ann1.jsonl"
        f2 = self.temp_dir / "ann2.jsonl"

        with f1.open("w", encoding="utf-8") as f:
            f.write(json.dumps(rec1) + "\n")
            f.write(json.dumps(rec_diff_1) + "\n")

        with f2.open("w", encoding="utf-8") as f:
            f.write(json.dumps(rec2_agree) + "\n")
            f.write(json.dumps(rec_diff_2) + "\n")

        # Agreement metrics
        report = compute_detailed_inter_annotator_agreement(f1, f2)
        self.assertEqual(report["common_sample_size"], 2)
        self.assertEqual(report["exact_department_set_agreement_rate"], 0.50)
        self.assertEqual(report["total_discrepancies"], 1)

        # Adjudication
        out_gold = self.temp_dir / "consensus_gold.jsonl"
        out_disp = self.temp_dir / "disputed.jsonl"
        adj_res = adjudicate_annotations(f1, f2, out_gold, out_disp, adjudicator_id="lead_adjudicator")

        self.assertEqual(adj_res["consensus_records_count"], 1)
        self.assertEqual(adj_res["disputed_records_count"], 1)
        self.assertEqual(adj_res["consensus_rate"], 0.50)

        # Verify consensus gold content
        gold_lines = [json.loads(l) for l in out_gold.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(len(gold_lines), 1)
        self.assertEqual(gold_lines[0]["record_id"], "rec_01")
        self.assertEqual(gold_lines[0]["annotation_meta"]["adjudication_status"], "DUAL_CONSENSUS")
        self.assertEqual(gold_lines[0]["annotation_meta"]["adjudicated_by"], "lead_adjudicator")

        # Verify disputed queue content
        disp_lines = [json.loads(l) for l in out_disp.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(len(disp_lines), 1)
        self.assertEqual(disp_lines[0]["record_id"], "rec_02")
        self.assertEqual(disp_lines[0]["adjudication_decision"], "PENDING_ADJUDICATION")

    def test_09_human_dataset_splitter_and_manifest(self):
        """Splits human dataset into 70/15/15 partitions with SHA-256 manifest."""
        input_file = self.temp_dir / "human_adjudicated.jsonl"
        records = [self._create_valid_record_dict(f"rec_{i:03d}") for i in range(20)]

        with input_file.open("w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r) + "\n")

        out_split_dir = self.temp_dir / "splits"
        manifest = split_human_dataset(input_file, out_split_dir, seed=42)

        self.assertEqual(manifest["total_records"], 20)
        self.assertEqual(manifest["partitions"]["train"]["record_count"], 14)
        self.assertEqual(manifest["partitions"]["validation"]["record_count"], 3)
        self.assertEqual(manifest["partitions"]["test"]["record_count"], 3)
        self.assertTrue(Path(out_split_dir / "human_train.jsonl").exists())
        self.assertTrue(Path(out_split_dir / "human_validation.jsonl").exists())
        self.assertTrue(Path(out_split_dir / "human_test_untouched.jsonl").exists())
        self.assertTrue(Path(out_split_dir / "human_split_manifest.json").exists())


if __name__ == "__main__":
    unittest.main()
