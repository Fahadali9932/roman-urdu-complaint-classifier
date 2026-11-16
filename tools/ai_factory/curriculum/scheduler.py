"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.3 Autonomous Curriculum Training Scheduler.

Executes bounded, auditable, isolated synthetic curriculum training:
- Group-isolated group partitioning (Train / Val / Test families separated before generation).
- Zero train-val-test leakage: family isolation, normalized deduplication, near-duplicate check.
- Bounded cycles (e.g. 5 cycles x 1,200 = 6,000 unique synthetic complaints).
- Curriculum difficulty progression from Level 1 to 5.
- Real local model inference harness using scikit-learn + CivicRelationResolver.
- Adaptive error-targeted generation: mines weak difficulty slices and steers future training.
- Checkpoints saved only when the validation promotion objective improves.
- Frozen test evaluation performed strictly ONCE at end-of-run.
- 33 historical developer fixtures audited as a regression check only.
- Strict isolation: zero live portal submissions, zero remote mutations, $0.00 spend.
"""
from __future__ import annotations

import dataclasses
import hashlib
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.preprocessing import MultiLabelBinarizer

from tools.ai_factory.curriculum.intent_graph import DEPARTMENTS
from tools.ai_factory.curriculum.realizer import (
    AutonomousCurriculumRealizer,
    normalize_text,
    SPLIT_FAMILIES,
)
from tools.ai_factory.evaluation import compute_metrics
from tools.ai_factory.training import (
    build_feature_extractor,
    CivicRelationResolver,
    export_model_artifact,
    tune_thresholds,
)
from tools.ai_factory.validators import get_char_shingles, has_pii, jaccard_similarity


def check_disk_space(target_path: Path, min_mb: int = 200) -> int:
    """Verify target drive has sufficient free disk space."""
    target = Path(target_path).resolve()
    while not target.exists():
        if target == target.parent:
            raise ValueError(f"Cannot resolve filesystem root for path: {target_path}")
        target = target.parent
    free_mb = int(shutil.disk_usage(target).free // (1024 * 1024))
    if free_mb < min_mb:
        raise RuntimeError(f"Insufficient disk space on {target.drive}: {free_mb} MB available, need >= {min_mb} MB.")
    return free_mb


def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    """Write records to JSONL file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def compute_sha256(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def assert_isolated(
    train: List[Dict[str, Any]],
    val: List[Dict[str, Any]],
    test: List[Dict[str, Any]],
) -> None:
    """Enforce strict scientific group isolation across all partitions."""
    # 1. Zero scenario-family overlap
    train_fams = set()
    for r in train:
        for f in r.get("scenario_family", "").split("+"):
            if f and f != "uncertain_review":
                train_fams.add(f)

    val_fams = set()
    for r in val:
        for f in r.get("scenario_family", "").split("+"):
            if f and f != "uncertain_review":
                val_fams.add(f)

    test_fams = set()
    for r in test:
        for f in r.get("scenario_family", "").split("+"):
            if f and f != "uncertain_review":
                test_fams.add(f)

    if train_fams & val_fams:
        raise AssertionError(f"LEAKAGE DETECTED: Train and Val share scenario families: {train_fams & val_fams}")
    if train_fams & test_fams:
        raise AssertionError(f"LEAKAGE DETECTED: Train and Test share scenario families: {train_fams & test_fams}")
    if val_fams & test_fams:
        raise AssertionError(f"LEAKAGE DETECTED: Val and Test share scenario families: {val_fams & test_fams}")

    # 2. Zero normalized text duplicates across partitions
    train_texts = {normalize_text(r["text_sanitized"]) for r in train}
    val_texts = {normalize_text(r["text_sanitized"]) for r in val}
    test_texts = {normalize_text(r["text_sanitized"]) for r in test}

    if train_texts & val_texts:
        raise AssertionError("LEAKAGE DETECTED: Exact text shared between Train and Val")
    if train_texts & test_texts:
        raise AssertionError("LEAKAGE DETECTED: Exact text shared between Train and Test")
    if val_texts & test_texts:
        raise AssertionError("LEAKAGE DETECTED: Exact text shared between Val and Test")

    # 3. Provenance and PII checks
    for split_name, partition in (("train", train), ("val", val), ("test", test)):
        for r in partition:
            if r.get("source_kind") != "synthetic_agent":
                raise AssertionError(f"Invalid provenance '{r.get('source_kind')}' in {split_name}")
            if has_pii(r["text_sanitized"]):
                raise AssertionError(f"PII detected in {split_name} record {r.get('record_id')}")


class CurriculumHarness:
    """Local inference, evaluation, and training harness."""

    def __init__(self, departments: Sequence[str] = DEPARTMENTS):
        self.departments = list(departments)
        self.mlb = MultiLabelBinarizer(classes=self.departments)
        self.mlb.fit([self.departments])

    def evaluate_model(
        self,
        feature_union: Any,
        model: Any,
        thresholds: Dict[str, float],
        records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Evaluate model + CivicRelationResolver on records."""
        texts = [r["text_sanitized"] for r in records]
        y_true = self.mlb.transform([r.get("department_labels", []) for r in records])

        X_vec = feature_union.transform(texts)
        raw_probs = model.predict_proba(X_vec)

        # Apply CivicRelationResolver
        resolved_probs = np.zeros_like(raw_probs)
        all_notes = []
        for i, text in enumerate(texts):
            init_p = {dept: float(raw_probs[i, j]) for j, dept in enumerate(self.departments)}
            res_p, notes = CivicRelationResolver.resolve(text, init_p)
            for j, dept in enumerate(self.departments):
                resolved_probs[i, j] = res_p.get(dept, init_p[dept])
            all_notes.append(notes)

        # Apply thresholds
        y_pred = np.zeros_like(resolved_probs, dtype=int)
        for j, dept in enumerate(self.departments):
            th = thresholds.get(dept, 0.50)
            y_pred[:, j] = (resolved_probs[:, j] >= th).astype(int)

        # Compute standard metrics
        metrics = compute_metrics(y_true, y_pred, resolved_probs, departments=self.departments)

        # Difficulty slice metrics
        difficulty_slices = {}
        for lvl in range(1, 6):
            indices = [idx for idx, r in enumerate(records) if r.get("difficulty") == lvl]
            if indices:
                sub_true = y_true[indices]
                sub_pred = y_pred[indices]
                sub_exact = float(np.mean(np.all(sub_true == sub_pred, axis=1)))
                has_false_extra = float(np.mean(np.any((sub_pred == 1) & (sub_true == 0), axis=1)))
                has_missed = float(np.mean(np.any((sub_pred == 0) & (sub_true == 1), axis=1)))
                difficulty_slices[str(lvl)] = {
                    "count": len(indices),
                    "exact_set_accuracy": round(sub_exact, 4),
                    "false_extra_rate": round(has_false_extra, 4),
                    "missed_rate": round(has_missed, 4),
                }

        # Relation slice metrics
        relation_slices = {}
        for rel_type in ("SINGLE", "SINGLE_INFORMAL", "CAUSES_CONTEXT_ONLY", "INDEPENDENT", "SAME_INCIDENT_DIFFERENT_REPAIRS", "MENTION_ONLY_NEGATED"):
            indices = []
            for idx, r in enumerate(records):
                edges = r.get("issue_graph", {}).get("edges", [])
                if any(e.get("relation_type") == rel_type for e in edges):
                    indices.append(idx)
            if indices:
                sub_true = y_true[indices]
                sub_pred = y_pred[indices]
                sub_exact = float(np.mean(np.all(sub_true == sub_pred, axis=1)))
                relation_slices[rel_type] = {
                    "count": len(indices),
                    "exact_set_accuracy": round(sub_exact, 4),
                }

        return {
            "overall": metrics,
            "difficulty_slices": difficulty_slices,
            "relation_slices": relation_slices,
            "resolved_probabilities": resolved_probs,
            "binary_predictions": y_pred,
        }

    def train_candidate(
        self,
        train_records: List[Dict[str, Any]],
        val_records: List[Dict[str, Any]],
        seed: int = 42,
    ) -> Tuple[Any, Any, Dict[str, float]]:
        """Fit feature extractor, train Logistic Regression, and tune thresholds on val."""
        train_texts = [r["text_sanitized"] for r in train_records]
        train_labels = self.mlb.transform([r.get("department_labels", []) for r in train_records])

        val_texts = [r["text_sanitized"] for r in val_records]
        val_labels = self.mlb.transform([r.get("department_labels", []) for r in val_records])

        # Dual-track TF-IDF FeatureUnion
        feature_union = build_feature_extractor()
        X_train_vec = feature_union.fit_transform(train_texts)

        # Balanced Logistic Regression classifier
        base_clf = LogisticRegression(
            class_weight="balanced",
            C=1.5,
            max_iter=1000,
            random_state=seed,
        )
        model = OneVsRestClassifier(base_clf)
        model.fit(X_train_vec, train_labels)

        # Tune per-department thresholds on frozen validation set
        thresholds = tune_thresholds(
            model,
            feature_union,
            val_texts,
            val_labels,
            departments=self.departments,
        )

        return feature_union, model, thresholds


def execute_curriculum_run(
    output_dir: Path,
    seed: int = 42,
    max_cycles: int = 5,
    per_cycle: int = 1200,
    eval_size: int = 250,
    patience: int = 2,
    target_ceiling: int = 24000,
) -> Dict[str, Any]:
    """Execute complete bounded curriculum training run."""
    start_time = time.time()
    out = Path(output_dir).resolve()
    free_mb = check_disk_space(out, min_mb=200)

    if not 1 <= max_cycles <= 8:
        raise ValueError(f"max_cycles must be between 1 and 8 (got {max_cycles})")
    if not 60 <= per_cycle <= 3000:
        raise ValueError(f"per_cycle must be between 60 and 3000 (got {per_cycle})")
    if max_cycles * per_cycle > target_ceiling:
        raise ValueError(f"Total planned samples ({max_cycles * per_cycle}) exceeds ceiling {target_ceiling}")

    out.mkdir(parents=True, exist_ok=True)
    realizer = AutonomousCurriculumRealizer(seed=seed)
    harness = CurriculumHarness()

    print(f"=== AWAAZ-E-AWAM — Phase V11.3 Autonomous Curriculum Training Factory ===")
    print(f"Output directory: {out} ({free_mb} MB free on volume)")
    print(f"Planned run: {max_cycles} cycles x {per_cycle} samples = {max_cycles * per_cycle} total target")
    print(f"Split pool families: Train={len(SPLIT_FAMILIES['train'])}, Val={len(SPLIT_FAMILIES['validation'])}, Test={len(SPLIT_FAMILIES['test'])}")

    # 1. Generate frozen validation and frozen synthetic test sets
    print("\n--- Step 1: Generating Frozen Validation and Synthetic Test Sets ---")
    val_records = realizer.generate_batch("validation", [1, 2, 3, 4, 5], eval_size)
    val_texts = {normalize_text(r["text_sanitized"]) for r in val_records}
    test_records = realizer.generate_batch("test", [1, 2, 3, 4, 5], eval_size, existing_texts=val_texts)
    test_texts = {normalize_text(r["text_sanitized"]) for r in test_records}

    val_path = out / "frozen_validation.jsonl"
    test_path = out / "frozen_test.jsonl"
    write_jsonl(val_path, val_records)
    write_jsonl(test_path, test_records)

    val_hash = compute_sha256(val_path)
    test_hash = compute_sha256(test_path)
    print(f"Frozen Validation: {len(val_records)} records (SHA-256: {val_hash[:16]}...)")
    print(f"Frozen Synthetic Test: {len(test_records)} records (SHA-256: {test_hash[:16]}...)")

    # 2. Bounded curriculum cycles
    cumulative_train: List[Dict[str, Any]] = []
    seen_train_texts: Set[str] = set(val_texts | test_texts)
    history: List[Dict[str, Any]] = []

    best_score = -float("inf")
    champion_cycle = -1
    champion_thresholds: Dict[str, float] = {}
    patience_counter = 0
    focus_level: Optional[int] = None

    for cycle in range(1, max_cycles + 1):
        print(f"\n=======================================================")
        print(f"=== CYCLE {cycle} / {max_cycles} ===")
        print(f"=======================================================")

        # Curriculum level distribution
        if cycle == 1:
            levels = [1, 2]
            cycle_desc = "Foundational baseline: Obvious (L1) and Natural Informal (L2)"
        elif cycle == 2:
            levels = [1, 2, 3, 3]
            cycle_desc = "Contextual consequence expansion: L1, L2, and L3 consequence"
        elif cycle == 3:
            levels = [1, 2, 3, 4, 4]
            cycle_desc = "Independent multi-department introduction: L1, L2, L3, and L4 pairs"
        elif cycle == 4:
            levels = [1, 2, 3, 4, 5, 5]
            cycle_desc = "Adversarial & counterfactual expansion: Full L1-L5 mix"
        else:
            # Cycle 5+: Error-targeted generation based on weakest validation slice
            levels = [1, 2, focus_level or 3, focus_level or 4]
            cycle_desc = f"Adaptive error-targeted generation focusing on Level {focus_level or 'adaptive'}"

        print(f"Cycle Focus: {cycle_desc}")

        # Generate new training batch from TRAIN families only
        new_batch = realizer.generate_batch(
            split="train",
            levels=levels,
            count=per_cycle,
            focus_level=focus_level if cycle >= 5 else None,
            existing_texts=seen_train_texts,
        )

        for r in new_batch:
            seen_train_texts.add(normalize_text(r["text_sanitized"]))

        # Check prior diagnostics against previous champion if one exists
        prior_diagnostics = None
        champion_model_file = out / "champion_model.joblib"
        if champion_model_file.exists():
            prev_art = joblib.load(champion_model_file)
            prev_eval = harness.evaluate_model(
                prev_art["feature_union"],
                prev_art["model"],
                prev_art["thresholds"],
                new_batch,
            )
            prior_diagnostics = {
                "exact_set_accuracy": prev_eval["overall"]["exact_set_match"],
                "false_extra_rate": prev_eval["overall"]["false_extra_department_rate"],
                "missed_rate": prev_eval["overall"]["missed_issue_rate"],
            }
            print(f"Previous Champion Performance on New Batch: Exact Match = {prior_diagnostics['exact_set_accuracy'] * 100:.2f}%, False Extra = {prior_diagnostics['false_extra_rate'] * 100:.2f}%")

        cumulative_train.extend(new_batch)
        print(f"New unique training rows: {len(new_batch)} | Cumulative training rows: {len(cumulative_train)}")

        # Enforce zero-leakage assertions
        assert_isolated(cumulative_train, val_records, test_records)

        # Write cycle batch
        batch_path = out / f"cycle_{cycle:02d}_new_train.jsonl"
        write_jsonl(batch_path, new_batch)

        # Train candidate on cumulative training corpus
        print(f"Fitting candidate model on {len(cumulative_train)} training records...")
        feat_union, cand_model, cand_thresh = harness.train_candidate(
            cumulative_train,
            val_records,
            seed=seed + cycle,
        )
        print(f"Tuned Validation Thresholds: {cand_thresh}")

        # Evaluate on frozen validation set
        val_eval = harness.evaluate_model(feat_union, cand_model, cand_thresh, val_records)
        overall = val_eval["overall"]
        diff_slices = val_eval["difficulty_slices"]
        rel_slices = val_eval["relation_slices"]

        print(f"Validation Exact-Set Accuracy: {overall['exact_set_match'] * 100:.2f}% (CI 95%: [{overall['exact_set_match_ci_95'][0]*100:.1f}%, {overall['exact_set_match_ci_95'][1]*100:.1f}%])")
        print(f"Validation Macro F1: {overall['macro_f1']:.4f} | Micro F1: {overall['micro_f1']:.4f}")
        print(f"False-Extra Rate: {overall['false_extra_department_rate'] * 100:.2f}% | Missed Rate: {overall['missed_issue_rate'] * 100:.2f}%")
        print("Difficulty Slices:")
        for lvl_str, sdata in sorted(diff_slices.items()):
            print(f"  Level {lvl_str} (N={sdata['count']}): Exact Match = {sdata['exact_set_accuracy']*100:.2f}%, False Extra = {sdata['false_extra_rate']*100:.2f}%, Missed = {sdata['missed_rate']*100:.2f}%")

        # Determine next focus level: choose difficulty level with lowest accuracy
        if diff_slices:
            focus_level = int(min(diff_slices.keys(), key=lambda k: diff_slices[k]["exact_set_accuracy"]))
            print(f"Next train-only adaptive focus level: Level {focus_level}")

        # Validation promotion objective:
        # Score = Exact Set Accuracy - 0.5 * False Extra Rate - 0.3 * Missed Rate
        promo_score = overall["exact_set_match"] - 0.5 * overall["false_extra_department_rate"] - 0.3 * overall["missed_issue_rate"]
        improved = promo_score > best_score

        if improved:
            best_score = promo_score
            champion_cycle = cycle
            champion_thresholds = cand_thresh
            patience_counter = 0

            # Save champion joblib
            champion_artifact = {
                "feature_union": feat_union,
                "model": cand_model,
                "thresholds": cand_thresh,
                "cycle": cycle,
                "seed": seed,
            }
            joblib.dump(champion_artifact, champion_model_file)

            # Export V11 JSON model artifact
            export_model_artifact(
                feat_union,
                cand_model,
                cand_thresh,
                out / "candidate_model.json",
                departments=harness.departments,
            )
            print(f"*** PROMOTED: Cycle {cycle} saved as new Champion! (Promotion Score: {promo_score:.4f}) ***")
        else:
            patience_counter += 1
            print(f"Patience: {patience_counter} / {patience} (Promotion score {promo_score:.4f} did not exceed best {best_score:.4f})")

        cycle_summary = {
            "cycle": cycle,
            "description": cycle_desc,
            "new_training_count": len(new_batch),
            "cumulative_training_count": len(cumulative_train),
            "validation_metrics": overall,
            "difficulty_slices": diff_slices,
            "relation_slices": rel_slices,
            "prior_champion_on_new_batch": prior_diagnostics,
            "promotion_score": round(promo_score, 4),
            "saved_as_champion": improved,
            "next_adaptive_focus_level": focus_level,
        }
        history.append(cycle_summary)

        manifest_file = out / f"cycle_{cycle:02d}_manifest.json"
        manifest_file.write_text(json.dumps(cycle_summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        if patience_counter >= patience:
            print(f"Early stopping triggered at cycle {cycle} due to validation plateau.")
            break

    # 3. Post-Run Evaluation of Final Champion
    print(f"\n=======================================================")
    print(f"=== FINAL EVALUATION OF CHAMPION (CYCLE {champion_cycle}) ===")
    print(f"=======================================================")

    best_art = joblib.load(out / "champion_model.joblib")
    feat_union = best_art["feature_union"]
    champ_model = best_art["model"]
    thresh = best_art["thresholds"]

    # Measure latency
    sample_texts = [r["text_sanitized"] for r in test_records[:50]]
    t0 = time.time()
    for txt in sample_texts:
        v = feat_union.transform([txt])
        raw_p = champ_model.predict_proba(v)[0]
        init_p = {d: float(raw_p[j]) for j, d in enumerate(harness.departments)}
        CivicRelationResolver.resolve(txt, init_p)
    latency_ms = (time.time() - t0) / len(sample_texts) * 1000.0

    # Evaluate frozen synthetic test ONCE
    test_eval = harness.evaluate_model(feat_union, champ_model, thresh, test_records)
    test_overall = test_eval["overall"]
    test_diff_slices = test_eval["difficulty_slices"]
    test_rel_slices = test_eval["relation_slices"]

    print(f"Frozen Synthetic Test Exact Set Accuracy: {test_overall['exact_set_match'] * 100:.2f}% (CI 95%: [{test_overall['exact_set_match_ci_95'][0]*100:.1f}%, {test_overall['exact_set_match_ci_95'][1]*100:.1f}%])")
    print(f"Frozen Synthetic Test Macro F1: {test_overall['macro_f1']:.4f} | Micro F1: {test_overall['micro_f1']:.4f}")
    print(f"False Extra Department Rate: {test_overall['false_extra_department_rate'] * 100:.2f}%")
    print(f"Missed Department Rate: {test_overall['missed_issue_rate'] * 100:.2f}%")
    print(f"Single-inference Latency: {latency_ms:.2f} ms")

    # Evaluate on the 33 historical developer-authored fixtures (as a regression check only)
    gold_path = Path("data/v11/human_gold/locked_gold.jsonl")
    legacy_fixture_metrics = None
    if gold_path.exists():
        gold_records = [json.loads(l) for l in gold_path.read_text(encoding="utf-8").splitlines() if l.strip()]
        gold_eval = harness.evaluate_model(feat_union, champ_model, thresh, gold_records)
        legacy_fixture_metrics = {
            "sample_size": len(gold_records),
            "exact_set_accuracy": gold_eval["overall"]["exact_set_match"],
            "macro_f1": gold_eval["overall"]["macro_f1"],
            "false_extra_department_rate": gold_eval["overall"]["false_extra_department_rate"],
            "missed_issue_rate": gold_eval["overall"]["missed_issue_rate"],
            "note": "Historical developer-authored unit test fixtures; NOT an independent human gold test.",
        }
        print(f"Legacy 33 Developer Fixtures Regression Check: Exact Set Accuracy = {legacy_fixture_metrics['exact_set_accuracy']*100:.2f}%, False Extra = {legacy_fixture_metrics['false_extra_department_rate']*100:.2f}%")

    total_duration_sec = round(time.time() - start_time, 2)

    # 4. Save Master Run Report
    run_report = {
        "title": "Awaaz-e-Awam Phase V11.3 Autonomous Curriculum Training Report",
        "scope": "SYNTHETIC_LAB_CURRICULUM_NOT_REAL_WORLD_HUMAN_CLAIM",
        "generator_seed": seed,
        "max_cycles": max_cycles,
        "actual_cycles_run": len(history),
        "champion_cycle": champion_cycle,
        "total_unique_synthetic_training_samples": len(cumulative_train),
        "frozen_validation_sample_size": len(val_records),
        "frozen_test_sample_size": len(test_records),
        "execution_duration_seconds": total_duration_sec,
        "per_sample_latency_ms": round(latency_ms, 2),
        "champion_thresholds": champion_thresholds,
        "frozen_synthetic_test_metrics": test_overall,
        "frozen_synthetic_test_difficulty_slices": test_diff_slices,
        "frozen_synthetic_test_relation_slices": test_rel_slices,
        "legacy_developer_fixtures_regression": legacy_fixture_metrics,
        "cycle_history": history,
        "split_hashes": {
            "frozen_validation_sha256": val_hash,
            "frozen_test_sha256": test_hash,
        },
        "governance_and_safety": {
            "deployment_authorized": False,
            "real_world_accuracy_verified": False,
            "external_human_test_pending": True,
            "financial_spend_usd": 0.00,
            "remote_supabase_mutations": 0,
            "live_portal_fake_complaints_submitted": 0,
        },
    }

    report_path = out / "run_report.json"
    report_path.write_text(json.dumps(run_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nRun report saved to: {report_path}")

    return run_report
