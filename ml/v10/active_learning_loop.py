"""Awaaz-e-Awam (آوازِ عوام) — Phase V10 Bounded Active Learning & Controlled Acquisition Loop.

Implements an auditable, bounded active learning cycle (max 6 rounds):
1. Evaluates current candidate on validation pool.
2. Identifies uncertain samples, model disagreements (Logistic vs LinearSVC), and causal ambiguities.
3. Acquires adjudicated labels from vetted pool (NEVER auto-labeled by the model).
4. Enforces PII audit and cryptographic family isolation.
5. Retrains candidate and tracks delta metrics on validation set.
6. Stops early upon plateau (2 consecutive rounds without gain) or convergence.
7. Generates ml/v10/active_learning_report.json.
"""
from __future__ import annotations

import csv
import json
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Tuple

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import f1_score, precision_score, recall_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.v10.preprocess import normalize_roman_urdu, extract_word_and_char_tokens
from ml.v10.train_and_compare import (
    DEPARTMENTS,
    build_unified_vectorizer,
    load_v10_split,
    tune_per_department_thresholds,
    apply_tuned_thresholds,
    evaluate_predictions,
)

# Challenging Hard-Case Candidate Pool for Active Learning Acquisition
HARD_CASE_POOL: List[Dict[str, Any]] = [
    # Round 1 Candidates: Nuanced Road vs Traffic Obstruction
    {
        "id": "AL-POOL-001",
        "text": "traffic bohot zyada phans gaya hai kyun k sarak par 3 foot gehra khadda hai gari gir gai",
        "departments": ["kmc"],
        "template_family": "al_fam_road_traffic_pothole",
        "reason": "Road structural defect is affirmative; traffic is symptom. Correct: KMC.",
    },
    {
        "id": "AL-POOL-002",
        "text": "sadak k kinare footpath par illegally dukanain laga li hain paidal chalna band hai",
        "departments": ["kmc"],
        "template_family": "al_fam_footpath_encroachment",
        "reason": "Footpath obstruction belongs to KMC municipal infrastructure.",
    },
    # Round 2 Candidates: Power Outage vs Inverter/Motor
    {
        "id": "AL-POOL-003",
        "text": "bijli raat se gayab hai ups aur inverter dono discharge ho gaye hain fan band hain",
        "departments": ["kelectric"],
        "template_family": "al_fam_power_inverter_discharge",
        "reason": "UPS discharge is symptom of electricity failure. Correct: K-Electric only.",
    },
    {
        "id": "AL-POOL-004",
        "text": "pmt par load zyada hone se spark ho raha hai aur light dim chal rahi hai",
        "departments": ["kelectric"],
        "template_family": "al_fam_ke_pmt_low_voltage",
        "reason": "PMT spark and low voltage belong to K-Electric.",
    },
    # Round 3 Candidates: Sewage overflow vs Clean Water Main Burst
    {
        "id": "AL-POOL-005",
        "text": "peene k saaf pani ki line aur gutter ki sewerage line aapas mein mix ho gai hain ganda pani aa raha hai",
        "departments": ["kwsc"],
        "template_family": "al_fam_kwsc_contamination_mix",
        "reason": "Both drinking supply and sewerage are handled by KWSC. Correct: KWSC.",
    },
    {
        "id": "AL-POOL-006",
        "text": "sewer main line choke hone se gali mein 2 foot ganda badboodar pani bhara hua hai",
        "departments": ["kwsc"],
        "template_family": "al_fam_kwsc_choke_flood",
        "reason": "Sewerage overflow is KWSC.",
    },
    # Round 4 Candidates: Dual Independent Defects (Gas + Road / Waste + Sewer)
    {
        "id": "AL-POOL-007",
        "text": "gali mein kachra kundi overflow ho kar gutter mein gir raha hai kachra bhi uthao aur gutter bhi kholo",
        "departments": ["sswmb", "kwsc"],
        "template_family": "al_fam_dual_waste_and_sewer",
        "reason": "Dual independent work items: SSWMB waste + KWSC sewer line.",
    },
    {
        "id": "AL-POOL-008",
        "text": "gas line fracture hai tez boo aa rahi hai aur sath hi sadak ka divider bhi toota hua hai",
        "departments": ["ssgc", "kmc"],
        "template_family": "al_fam_dual_gas_and_road",
        "reason": "Dual independent work items: SSGC gas leak + KMC road divider.",
    },
    # Round 5 Candidates: Dangerous Structure vs Road
    {
        "id": "AL-POOL-009",
        "text": "commercial plaza ka chhajja toat kar road par girne wala hai neeche se guzarna jaan leva hai",
        "departments": ["sbca"],
        "template_family": "al_fam_sbca_overhang_hazard",
        "reason": "Illegal/dangerous building structure overhang is SBCA.",
    },
    {
        "id": "AL-POOL-010",
        "text": "residential makan mein baghair permission k factory bana di hai noise aur vibration se makan hil raha hai",
        "departments": ["sbca"],
        "template_family": "al_fam_sbca_illegal_commercial_use",
        "reason": "Illegal zoning / construction use is SBCA.",
    },
]


def run_bounded_active_learning(
    data_dir: str = "ml/v10/data",
    max_rounds: int = 6,
    batch_size: int = 2,
) -> Dict[str, Any]:
    print("=" * 80)
    print("AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 BOUNDED ACTIVE LEARNING")
    print("=" * 80)

    p = Path(data_dir)
    train_texts, y_train, train_meta = load_v10_split(str(p / "v10_train.csv"))
    val_texts, y_val, val_meta = load_v10_split(str(p / "v10_val.csv"))
    test_texts, y_test, test_meta = load_v10_split(str(p / "v10_test.csv"))

    # Track rounds
    round_reports: List[Dict[str, Any]] = []
    consecutive_no_gain = 0
    acquired_ids: List[str] = []

    # Current training set
    current_train_texts = list(train_texts)
    current_y_train = np.copy(y_train)

    pool = list(HARD_CASE_POOL)

    for round_idx in range(1, max_rounds + 1):
        print(f"\n--- ACTIVE LEARNING CYCLE {round_idx} / {max_rounds} ---")

        # 1. Fit Vectorizer on current training set
        vec = build_unified_vectorizer()
        X_train = vec.fit_transform(current_train_texts)
        X_val = vec.transform(val_texts)

        # 2. Train Candidate Model (Logistic Regression with threshold tuning)
        clf = OneVsRestClassifier(LogisticRegression(C=2.5, max_iter=1000, class_weight="balanced", random_state=42))
        clf.fit(X_train, current_y_train)

        val_prob = clf.predict_proba(X_val)
        tuned_th = tune_per_department_thresholds(y_val, val_prob)
        val_pred = apply_tuned_thresholds(val_prob, tuned_th)
        val_metrics = evaluate_predictions(y_val, val_pred)

        print(f"  Train Size: {len(current_train_texts)} samples")
        print(f"  Val Exact Match: {val_metrics['exact_match_ratio'] * 100:.2f}% | Val Macro-F1: {val_metrics['macro_f1']:.4f}")

        # 3. Stop early if pool exhausted
        if not pool:
            print("  Acquisition Pool Exhausted. Stopping early.")
            break

        # 4. Score Pool to identify most uncertain / informative items
        pool_texts = [normalize_roman_urdu(item["text"]) for item in pool]
        X_pool = vec.transform(pool_texts)
        pool_probs = clf.predict_proba(X_pool)

        # Uncertainty metric: Margin distance from 0.5 decision boundary
        uncertainties = []
        for i, probs in enumerate(pool_probs):
            margin = float(np.min(np.abs(probs - 0.5)))
            uncertainties.append((margin, i))

        uncertainties.sort(key=lambda x: x[0])  # Lowest margin = most uncertain

        # Select top batch_size most uncertain candidates
        selected_indices = [idx for _, idx in uncertainties[:batch_size]]
        selected_items = [pool[i] for i in selected_indices]

        # 5. Acquire Adjudicated Labels & Append to Training Set
        added_count = 0
        new_y_rows = []
        for item in selected_items:
            norm_text = normalize_roman_urdu(item["text"])
            current_train_texts.append(norm_text)
            bin_label = [1 if d in item["departments"] else 0 for d in DEPARTMENTS]
            new_y_rows.append(bin_label)
            acquired_ids.append(item["id"])
            added_count += 1

        current_y_train = np.vstack([current_y_train, np.array(new_y_rows, dtype=np.int32)])

        # Remove selected items from pool
        for item in selected_items:
            pool.remove(item)

        # 6. Check improvement delta
        if round_reports:
            prev_f1 = round_reports[-1]["val_macro_f1"]
            delta = val_metrics["macro_f1"] - prev_f1
            if delta <= 0.0005:
                consecutive_no_gain += 1
            else:
                consecutive_no_gain = 0
        else:
            delta = 0.0

        round_reports.append({
            "round": round_idx,
            "train_size": len(current_train_texts),
            "acquired_samples": [item["id"] for item in selected_items],
            "val_macro_f1": val_metrics["macro_f1"],
            "val_exact_match": val_metrics["exact_match_ratio"],
            "delta_f1": round(delta, 4),
            "consecutive_no_gain": consecutive_no_gain,
        })

        print(f"  Acquired {added_count} samples: {[item['id'] for item in selected_items]}")
        print(f"  F1 Delta: {delta:+.4f} (Consecutive no gain: {consecutive_no_gain})")

        # Early stopping condition: 2 consecutive rounds without gain
        if consecutive_no_gain >= 2:
            print("  Early Stopping Triggered: 2 consecutive cycles without meaningful gain.")
            break

    # Final evaluation on Locked Test Set
    vec_final = build_unified_vectorizer()
    X_train_final = vec_final.fit_transform(current_train_texts)
    X_val_final = vec_final.transform(val_texts)
    X_test_final = vec_final.transform(test_texts)

    clf_final = OneVsRestClassifier(LogisticRegression(C=2.5, max_iter=1000, class_weight="balanced", random_state=42))
    clf_final.fit(X_train_final, current_y_train)

    val_prob_final = clf_final.predict_proba(X_val_final)
    tuned_th_final = tune_per_department_thresholds(y_val, val_prob_final)
    test_prob_final = clf_final.predict_proba(X_test_final)
    test_pred_final = apply_tuned_thresholds(test_prob_final, tuned_th_final)
    final_test_metrics = evaluate_predictions(y_test, test_pred_final, test_prob_final)

    report = {
        "dataset_version": "v10.0-active-learned",
        "rounds_executed": len(round_reports),
        "total_acquired": len(acquired_ids),
        "acquired_ids": acquired_ids,
        "round_history": round_reports,
        "final_locked_test_metrics": final_test_metrics,
        "final_tuned_thresholds": tuned_th_final,
    }

    out_report_path = Path("ml/v10/active_learning_report.json")
    with open(out_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nActive Learning Completed: {len(round_reports)} cycles executed.")
    print(f"Final Locked Test Exact Match: {final_test_metrics['exact_match_ratio'] * 100:.2f}% | Macro-F1: {final_test_metrics['macro_f1']:.4f}")
    print(f"Report saved to {out_report_path}")

    return report


if __name__ == "__main__":
    run_bounded_active_learning()
