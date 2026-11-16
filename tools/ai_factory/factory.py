"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Hybrid AI Training Factory CLI.

Standard library + scikit-learn. No external API keys, no remote database mutations.
Commands:
  generate       Generate scenario-first synthetic dataset
  validate       Run schema, PII, contradiction, and duplicate gates
  split          Family-disjoint split into train/val/test_synthetic
  train          Train multi-model candidates (B0, B1-A, B1-B, B1-C) and export best
  evaluate       Run comprehensive civic evaluation with 95% bootstrap CIs
  review-export  Export blinded review queue for independent human labeling
  review-import  Ingest human-adjudicated labels into quarantined gold corpus
  active-learning Run bounded active learning cycles with stopping criteria
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import numpy as np

from tools.ai_factory.active_learning import BoundedActiveLearner
from tools.ai_factory.evaluation import evaluate_dataset
from tools.ai_factory.generator import generate_dataset
from tools.ai_factory.review import export_for_review, import_human_labels
from tools.ai_factory.training import (
    DEPARTMENTS,
    export_model_artifact,
    train_candidates,
    tune_thresholds,
)
from tools.ai_factory.validators import (
    check_family_leakage,
    validate_dataset,
)


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    path = Path(path)
    records = []
    for line_num, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.strip():
            records.append(json.loads(line))
    return records


def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def split_by_family(records: List[Dict[str, Any]], seed: int = 42) -> Dict[str, List[Dict[str, Any]]]:
    """Strictly family-disjoint split into train (70%), validation (15%), test_synthetic (15%)."""
    families: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in records:
        families[r["family_id"]].append(r)

    keys = sorted(families.keys())
    train_cut = max(1, int(len(keys) * 0.70))
    val_cut = max(train_cut + 1, int(len(keys) * 0.85))

    family_labels = {
        fam: {issue["department_key"] for row in rows for issue in row.get("issues", [])}
        for fam, rows in families.items()
    }
    all_labels = set(DEPARTMENTS)

    rng = random.Random(seed)
    best_keys = None
    best_score = float("inf")

    # Seek splits where all 6 departments are present in each split
    for _ in range(3500):
        attempt = list(keys)
        rng.shuffle(attempt)
        chunks = (attempt[:train_cut], attempt[train_cut:val_cut], attempt[val_cut:])
        missing = sum(len(all_labels - set().union(*(family_labels[k] for k in chunk))) for chunk in chunks)
        sizes = [sum(len(families[k]) for k in chunk) for chunk in chunks]
        total = max(len(records), 1)
        imbalance = sum(abs(s / total - target) for s, target in zip(sizes, (0.70, 0.15, 0.15)))
        score = missing * 1000 + imbalance
        if score < best_score:
            best_keys, best_score = attempt, score
            if missing == 0 and imbalance < 0.04:
                break

    keys = best_keys or keys
    splits = {"train": [], "validation": [], "test_synthetic": []}
    for i, fam in enumerate(keys):
        target = "train" if i < train_cut else "validation" if i < val_cut else "test_synthetic"
        splits[target].extend(families[fam])

    return splits


def get_summary(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    counts = Counter(issue["department_key"] for r in records for issue in r.get("issues", []))
    return {
        "total_records": len(records),
        "unique_families": len({r["family_id"] for r in records}),
        "departments": dict(sorted(counts.items())),
        "multi_issue_records": sum(len(r.get("issues", [])) > 1 for r in records),
        "needs_review_records": sum(not r.get("issues") or r.get("expected_route") == "review" for r in records),
        "human_gold_records": sum(r.get("is_gold", False) for r in records),
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Awaaz-e-Awam Phase V11 Hybrid AI Training Factory")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Command: generate
    p_gen = subparsers.add_parser("generate", help="Generate synthetic scenario dataset")
    p_gen.add_argument("--count", type=int, default=500)
    p_gen.add_argument("--seed", type=int, default=42)
    p_gen.add_argument("--out", type=Path, required=True)

    # Command: validate
    p_val = subparsers.add_parser("validate", help="Validate dataset against QA gates")
    p_val.add_argument("--input", type=Path, required=True)
    p_val.add_argument("--check-fuzzy", action="store_true")

    # Command: split
    p_spl = subparsers.add_parser("split", help="Family-disjoint train/val/test splitting")
    p_spl.add_argument("--input", type=Path, required=True)
    p_spl.add_argument("--out-dir", type=Path, required=True)
    p_spl.add_argument("--seed", type=int, default=42)

    # Command: train
    p_trn = subparsers.add_parser("train", help="Train candidates and export best")
    p_trn.add_argument("--train-data", type=Path, required=True)
    p_trn.add_argument("--val-data", type=Path, required=True)
    p_trn.add_argument("--out-dir", type=Path, default=Path("tools/ai_factory/registry"))
    p_trn.add_argument("--seed", type=int, default=42)

    # Command: evaluate
    p_eva = subparsers.add_parser("evaluate", help="Evaluate model on dataset")
    p_eva.add_argument("--train-data", type=Path, required=True)
    p_eva.add_argument("--test-data", type=Path, required=True)
    p_eva.add_argument("--gold-data", type=Path, default=None)
    p_eva.add_argument("--val-data", type=Path, default=None)
    p_eva.add_argument("--seed", type=int, default=42)
    p_eva.add_argument("--out-report", type=Path, default=None)

    # Command: review-export
    p_rx = subparsers.add_parser("review-export", help="Export review queue for human labeling")
    p_rx.add_argument("--input", type=Path, required=True)
    p_rx.add_argument("--out", type=Path, required=True)
    p_rx.add_argument("--limit", type=int, default=50)
    p_rx.add_argument("--filter-uncertain", action="store_true")

    # Command: review-import
    p_ri = subparsers.add_parser("review-import", help="Ingest reviewed labels into gold corpus")
    p_ri.add_argument("--input", type=Path, required=True)
    p_ri.add_argument("--gold-out", type=Path, required=True)

    # Command: active-learning
    p_al = subparsers.add_parser("active-learning", help="Run bounded active learning cycles")
    p_al.add_argument("--train-data", type=Path, required=True)
    p_al.add_argument("--val-data", type=Path, required=True)
    p_al.add_argument("--test-data", type=Path, required=True)
    p_al.add_argument("--gold-data", type=Path, default=None)
    p_al.add_argument("--max-cycles", type=int, default=3)
    p_al.add_argument("--synthetic-increment", type=int, default=300)
    p_al.add_argument("--seed", type=int, default=42)

    args = parser.parse_args(argv)

    if args.command == "generate":
        records = generate_dataset(count=args.count, seed=args.seed)
        errors = validate_dataset(records)
        if errors:
            print(f"ERROR: Generation validation failed with {len(errors)} errors:\n" + "\n".join(errors[:10]), file=sys.stderr)
            return 1
        write_jsonl(args.out, records)
        print(json.dumps({"status": "SUCCESS", "output_file": str(args.out), **get_summary(records)}, indent=2))
        return 0

    if args.command == "validate":
        records = read_jsonl(args.input)
        errors = validate_dataset(records, check_fuzzy=args.check_fuzzy)
        if errors:
            print(json.dumps({"valid": False, "total_errors": len(errors), "sample_errors": errors[:25]}, indent=2))
            return 1
        print(json.dumps({"valid": True, **get_summary(records)}, indent=2))
        return 0

    if args.command == "split":
        records = read_jsonl(args.input)
        splits = split_by_family(records, seed=args.seed)
        args.out_dir.mkdir(parents=True, exist_ok=True)
        for name, rows in splits.items():
            write_jsonl(args.out_dir / f"{name}.jsonl", rows)
        leakage = check_family_leakage(splits["train"], splits["validation"], splits["test_synthetic"])
        print(json.dumps({
            "status": "SUCCESS",
            "leakage_check": leakage,
            "splits": {name: get_summary(rows) for name, rows in splits.items()}
        }, indent=2))
        return 0

    if args.command == "train":
        train_records = read_jsonl(args.train_data)
        val_records = read_jsonl(args.val_data)

        train_texts = [r["text_sanitized"] for r in train_records]
        train_labels = np.zeros((len(train_records), len(DEPARTMENTS)), dtype=int)
        for i, r in enumerate(train_records):
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

        feat_union, candidates = train_candidates(train_texts, train_labels, seed=args.seed)

        # Tune thresholds on LinearSVC
        best_model = candidates["B1_B_LinearSVC"]
        thresholds = tune_thresholds(best_model, feat_union, val_texts, val_labels)

        # Export artifact
        art_info = export_model_artifact(
            feature_union=feat_union,
            model=best_model,
            thresholds=thresholds,
            out_path=args.out_dir / "candidate_model.json",
        )
        print(json.dumps({"status": "SUCCESS", "best_model": "B1_B_LinearSVC", "thresholds": thresholds, **art_info}, indent=2))
        return 0

    if args.command == "evaluate":
        train_records = read_jsonl(args.train_data)
        test_records = read_jsonl(args.test_data)
        val_records = read_jsonl(args.val_data) if args.val_data else []
        gold_records = read_jsonl(args.gold_data) if args.gold_data and Path(args.gold_data).exists() else []

        train_texts = [r["text_sanitized"] for r in train_records]
        train_labels = np.zeros((len(train_records), len(DEPARTMENTS)), dtype=int)
        for i, r in enumerate(train_records):
            for iss in r.get("issues", []):
                dkey = iss.get("department_key")
                if dkey in DEPARTMENTS:
                    train_labels[i, DEPARTMENTS.index(dkey)] = 1

        feat_union, candidates = train_candidates(train_texts, train_labels, seed=args.seed)

        # Evaluate all 4 candidates
        results = {}
        for cname, cmodel in candidates.items():
            fu = feat_union if cname != "B0_RuleBaseline" else None
            # Tune or use default thresholds
            if val_records:
                val_texts = [r["text_sanitized"] for r in val_records]
                val_labels = np.zeros((len(val_records), len(DEPARTMENTS)), dtype=int)
                for i, r in enumerate(val_records):
                    for iss in r.get("issues", []):
                        dkey = iss.get("department_key")
                        if dkey in DEPARTMENTS:
                            val_labels[i, DEPARTMENTS.index(dkey)] = 1
                thresholds = tune_thresholds(cmodel, fu, val_texts, val_labels)
            else:
                thresholds = {d: 0.50 for d in DEPARTMENTS}

            test_metrics = evaluate_dataset(cmodel, fu, test_records, thresholds)
            gold_metrics = evaluate_dataset(cmodel, fu, gold_records, thresholds) if gold_records else None

            results[cname] = {
                "thresholds": thresholds,
                "synthetic_test": test_metrics,
                "human_gold": gold_metrics,
            }

        out_json = json.dumps(results, indent=2)
        if args.out_report:
            Path(args.out_report).parent.mkdir(parents=True, exist_ok=True)
            Path(args.out_report).write_text(out_json, encoding="utf-8")
        print(out_json)
        return 0

    if args.command == "review-export":
        records = read_jsonl(args.input)
        exported = export_for_review(records, args.out, limit=args.limit, filter_uncertain_only=args.filter_uncertain)
        print(json.dumps({"status": "SUCCESS", "exported_count": exported, "out_file": str(args.out)}, indent=2))
        return 0

    if args.command == "review-import":
        count, errors = import_human_labels(args.input, args.gold_out)
        print(json.dumps({"status": "SUCCESS" if not errors else "PARTIAL_SUCCESS", "imported_gold_count": count, "errors": errors}, indent=2))
        return 0

    if args.command == "active-learning":
        train_records = read_jsonl(args.train_data)
        val_records = read_jsonl(args.val_data)
        test_records = read_jsonl(args.test_data)
        gold_records = read_jsonl(args.gold_data) if args.gold_data and Path(args.gold_data).exists() else None

        learner = BoundedActiveLearner(
            max_cycles=args.max_cycles,
            max_new_synthetic_per_cycle=args.synthetic_increment,
            registry_dir=Path("tools/ai_factory/registry"),
        )

        history = []
        curr_train = train_records
        for cycle in range(1, args.max_cycles + 1):
            print(f"--- Running Active Learning Cycle {cycle}/{args.max_cycles} ---")
            cycle_res = learner.run_cycle(
                cycle_idx=cycle,
                current_train=curr_train,
                val_records=val_records,
                test_records=test_records,
                human_gold_records=gold_records,
                synthetic_increment=args.synthetic_increment,
                seed=args.seed,
            )
            history.append(cycle_res["manifest"])
            curr_train = cycle_res["augmented_train"]

        summary_file = Path("tools/ai_factory/registry/active_learning_summary.json")
        summary_file.write_text(json.dumps(history, indent=2), encoding="utf-8")
        print(f"Active learning completed. Summary saved to {summary_file}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
