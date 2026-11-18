"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.4.5 Stress-Test Execution Pipeline.

Executes end-to-end generation, anti-contamination validation, and model evaluation.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

# Ensure repository root is in sys.path
REPO_ROOT = Path.cwd()
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.ai_factory.stress_test.generator import AdversarialStressGenerator
from tools.ai_factory.stress_test.evaluator import AdversarialStressEvaluator


def main() -> None:
    print("=" * 70)
    print("=== AWAAZ-E-AWAM — PHASE V11.4.5 ADVERSARIAL STRESS TEST ===")
    print("=" * 70)

    # Step 1: Generate Benchmark
    print("\n--- Step 1: Generating 2,000+ Adversarial Roman Urdu Complaints ---")
    gen = AdversarialStressGenerator(seed=42)
    records = gen.generate_benchmark()
    print(f"Generated {len(records)} unique adversarial complaints.")

    # Step 2: Anti-contamination check
    print("\n--- Step 2: Executing Anti-Contamination Verification ---")
    prior_texts = set()
    prior_files = [
        "data/v11/curriculum_runs/run_004/cycle_01_new_train.jsonl",
        "data/v11/curriculum_runs/run_004/cycle_02_new_train.jsonl",
        "data/v11/curriculum_runs/run_004/cycle_03_new_train.jsonl",
        "data/v11/curriculum_runs/run_004/frozen_validation.jsonl",
        "data/v11/curriculum_runs/run_004/frozen_test.jsonl",
        "data/v11/human_data/locked_gold.jsonl",
    ]
    for p in prior_files:
        path = Path(p)
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    d = json.loads(line)
                    txt = d.get("text_sanitized") or d.get("text") or ""
                    if txt:
                        prior_texts.add(re.sub(r"\s+", " ", txt.strip().lower()))

    print(f"Scanned {len(prior_texts)} unique historical training/validation/test complaints.")
    exact_leaks = 0
    for r in records:
        nt = re.sub(r"\s+", " ", r.text.strip().lower())
        if nt in prior_texts:
            exact_leaks += 1

    if exact_leaks > 0:
        print(f"CRITICAL ERROR: Found {exact_leaks} contaminated complaints in stress benchmark!")
        sys.exit(1)
    print("Contamination check PASSED: Exactly 0 leaks (0.00% contamination).")

    # Step 3: Run Evaluation
    print("\n--- Step 3: Evaluating Frozen V11.4.4 Candidate Model ---")
    evaluator = AdversarialStressEvaluator()
    metrics = evaluator.run_evaluation(records)

    print("\n" + "=" * 70)
    print("=== FINAL ADVERSARIAL STRESS TEST SUMMARY ===")
    print("=" * 70)
    print(f"Total Complaints Evaluated: {metrics['total_samples']}")
    print(f"Exact Department-Set Match: {metrics['exact_department_set_accuracy'] * 100:.2f}% (CI 95%: [{metrics['exact_set_accuracy_ci_95'][0]*100:.1f}%, {metrics['exact_set_accuracy_ci_95'][1]*100:.1f}%])")
    print(f"Macro F1 Score: {metrics['macro_f1']:.4f}")
    print(f"False-Extra Department Rate: {metrics['false_extra_department_rate'] * 100:.2f}%")
    print(f"Missed Department Rate: {metrics['missed_department_rate'] * 100:.2f}%")
    print(f"Mean Inference Latency: {metrics['mean_latency_ms']:.2f} ms / sample")
    print(f"Review Gate Accuracy: {metrics['review_gate_accuracy'] * 100:.2f}%")
    print(f"Out-of-Scope Review Recall: {metrics['out_of_scope_review_rate'] * 100:.2f}%")
    print(f"Silent Omission Rate in Compound Cases: {metrics['silent_omission_rate_in_compound'] * 100:.2f}%")
    print(f"Causal Consequence Accuracy: {metrics['causal_consequence_accuracy'] * 100:.2f}%")

    print("\n--- Performance by Length Tier ---")
    for t, m in metrics["length_tier_metrics"].items():
        print(f"  {t} (N={m['count']}): Exact Match = {m['exact_accuracy']*100:.2f}%, False Extra = {m['false_extra_rate']*100:.2f}%, Missed = {m['missed_rate']*100:.2f}%")

    print("\n--- Behavioral Slices ---")
    for s_name, s_m in metrics["behavioral_slices"].items():
        print(f"  {s_name} (N={s_m['count']}): Exact Match = {s_m['exact_accuracy']*100:.2f}%, False Extra = {s_m['false_extra_rate']*100:.2f}%, Missed = {s_m['missed_rate']*100:.2f}%")

    print("\n--- Department Metrics ---")
    for d, dm in metrics["department_metrics"].items():
        print(f"  {d.upper()} (N={dm['support']}): Precision = {dm['precision']:.4f}, Recall = {dm['recall']:.4f}, F1 = {dm['f1']:.4f}")

    print("\n--- Top Categories ---")
    for c, cm in metrics["category_metrics"].items():
        print(f"  {c} (N={cm['count']}): Exact = {cm['exact_accuracy']*100:.2f}%, Missed = {cm['missed_rate']*100:.2f}%, False Extra = {cm['false_extra_rate']*100:.2f}%")


if __name__ == "__main__":
    main()
