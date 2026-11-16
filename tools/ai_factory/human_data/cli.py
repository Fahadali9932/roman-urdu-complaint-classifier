"""Awaaz-e-Awam (آوازِ عوام) — Human Data Management CLI.

Provides commands for:
1. `init-template`: Generate blank annotation template packets for human annotators.
2. `validate`: Validate human-annotated complaint records against privacy, span, and relational gates.
3. `agreement`: Compute inter-annotator agreement metrics (Kappa, Jaccard, Exact Set Match).
4. `adjudicate`: Automated dual-annotator consensus merge and dispute packet generation.
5. `split`: Partition adjudicated human datasets into Train / Val / Untouched Test with SHA-256 manifests.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .agreement import adjudicate_annotations, compute_detailed_inter_annotator_agreement
from .schema import (
    HumanAnnotationMeta,
    HumanComplaintRecord,
    HumanContextAnnotation,
    HumanProvenanceAnnotation,
    validate_human_dataset,
)

SAMPLE_COLLECTION_TEMPLATES = [
    {
        "category": "road_damage_kmc",
        "locality": "Gulshan-e-Iqbal Block 13-D",
        "district": "District East",
        "hint": "Single issue: KMC road damage / sinkhole / pothole",
        "example_text": "Disco bakery ke samne main road par bohat bara khadda hai jis se bikes gir rahi hain",
    },
    {
        "category": "water_shortage_kwsc",
        "locality": "North Nazimabad Block H",
        "district": "District Central",
        "hint": "Single issue: KWSC water shortage / dry pipeline",
        "example_text": "Pichlay do haftay se peene ka pani nahi aya line bilkul sookhi pari hai tanker mafias loot rahe hain",
    },
    {
        "category": "power_outage_kelectric",
        "locality": "Korangi Industrial Area",
        "district": "District Korangi",
        "hint": "Single issue: K-Electric blackout / transformer trip",
        "example_text": "Subah se transformer blast hone ki wajah se poora mohalla andheray mein hai koi light nahi",
    },
    {
        "category": "gas_pressure_ssgc",
        "locality": "Saddar Preedy Street",
        "district": "District South",
        "hint": "Single issue: SSGC low gas pressure",
        "example_text": "Gas ka pressure intihai kam hai chulha nahi chal raha subah se nashta nahi ban saka",
    },
    {
        "category": "solid_waste_sswmb",
        "locality": "Liaquatabad Supermarket",
        "district": "District Central",
        "hint": "Single issue: SSWMB garbage dump / carcass",
        "example_text": "Main market ke samne kachray ka pahar bana hua hai sswmb wale teen din se kachra uthane nahi aye",
    },
    {
        "category": "building_structural_sbca",
        "locality": "Clifton Block 2",
        "district": "District South",
        "hint": "Single issue: SBCA illegal construction / building crack",
        "example_text": "Purani chaar manzila imarat ke pillars mein gehri daraarein aagayi hain kisi waqt bhi gir sakti hai",
    },
    {
        "category": "causal_power_motor",
        "locality": "Federal B Area Block 14",
        "district": "District Central",
        "hint": "Causal: Power outage stopping domestic pump (K-Electric only, KWSC suppressed)",
        "example_text": "Bijli band hone ki wajah se pani ki motor nahi chal saki voltage bilkul zero tha",
    },
    {
        "category": "dual_water_road",
        "locality": "Malir City",
        "district": "District Malir",
        "hint": "Dual Repair: Water main burst collapsed road (KWSC + KMC)",
        "example_text": "Pani ki sarkari trunk line phatne se sarak dhans gayi hai aur bara gadda ban gaya hai",
    },
    {
        "category": "independent_pair",
        "locality": "SITE Area Metroville",
        "district": "District West",
        "hint": "Independent: Garbage dump + broken streetlights (SSWMB + KMC)",
        "example_text": "Sarak par kachra phel raha hai aur sath hi street lights bhi do hafton se band hain",
    },
    {
        "category": "explicit_negation",
        "locality": "Orangi Town Sector 11-L",
        "district": "District West",
        "hint": "Negation: Road is fine, but sewer is overflowing (KWSC only, KMC negated)",
        "example_text": "Sarak bilkul theek hai koi khadda nahi magar gutter ubal kar gali mein ganda pani beh raha hai",
    },
]


def generate_annotation_templates(out_path: Path, count: int = 50) -> int:
    """Generate blank structured annotation templates for citizen data collection teams."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for i in range(count):
        sample = SAMPLE_COLLECTION_TEMPLATES[i % len(SAMPLE_COLLECTION_TEMPLATES)]
        rec_id = f"human_sub_{i+1:04d}"
        template_row = {
            "record_id": rec_id,
            "complaint_text": sample["example_text"] if i < len(SAMPLE_COLLECTION_TEMPLATES) else "",
            "issues": [
                {
                    "issue_id": f"{rec_id}_iss1",
                    "department_key": sample["category"].split("_")[-1] if "_" in sample["category"] else "kmc",
                    "issue_type": sample["category"],
                    "span_text": "",
                    "start_char": 0,
                    "end_char": 0,
                    "severity": "medium",
                }
            ] if i < len(SAMPLE_COLLECTION_TEMPLATES) else [],
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
                "provenance_id": f"prov_{rec_id}",
                "source_channel": "direct_citizen_interview",
                "consent_confirmed": True,
                "collected_at": now_iso,
                "locality": sample["locality"],
                "district": sample["district"],
                "pii_scrubbed": True,
                "source_kind": "human_authored",
            },
            "annotation_meta": {
                "annotator_id": "annotator_pending",
                "annotated_at": now_iso,
                "adjudication_status": "SINGLE_ANNOTATED",
                "adjudicated_by": None,
                "adjudicated_at": None,
                "notes": f"Guidance: {sample['hint']}",
            },
            "needs_review": False,
            "review_reason": None,
            "review_explanation": None,
            "language_profile": "roman_urdu",
        }
        rows.append(template_row)

    with out_path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    return len(rows)


def split_human_dataset(
    input_path: Path,
    out_dir: Path,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> Dict[str, Any]:
    """Partition human-annotated complaints into Train (70%), Val (15%), and Untouched Test (15%)."""
    input_path = Path(input_path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    records = []
    for line in input_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            records.append(json.loads(line))

    # Validate before splitting
    val_res = validate_human_dataset(records)
    if not val_res["valid"]:
        raise ValueError(f"Cannot split invalid dataset ({val_res['error_count']} errors):\n" + "\n".join(val_res["errors"][:5]))

    rng = random.Random(seed)
    shuffled = list(records)
    rng.shuffle(shuffled)

    n = len(shuffled)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_data = shuffled[:train_end]
    val_data = shuffled[train_end:val_end]
    test_data = shuffled[val_end:]

    paths = {
        "train": out_dir / "human_train.jsonl",
        "validation": out_dir / "human_validation.jsonl",
        "test": out_dir / "human_test_untouched.jsonl",
    }

    manifest: Dict[str, Any] = {
        "dataset_kind": "genuine_human_authored",
        "split_timestamp": datetime.now(timezone.utc).isoformat(),
        "random_seed": seed,
        "total_records": n,
        "partitions": {},
    }

    for split_name, split_records in [("train", train_data), ("validation", val_data), ("test", test_data)]:
        p = paths[split_name]
        with p.open("w", encoding="utf-8") as f:
            for r in split_records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        manifest["partitions"][split_name] = {
            "path": str(p),
            "record_count": len(split_records),
            "percentage": float(round(len(split_records) / max(n, 1) * 100, 2)),
            "sha256": sha,
        }

    manifest_path = out_dir / "human_split_manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Awaaz-e-Awam Human Data & Annotation CLI")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Subcommand: init-template
    p_init = subparsers.add_parser("init-template", help="Generate blank annotation templates")
    p_init.add_argument("--out", type=Path, required=True, help="Output JSONL template file")
    p_init.add_argument("--count", type=int, default=50, help="Number of template rows")

    # Subcommand: validate
    p_val = subparsers.add_parser("validate", help="Validate human-annotated complaint records")
    p_val.add_argument("--input", type=Path, required=True, help="Input JSONL file")

    # Subcommand: agreement
    p_agr = subparsers.add_parser("agreement", help="Compute inter-annotator agreement metrics")
    p_agr.add_argument("--annotator1", type=Path, required=True, help="Annotator 1 JSONL file")
    p_agr.add_argument("--annotator2", type=Path, required=True, help="Annotator 2 JSONL file")

    # Subcommand: adjudicate
    p_adj = subparsers.add_parser("adjudicate", help="Merge dual-annotator consensus and export disputed queue")
    p_adj.add_argument("--annotator1", type=Path, required=True, help="Annotator 1 JSONL file")
    p_adj.add_argument("--annotator2", type=Path, required=True, help="Annotator 2 JSONL file")
    p_adj.add_argument("--out-consensus", type=Path, required=True, help="Output consensus gold JSONL file")
    p_adj.add_argument("--out-disputed", type=Path, required=True, help="Output disputed queue JSONL file")
    p_adj.add_argument("--adjudicator", type=str, default="senior_adjudicator")

    # Subcommand: split
    p_spl = subparsers.add_parser("split", help="Partition adjudicated human dataset")
    p_spl.add_argument("--input", type=Path, required=True, help="Adjudicated human gold JSONL file")
    p_spl.add_argument("--out-dir", type=Path, required=True, help="Output partition directory")
    p_spl.add_argument("--seed", type=int, default=42)

    args = parser.parse_args(argv)

    if args.subcommand == "init-template":
        n = generate_annotation_templates(args.out, count=args.count)
        print(json.dumps({"status": "SUCCESS", "records_generated": n, "output_path": str(args.out)}, indent=2))
        return 0

    if args.subcommand == "validate":
        records = [json.loads(l) for l in args.input.read_text(encoding="utf-8").splitlines() if l.strip()]
        res = validate_human_dataset(records)
        print(json.dumps(res, indent=2))
        return 0 if res["valid"] else 1

    if args.subcommand == "agreement":
        res = compute_detailed_inter_annotator_agreement(args.annotator1, args.annotator2)
        print(json.dumps(res, indent=2))
        return 0

    if args.subcommand == "adjudicate":
        res = adjudicate_annotations(
            args.annotator1,
            args.annotator2,
            args.out_consensus,
            args.out_disputed,
            adjudicator_id=args.adjudicator,
        )
        print(json.dumps(res, indent=2))
        return 0

    if args.subcommand == "split":
        manifest = split_human_dataset(args.input, args.out_dir, seed=args.seed)
        print(json.dumps(manifest, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
