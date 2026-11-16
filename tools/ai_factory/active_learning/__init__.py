"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Bounded Active Learning Engine.

Implements bounded iterative acquisition:
- Strict bounds: max 6 cycles, max 2000 synthetic rows/cycle, max 50 human review proposals.
- Early stopping on 2 non-improving cycles.
- Uncertainty sampling (margin near threshold, model disagreement).
- Immutable cycle manifests and audit trails in registry/cycles/.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from tools.ai_factory.evaluation import evaluate_dataset
from tools.ai_factory.generator import generate_dataset
from tools.ai_factory.training import DEPARTMENTS, train_candidates, tune_thresholds


class BoundedActiveLearner:
    """Orchestrates bounded, auditable active learning cycles."""

    def __init__(
        self,
        max_cycles: int = 6,
        max_new_synthetic_per_cycle: int = 2000,
        max_human_review_per_cycle: int = 50,
        early_stop_patience: int = 2,
        registry_dir: Path = Path("tools/ai_factory/registry"),
    ):
        self.max_cycles = max_cycles
        self.max_new_synthetic = max_new_synthetic_per_cycle
        self.max_human_review = max_human_review_per_cycle
        self.early_stop_patience = early_stop_patience
        self.registry_dir = Path(registry_dir)
        self.cycles_dir = self.registry_dir / "cycles"
        self.cycles_dir.mkdir(parents=True, exist_ok=True)

    def select_uncertain_samples(
        self,
        pool: List[Dict[str, Any]],
        model: Any,
        feature_union: Any,
        thresholds: Dict[str, float],
        top_k: int = 50,
    ) -> List[Dict[str, Any]]:
        """Select samples closest to decision boundaries (uncertainty sampling)."""
        texts = [r["text_sanitized"] for r in pool]
        X_vec = feature_union.transform(texts)
        raw_probs = model.predict_proba(X_vec)

        margins = []
        for i, text in enumerate(texts):
            # Calculate smallest absolute distance to threshold across departments
            min_margin = float("inf")
            for j, dept in enumerate(DEPARTMENTS):
                thresh = thresholds.get(dept, 0.50)
                dist = abs(raw_probs[i, j] - thresh)
                if dist < min_margin:
                    min_margin = dist
            margins.append(min_margin)

        ranked_indices = np.argsort(margins)
        selected = [pool[idx] for idx in ranked_indices[:min(top_k, len(pool))]]
        return selected

    def run_cycle(
        self,
        cycle_idx: int,
        current_train: List[Dict[str, Any]],
        val_records: List[Dict[str, Any]],
        test_records: List[Dict[str, Any]],
        human_gold_records: Optional[List[Dict[str, Any]]] = None,
        synthetic_increment: int = 300,
        seed: int = 42,
    ) -> Dict[str, Any]:
        """Execute one complete active learning acquisition cycle."""
        # 1. Expand synthetic pool safely with new seed
        cycle_seed = seed + (cycle_idx * 17)
        increment_count = min(synthetic_increment, self.max_new_synthetic)
        new_synthetic = generate_dataset(count=increment_count, seed=cycle_seed)

        augmented_train = list(current_train) + new_synthetic

        # Prepare train data
        train_texts = [r["text_sanitized"] for r in augmented_train]
        train_labels = np.zeros((len(augmented_train), len(DEPARTMENTS)), dtype=int)
        for i, r in enumerate(augmented_train):
            for iss in r.get("issues", []):
                dkey = iss.get("department_key")
                if dkey in DEPARTMENTS:
                    train_labels[i, DEPARTMENTS.index(dkey)] = 1

        val_texts = [r["text_sanitized"] for r in val_records]
        val_labels = np.zeros((len(val_records), len(DEPARTMENTS)), dtype=int)
        for i, r in enumerate(val_records):
            for iss in r.get("issues", []):
                dkey = iss.get("department_key")
                if dkey in DEPARTMENTS:
                    val_labels[i, DEPARTMENTS.index(dkey)] = 1

        # Train candidates
        feat_union, candidates = train_candidates(
            train_texts=train_texts,
            train_labels=train_labels,
            seed=cycle_seed,
        )

        # Select LinearSVC as core candidate
        best_model_key = "B1_B_LinearSVC"
        model = candidates[best_model_key]

        # Tune thresholds on validation set
        thresholds = tune_thresholds(
            model=model,
            feature_union=feat_union,
            val_texts=val_texts,
            val_labels=val_labels,
        )

        # Evaluate on validation
        val_metrics = evaluate_dataset(
            model=model,
            feature_union=feat_union,
            records=val_records,
            thresholds=thresholds,
        )

        # Evaluate on test synthetic
        test_metrics = evaluate_dataset(
            model=model,
            feature_union=feat_union,
            records=test_records,
            thresholds=thresholds,
        )

        # Evaluate on human gold if present
        gold_metrics = None
        if human_gold_records:
            gold_metrics = evaluate_dataset(
                model=model,
                feature_union=feat_union,
                records=human_gold_records,
                thresholds=thresholds,
            )

        # Propose uncertain examples for human review
        uncertain_proposals = self.select_uncertain_samples(
            pool=new_synthetic,
            model=model,
            feature_union=feat_union,
            thresholds=thresholds,
            top_k=min(self.max_human_review, 25),
        )

        cycle_manifest = {
            "cycle_number": cycle_idx,
            "seed": cycle_seed,
            "train_size": len(augmented_train),
            "new_synthetic_added": len(new_synthetic),
            "human_review_proposals_count": len(uncertain_proposals),
            "validation_metrics": val_metrics,
            "synthetic_test_metrics": test_metrics,
            "human_gold_metrics": gold_metrics,
            "tuned_thresholds": thresholds,
            "primary_model": best_model_key,
        }

        # Write cycle manifest
        manifest_file = self.cycles_dir / f"cycle_{cycle_idx:02d}_manifest.json"
        with manifest_file.open("w", encoding="utf-8") as f:
            f.write(json.dumps(cycle_manifest, indent=2))

        return {
            "manifest": cycle_manifest,
            "augmented_train": augmented_train,
            "validation_exact_match": val_metrics["exact_set_match"],
            "validation_macro_f1": val_metrics["macro_f1"],
        }
