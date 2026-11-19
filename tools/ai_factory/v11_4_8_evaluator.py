"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.8 Blind Benchmark Evaluator.

Executes a comprehensive, immutable evaluation of 2,000 unseen Roman Urdu complaints across:
- Active Website Model (src/models/v11_candidate_model.json / Run 004)
- Run 004 Champion (data/v11/curriculum_runs/run_004/)
- Run 005 Candidate (data/v11/curriculum_runs/run_005/)
- Run 006 Candidate (data/v11/curriculum_runs/run_006/)

Evaluates both:
1. Website Relation-Aware Pipeline (used by LocalV11ComplaintService.ts)
2. Statistical ML + CivicRelationResolver Pipeline (used by classifyV11)

Computes all required performance metrics, category and length slices,
latency benchmarks, and outputs full prediction and failure JSONL datasets.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import joblib
import numpy as np

sys.path.insert(0, ".")

from tools.ai_factory.curriculum.intent_graph import DEPARTMENTS
from tools.ai_factory.curriculum.relation_engine import RelationAwareComplaintAnalyzer, DOMAIN_EVIDENCE
from tools.ai_factory.training import CivicRelationResolver
from tools.ai_factory.evaluation import compute_metrics


def compute_wilson_ci(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float]:
    """Compute Wilson score interval for binomial proportion."""
    if n == 0:
        return 0.0, 0.0
    z = 1.95996  # 95% confidence
    p = k / n
    denominator = 1 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denominator
    half_width = z * np.sqrt((p * (1 - p) + z**2 / (4 * n)) / n) / denominator
    return float(round(max(0.0, centre - half_width), 4)), float(round(min(1.0, centre + half_width), 4))


class V1148Evaluator:
    """Rigorous evaluation runner for Phase V11.4.8."""

    def __init__(self, benchmark_path: str = "data/v11/eval_v11_4_8/benchmark_2000.jsonl"):
        self.benchmark_path = Path(benchmark_path)
        if not self.benchmark_path.exists():
            raise FileNotFoundError(f"Missing benchmark file: {self.benchmark_path}")

        self.records = [
            json.loads(line)
            for line in self.benchmark_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        if len(self.records) != 2000:
            raise ValueError(f"Benchmark must contain exactly 2,000 records, found {len(self.records)}")

        self.departments = DEPARTMENTS
        self.analyzer = RelationAwareComplaintAnalyzer()
        self.out_dir = Path("data/v11/eval_v11_4_8")
        self.out_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def has_domain_keyword_support(low_text: str, dept: str) -> bool:
        lex = DOMAIN_EVIDENCE.get(dept, {})
        for p in lex.get("assets", []):
            if re.search(p, low_text):
                return True
        for p in lex.get("defects", []):
            if re.search(p, low_text):
                return True
        return False

    def evaluate_model_bundle(
        self,
        model_id: str,
        joblib_path: str,
        mode: str = "relation_aware",
        thresholds_override: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Run complete 2,000-complaint evaluation for a candidate model bundle.
        
        mode:
          - "relation_aware": mirrors LocalV11ComplaintService.ts (classifyV11RelationAware)
          - "civic_ml": mirrors classifyV11 with CivicRelationResolver and statistical ML weights
        """
        print(f"\n=======================================================", flush=True)
        print(f"=== EVALUATING {model_id} [Mode: {mode}] ON 2,000 UNSEEN COMPLAINTS ===", flush=True)
        print(f"=======================================================", flush=True)

        artifact = joblib.load(joblib_path)
        feature_union = artifact["feature_union"]
        model = artifact["model"]
        thresholds = thresholds_override or artifact.get("thresholds", {})

        print(f"[MODEL LOADED] {joblib_path}", flush=True)
        print(f"[THRESHOLDS] {thresholds}", flush=True)

        texts = [r.get("text_sanitized") or r.get("text") or "" for r in self.records]

        # Measure Latency (Mean & P95)
        latencies = []
        sample_for_timing = texts[:100]
        for t in sample_for_timing:
            t0 = time.perf_counter()
            vec = feature_union.transform([t])
            raw_p = model.predict_proba(vec)[0]
            if mode in ("relation_aware", "hybrid"):
                init_p = {d: float(raw_p[self.departments.index(d)]) for d in self.departments}
                civic_p, _ = CivicRelationResolver.resolve(t, init_p)
                analysis = self.analyzer.analyze(t)
            else:
                init_p = {d: float(raw_p[self.departments.index(d)]) for d in self.departments}
                _ = CivicRelationResolver.resolve(t, init_p)
            latencies.append((time.perf_counter() - t0) * 1000.0)

        mean_latency_ms = float(round(np.mean(latencies), 2))
        p95_latency_ms = float(round(np.percentile(latencies, 95), 2))
        print(f"[LATENCY] Mean: {mean_latency_ms:.2f} ms | P95: {p95_latency_ms:.2f} ms", flush=True)

        # Batch Inference
        t_start = time.time()
        X_vec = feature_union.transform(texts)
        raw_probs = model.predict_proba(X_vec)

        predictions_list: List[Dict[str, Any]] = []
        failure_cases: List[Dict[str, Any]] = []

        y_true = np.zeros((len(self.records), len(self.departments)), dtype=int)
        y_pred = np.zeros((len(self.records), len(self.departments)), dtype=int)
        resolved_probs = np.zeros((len(self.records), len(self.departments)), dtype=float)

        for i, r in enumerate(self.records):
            exp_depts = sorted(r.get("expected_departments", []))
            for d in exp_depts:
                if d in self.departments:
                    y_true[i, self.departments.index(d)] = 1

            text = texts[i]
            pred_depts = []

            if mode in ("relation_aware", "hybrid"):
                init_p = {d: float(raw_probs[i, j]) for j, d in enumerate(self.departments)}
                civic_p, _ = CivicRelationResolver.resolve(text, init_p)
                analysis = self.analyzer.analyze(text)

                if analysis.needs_review and analysis.review_reason == "OUT_OF_SCOPE":
                    final_depts = []
                    rel_type = analysis.relation_summary
                    needs_review = True
                    review_reason = "OUT_OF_SCOPE"
                else:
                    suppressed = set()
                    for edge in analysis.edges:
                        if edge.relation_type == "CAUSES_CONTEXT_ONLY" and edge.target_id and edge.target_id != "consequence":
                            suppressed.add(edge.target_id)
                    for cand in analysis.issue_candidates:
                        if cand.department:
                            if cand.mention_type == "consequence":
                                suppressed.add(cand.department)
                            elif cand.mention_type == "negated_mention" or cand.negation_scope:
                                has_active = any(
                                    c.department == cand.department and c.is_actionable and not c.negation_scope
                                    for c in analysis.issue_candidates
                                )
                                if not has_active:
                                    suppressed.add(cand.department)

                    ml_selected = [d for d in self.departments if civic_p[d] >= thresholds.get(d, 0.5)]
                    rule_selected = list(analysis.proposed_departments)

                    final_depts = []
                    low_text = text.lower()
                    for dept in self.departments:
                        if dept in suppressed:
                            continue
                        rule_pass = dept in rule_selected
                        ml_pass = dept in ml_selected
                        if rule_pass:
                            final_depts.append(dept)
                        elif ml_pass:
                            if self.has_domain_keyword_support(low_text, dept):
                                final_depts.append(dept)

                    rel_type = "INDEPENDENT" if len(final_depts) > 1 else analysis.relation_summary
                    needs_review = (len(final_depts) == 0)
                    review_reason = analysis.review_reason if needs_review else None

                for j, dept in enumerate(self.departments):
                    th = thresholds.get(dept, 0.5)
                    if dept in final_depts:
                        p = max(civic_p[dept], th)
                        y_pred[i, j] = 1
                    else:
                        p = min(civic_p[dept], th * 0.4)
                    resolved_probs[i, j] = p

                pred_depts = sorted(final_depts)
            else:
                init_p = {d: float(raw_probs[i, j]) for j, d in enumerate(self.departments)}
                res_dict, notes = CivicRelationResolver.resolve(text, init_p)
                for j, dept in enumerate(self.departments):
                    p = res_dict.get(dept, init_p[dept])
                    resolved_probs[i, j] = p
                    th = thresholds.get(dept, 0.5)
                    if p >= th:
                        y_pred[i, j] = 1
                        pred_depts.append(dept)
                rel_type = "civic_relation_resolver"
                needs_review = False
                review_reason = None

            pred_depts.sort()
            is_correct = (pred_depts == exp_depts)

            pred_record = {
                "id": r["id"],
                "category": r["category"],
                "bracket": r["bracket"],
                "word_count": r["word_count"],
                "text": text,
                "expected_departments": exp_depts,
                "predicted_departments": pred_depts,
                "is_correct": is_correct,
                "relation_type": rel_type,
                "needs_review": needs_review,
                "review_reason": review_reason,
            }
            predictions_list.append(pred_record)

            if not is_correct:
                missed = [d for d in exp_depts if d not in pred_depts]
                extra = [d for d in pred_depts if d not in exp_depts]
                failure_cases.append({
                    **pred_record,
                    "missed_departments": missed,
                    "extra_departments": extra,
                })

        total_infer_dur = round(time.time() - t_start, 2)
        print(f"[INFERENCE COMPLETE] 2,000 cases processed in {total_infer_dur}s", flush=True)

        # 1. Exact Department-Set Match Accuracy
        exact_matches = sum(1 for p in predictions_list if p["is_correct"])
        exact_acc = float(round(exact_matches / len(self.records), 4))
        ci_low, ci_high = compute_wilson_ci(exact_matches, len(self.records))

        # 2 & 3. Correct & Incorrect counts
        correct_count = exact_matches
        incorrect_count = len(self.records) - exact_matches

        # Compute standard classification metrics
        std_metrics = compute_metrics(y_true, y_pred, resolved_probs, departments=self.departments)
        macro_f1 = std_metrics["macro_f1"]
        micro_f1 = std_metrics["micro_f1"]
        false_extra_rate = std_metrics["false_extra_department_rate"]
        missed_rate = std_metrics["missed_issue_rate"]
        per_dept = std_metrics["per_department"]

        # Category Slice Accuracy
        category_metrics: Dict[str, Any] = {}
        all_categories = sorted(list(set(r["category"] for r in self.records)))
        for cat in all_categories:
            cat_preds = [p for p in predictions_list if p["category"] == cat]
            cat_correct = sum(1 for p in cat_preds if p["is_correct"])
            cat_acc = float(round(cat_correct / len(cat_preds), 4)) if cat_preds else 0.0
            category_metrics[cat] = {
                "sample_size": len(cat_preds),
                "correct": cat_correct,
                "exact_accuracy": cat_acc,
            }

        # Multi-Issue Slices
        single_preds = [p for p in predictions_list if len(p["expected_departments"]) == 1]
        dual_preds = [p for p in predictions_list if len(p["expected_departments"]) == 2]
        triple_preds = [p for p in predictions_list if len(p["expected_departments"]) >= 3]
        oos_preds = [p for p in predictions_list if len(p["expected_departments"]) == 0]

        single_acc = float(round(sum(1 for p in single_preds if p["is_correct"]) / len(single_preds), 4)) if single_preds else 0.0
        dual_acc = float(round(sum(1 for p in dual_preds if p["is_correct"]) / len(dual_preds), 4)) if dual_preds else 0.0
        triple_acc = float(round(sum(1 for p in triple_preds if p["is_correct"]) / len(triple_preds), 4)) if triple_preds else 0.0
        oos_acc = float(round(sum(1 for p in oos_preds if p["is_correct"]) / len(oos_preds), 4)) if oos_preds else 0.0

        # Length Bracket Slices
        bracket_metrics: Dict[str, Any] = {}
        for brk in ["5-35", "36-80", "81-125", "126-165", "166-200"]:
            b_preds = [p for p in predictions_list if p["bracket"] == brk]
            b_correct = sum(1 for p in b_preds if p["is_correct"])
            b_acc = float(round(b_correct / len(b_preds), 4)) if b_preds else 0.0
            bracket_metrics[brk] = {
                "sample_size": len(b_preds),
                "correct": b_correct,
                "exact_accuracy": b_acc,
            }

        summary = {
            "model_id": model_id,
            "pipeline_mode": mode,
            "joblib_path": joblib_path,
            "sample_size": len(self.records),
            "exact_set_accuracy": exact_acc,
            "exact_set_ci_95": [ci_low, ci_high],
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "macro_f1": macro_f1,
            "micro_f1": micro_f1,
            "false_extra_department_rate": false_extra_rate,
            "missed_department_rate": missed_rate,
            "multi_issue_accuracy": {
                "single_issue": {"sample_size": len(single_preds), "exact_accuracy": single_acc},
                "dual_issue": {"sample_size": len(dual_preds), "exact_accuracy": dual_acc},
                "triple_issue": {"sample_size": len(triple_preds), "exact_accuracy": triple_acc},
                "out_of_scope_protection": {"sample_size": len(oos_preds), "exact_accuracy": oos_acc},
            },
            "category_slices": category_metrics,
            "length_bracket_slices": bracket_metrics,
            "department_metrics": per_dept,
            "latency": {
                "mean_ms": mean_latency_ms,
                "p95_ms": p95_latency_ms,
            },
        }

        # Save predictions and failures JSONL
        pred_file = self.out_dir / f"predictions_{model_id}.jsonl"
        with open(pred_file, "w", encoding="utf-8") as f:
            for p in predictions_list:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")

        fail_file = self.out_dir / f"failure_cases_{model_id}.jsonl"
        with open(fail_file, "w", encoding="utf-8") as f:
            for p in failure_cases:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")

        print(f"[RESULTS FOR {model_id} ({mode})]", flush=True)
        print(f"  Exact Set Accuracy: {exact_acc * 100:.2f}% (CI 95%: [{ci_low * 100:.1f}%, {ci_high * 100:.1f}%])", flush=True)
        print(f"  Correct: {correct_count} | Incorrect: {incorrect_count}", flush=True)
        print(f"  Macro F1: {macro_f1:.4f} | Micro F1: {micro_f1:.4f}", flush=True)
        print(f"  False-Extra Rate: {false_extra_rate * 100:.2f}% | Missed Rate: {missed_rate * 100:.2f}%", flush=True)
        print(f"  Single Issue: {single_acc * 100:.2f}% | Dual Issue: {dual_acc * 100:.2f}% | Triple Issue: {triple_acc * 100:.2f}%", flush=True)

        return summary


if __name__ == "__main__":
    evaluator = V1148Evaluator()

    runs_to_evaluate = [
        ("Active_Website_Model", "data/v11/curriculum_runs/run_004/champion_model.joblib", "relation_aware", None),
        ("Run_004", "data/v11/curriculum_runs/run_004/champion_model.joblib", "relation_aware", None),
        ("Run_005", "data/v11/curriculum_runs/run_005/champion_model.joblib", "relation_aware", None),
        ("Run_006", "data/v11/curriculum_runs/run_006/champion_model.joblib", "relation_aware", None),
        ("Run_004_ML_Civic", "data/v11/curriculum_runs/run_004/champion_model.joblib", "civic_ml", None),
        ("Run_005_ML_Civic", "data/v11/curriculum_runs/run_005/champion_model.joblib", "civic_ml", None),
        ("Run_006_ML_Civic", "data/v11/curriculum_runs/run_006/champion_model.joblib", "civic_ml", None),
    ]

    all_results = {}
    for mid, path, mode, thresh_override in runs_to_evaluate:
        res = evaluator.evaluate_model_bundle(mid, path, mode=mode, thresholds_override=thresh_override)
        all_results[mid] = res

    # Save consolidated evaluation summary
    summary_path = evaluator.out_dir / "evaluation_summary.json"
    summary_path.write_text(json.dumps(all_results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n[EVALUATION COMPLETE] Summary saved to: {summary_path}", flush=True)
