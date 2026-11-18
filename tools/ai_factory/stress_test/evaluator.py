"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.5 Adversarial Stress-Test Evaluator.

Executes the frozen V11.4.4 candidate model against ~2,000 adversarial Roman Urdu complaints.
Computes exhaustive metrics across 15 categories, 5 length tiers, 6 departments,
insult/slang robustness, review gate calibration, and latency.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import joblib
import numpy as np

from tools.ai_factory.curriculum.relation_engine import RelationAwareComplaintAnalyzer
from tools.ai_factory.stress_test.generator import AdversarialStressGenerator, StressComplaintRecord

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]


class AdversarialStressEvaluator:
    """Evaluates the frozen model bundle on adversarial stress complaints."""

    def __init__(
        self,
        model_bundle_path: str = "data/v11/curriculum_runs/run_004/champion_model.joblib",
        output_dir: str = "data/v11/stress_test"
    ) -> None:
        self.model_bundle_path = Path(model_bundle_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        print(f"Loading frozen model bundle from: {self.model_bundle_path}")
        bundle = joblib.load(self.model_bundle_path)
        self.feature_union = bundle["feature_union"]
        self.classifier = bundle["model"]
        self.thresholds = bundle["thresholds"]
        self.analyzer = RelationAwareComplaintAnalyzer()

    def run_evaluation(self, records: List[StressComplaintRecord]) -> Dict[str, Any]:
        """Runs inference on all records and computes exhaustive scientific metrics."""
        print(f"Running inference on {len(records)} stress complaints...")
        start_time = time.perf_counter()

        predictions: List[Dict[str, Any]] = []
        latencies: List[float] = []

        for r in records:
            t0 = time.perf_counter()
            X = self.feature_union.transform([r.text])
            raw_probs = self.classifier.predict_proba(X)[0]
            analysis = self.analyzer.analyze(r.text)
            dt = (time.perf_counter() - t0) * 1000.0  # ms
            latencies.append(dt)

            raw_dict = {dept: float(raw_probs[i]) for i, dept in enumerate(DEPARTMENTS)}
            resolved_dict: Dict[str, float] = {}
            pred_depts: List[str] = []

            for i, dept in enumerate(DEPARTMENTS):
                p = raw_dict[dept]
                th = self.thresholds.get(dept, 0.50)
                if dept in analysis.proposed_departments:
                    final_p = max(p, 0.85)
                else:
                    final_p = min(p, th * 0.40)
                resolved_dict[dept] = round(final_p, 4)
                if final_p >= th:
                    pred_depts.append(dept)

            pred_depts = sorted(pred_depts)
            exp_depts = sorted(r.expected_departments)

            is_exact = pred_depts == exp_depts
            false_extra = [d for d in pred_depts if d not in exp_depts]
            missed = [d for d in exp_depts if d not in pred_depts]

            # Review gate accuracy
            review_correct = analysis.needs_review == r.expected_needs_review

            pred_item = {
                "complaint_id": r.complaint_id,
                "text": r.text,
                "category": r.category,
                "length_tier": r.length_tier,
                "word_count": r.word_count,
                "has_slang": r.has_slang,
                "has_insult": r.has_insult,
                "has_spelling_noise": r.has_spelling_noise,
                "has_missing_spaces": r.has_missing_spaces,
                "has_code_switching": r.has_code_switching,
                "has_long_context": r.has_long_context,
                "relation_type": r.relation_type,
                "expected_departments": exp_depts,
                "predicted_departments": pred_depts,
                "is_exact_match": is_exact,
                "false_extra_departments": false_extra,
                "missed_departments": missed,
                "expected_needs_review": r.expected_needs_review,
                "predicted_needs_review": analysis.needs_review,
                "predicted_review_reason": analysis.review_reason,
                "review_gate_correct": review_correct,
                "raw_probabilities": raw_dict,
                "resolved_probabilities": resolved_dict,
                "reason_trace": analysis.reason_trace,
                "latency_ms": round(dt, 2),
            }
            predictions.append(pred_item)

        total_time = time.perf_counter() - start_time
        print(f"Inference completed in {total_time:.2f}s ({np.mean(latencies):.2f} ms/sample).")

        # Save benchmark data and prediction logs
        benchmark_file = self.output_dir / "adversarial_benchmark_2000.jsonl"
        with open(benchmark_file, "w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r.to_dict(), ensure_ascii=False) + "\n")

        results_log = self.output_dir / "stress_test_predictions.jsonl"
        with open(results_log, "w", encoding="utf-8") as f:
            for p in predictions:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")

        failure_file = self.output_dir / "failure_cases.jsonl"
        failure_cases = [p for p in predictions if not p["is_exact_match"] or not p["review_gate_correct"]]
        with open(failure_file, "w", encoding="utf-8") as f:
            for fc in failure_cases:
                f.write(json.dumps(fc, ensure_ascii=False) + "\n")

        print(f"Saved {len(failure_cases)} failure cases to: {failure_file}")

        # Compute Metrics
        metrics = self._compute_metrics(predictions, latencies, total_time)

        metrics_file = self.output_dir / "evaluation_results.json"
        with open(metrics_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n")
        print(f"Saved metrics summary to: {metrics_file}")

        return metrics

    def _compute_metrics(
        self,
        predictions: List[Dict[str, Any]],
        latencies: List[float],
        total_time: float
    ) -> Dict[str, Any]:
        N = len(predictions)
        exact_matches = sum(1 for p in predictions if p["is_exact_match"])
        exact_accuracy = exact_matches / N if N > 0 else 0.0

        # Confidence Interval (Normal approximation / Wilson score)
        z = 1.96
        ci_half = z * np.sqrt((exact_accuracy * (1 - exact_accuracy)) / N) if N > 0 else 0.0
        ci_95 = [round(max(0.0, exact_accuracy - ci_half), 4), round(min(1.0, exact_accuracy + ci_half), 4)]

        has_false_extra = sum(1 for p in predictions if len(p["false_extra_departments"]) > 0)
        false_extra_rate = has_false_extra / N if N > 0 else 0.0

        has_missed = sum(1 for p in predictions if len(p["missed_departments"]) > 0)
        missed_rate = has_missed / N if N > 0 else 0.0

        # Review Gate metrics
        review_correct = sum(1 for p in predictions if p["review_gate_correct"])
        review_accuracy = review_correct / N if N > 0 else 0.0

        # Out-of-scope review recall
        out_of_scope = [p for p in predictions if p["category"] == "AMBIGUOUS_OUT_OF_SCOPE"]
        out_of_scope_recalled = sum(1 for p in out_of_scope if p["predicted_needs_review"] and len(p["predicted_departments"]) == 0)
        out_of_scope_review_rate = out_of_scope_recalled / len(out_of_scope) if out_of_scope else 0.0

        # Department Level Metrics
        dept_metrics: Dict[str, Dict[str, Any]] = {}
        f1_list = []
        for dept in DEPARTMENTS:
            tp = sum(1 for p in predictions if dept in p["predicted_departments"] and dept in p["expected_departments"])
            fp = sum(1 for p in predictions if dept in p["predicted_departments"] and dept not in p["expected_departments"])
            fn = sum(1 for p in predictions if dept not in p["predicted_departments"] and dept in p["expected_departments"])
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
            f1_list.append(f1)
            dept_metrics[dept] = {
                "support": tp + fn,
                "true_positives": tp,
                "false_positives": fp,
                "false_negatives": fn,
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
            }

        macro_f1 = float(np.mean(f1_list))

        # Performance by Category
        categories = sorted(list(set(p["category"] for p in predictions)))
        cat_metrics: Dict[str, Dict[str, Any]] = {}
        for cat in categories:
            sub = [p for p in predictions if p["category"] == cat]
            sub_n = len(sub)
            sub_exact = sum(1 for p in sub if p["is_exact_match"])
            sub_fe = sum(1 for p in sub if len(p["false_extra_departments"]) > 0)
            sub_mi = sum(1 for p in sub if len(p["missed_departments"]) > 0)
            cat_metrics[cat] = {
                "count": sub_n,
                "exact_accuracy": round(sub_exact / sub_n, 4) if sub_n > 0 else 0.0,
                "false_extra_rate": round(sub_fe / sub_n, 4) if sub_n > 0 else 0.0,
                "missed_rate": round(sub_mi / sub_n, 4) if sub_n > 0 else 0.0,
            }

        # Performance by Length Tier
        tier_metrics: Dict[str, Dict[str, Any]] = {}
        for t in range(1, 6):
            sub = [p for p in predictions if p["length_tier"] == t]
            sub_n = len(sub)
            if sub_n > 0:
                sub_exact = sum(1 for p in sub if p["is_exact_match"])
                sub_fe = sum(1 for p in sub if len(p["false_extra_departments"]) > 0)
                sub_mi = sum(1 for p in sub if len(p["missed_departments"]) > 0)
                tier_metrics[f"Tier_{t}"] = {
                    "count": sub_n,
                    "exact_accuracy": round(sub_exact / sub_n, 4),
                    "false_extra_rate": round(sub_fe / sub_n, 4),
                    "missed_rate": round(sub_mi / sub_n, 4),
                }

        # Slices: Insults vs Neutral, Slang vs Standard, Spelling Noise vs Clean
        insult_sub = [p for p in predictions if p["has_insult"]]
        no_insult_sub = [p for p in predictions if not p["has_insult"]]
        slang_sub = [p for p in predictions if p["has_slang"]]
        no_slang_sub = [p for p in predictions if not p["has_slang"]]
        spell_sub = [p for p in predictions if p["has_spelling_noise"]]
        no_spell_sub = [p for p in predictions if not p["has_spelling_noise"]]
        space_sub = [p for p in predictions if p["has_missing_spaces"]]
        multi_sub = [p for p in predictions if len(p["expected_departments"]) >= 2]
        single_sub = [p for p in predictions if len(p["expected_departments"]) == 1]

        def slice_acc(subset: List[Dict[str, Any]]) -> Dict[str, Any]:
            if not subset:
                return {"count": 0, "exact_accuracy": 0.0, "false_extra_rate": 0.0, "missed_rate": 0.0}
            cnt = len(subset)
            ex = sum(1 for p in subset if p["is_exact_match"])
            fe = sum(1 for p in subset if len(p["false_extra_departments"]) > 0)
            mi = sum(1 for p in subset if len(p["missed_departments"]) > 0)
            return {
                "count": cnt,
                "exact_accuracy": round(ex / cnt, 4),
                "false_extra_rate": round(fe / cnt, 4),
                "missed_rate": round(mi / cnt, 4)
            }

        slices = {
            "with_insults_profanity": slice_acc(insult_sub),
            "without_insults_profanity": slice_acc(no_insult_sub),
            "with_heavy_slang": slice_acc(slang_sub),
            "without_heavy_slang": slice_acc(no_slang_sub),
            "with_spelling_noise": slice_acc(spell_sub),
            "without_spelling_noise": slice_acc(no_spell_sub),
            "with_missing_spaces_punct": slice_acc(space_sub),
            "multi_department_compound": slice_acc(multi_sub),
            "single_department_direct": slice_acc(single_sub)
        }

        # Multi-department silent secondary omission check
        multi_cases = [p for p in predictions if len(p["expected_departments"]) >= 2]
        silent_omissions = sum(
            1 for p in multi_cases
            if len(p["predicted_departments"]) > 0 and len(p["predicted_departments"]) < len(p["expected_departments"])
        )
        silent_omission_rate = silent_omissions / len(multi_cases) if multi_cases else 0.0

        # Causal consequence suppression check
        causal_cases = [p for p in predictions if p["category"] == "CAUSAL_CONSEQUENCE"]
        causal_exact = sum(1 for p in causal_cases if p["is_exact_match"])
        causal_fe = sum(1 for p in causal_cases if len(p["false_extra_departments"]) > 0)
        causal_exact_rate = causal_exact / len(causal_cases) if causal_cases else 0.0
        causal_false_extra_rate = causal_fe / len(causal_cases) if causal_cases else 0.0

        return {
            "benchmark_title": "Awaaz-e-Awam Phase V11.4.5 Adversarial Stress Test",
            "model_version": "v11-candidate-1",
            "model_bundle_path": str(self.model_bundle_path),
            "total_samples": N,
            "execution_duration_seconds": round(total_time, 2),
            "mean_latency_ms": round(float(np.mean(latencies)), 2),
            "median_latency_ms": round(float(np.median(latencies)), 2),
            "p95_latency_ms": round(float(np.percentile(latencies, 95)), 2),
            "exact_department_set_accuracy": round(exact_accuracy, 4),
            "exact_set_accuracy_ci_95": ci_95,
            "macro_f1": round(macro_f1, 4),
            "false_extra_department_rate": round(false_extra_rate, 4),
            "missed_department_rate": round(missed_rate, 4),
            "review_gate_accuracy": round(review_accuracy, 4),
            "out_of_scope_review_rate": round(out_of_scope_review_rate, 4),
            "silent_omission_rate_in_compound": round(silent_omission_rate, 4),
            "causal_consequence_accuracy": round(causal_exact_rate, 4),
            "causal_false_extra_rate": round(causal_false_extra_rate, 4),
            "department_metrics": dept_metrics,
            "category_metrics": cat_metrics,
            "length_tier_metrics": tier_metrics,
            "behavioral_slices": slices
        }
