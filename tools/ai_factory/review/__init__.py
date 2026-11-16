"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Human Review & Gold Corpus Governance.

Provides:
- Blinded review export where candidate suggestions are segregated from human inputs.
- Verified human label ingestion and validation.
- Quarantined human gold corpus management (never mixed into training pools).
- Inter-annotator agreement metrics and adjudication workflow.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

VALID_REVIEW_DECISIONS = {
    "CONFIRMED",
    "CORRECTED",
    "DISPUTED",
    "REJECTED",
    "AMBIGUOUS",
    "PENDING_INDEPENDENT_REVIEW",
}


def export_for_review(
    records: List[Dict[str, Any]],
    out_path: Path,
    limit: int = 100,
    filter_uncertain_only: bool = False,
) -> int:
    """Export records into a blinded review format suitable for independent human labeling."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    selected = []
    for r in records:
        if filter_uncertain_only:
            flags = r.get("context_flags", [])
            route = r.get("expected_route")
            if not (route == "review" or any("needs_review" in f or "uncertain" in f for f in flags)):
                continue
        selected.append(r)
        if len(selected) >= limit:
            break

    review_rows = []
    for r in selected:
        row = {
            "record_id": r["record_id"],
            "text_sanitized": r["text_sanitized"],
            "suggested_scenario_issues": r.get("issues", []),
            "suggested_relations": r.get("relations", []),
            "human_issue_labels": None,  # List of dicts: [{"issue_id": "h1", "issue_type": "...", "department_key": "..."}]
            "human_relations": None,     # List of dicts: [{"left": "h1", "right": "h2", "type": "..."}]
            "reviewer_id": None,
            "reviewed_at": None,
            "review_decision": "PENDING_INDEPENDENT_REVIEW",
            "annotation_policy_version": "v11-pilot-1",
            "notes": None,
        }
        review_rows.append(row)

    with out_path.open("w", encoding="utf-8") as f:
        for row in review_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return len(review_rows)


def import_human_labels(
    input_path: Path,
    gold_out_path: Path,
    require_reviewer_id: bool = True,
) -> Tuple[int, List[str]]:
    """Ingest completed human review records into a quarantined gold evaluation corpus."""
    input_path = Path(input_path)
    gold_out_path = Path(gold_out_path)
    gold_out_path.parent.mkdir(parents=True, exist_ok=True)

    errors = []
    gold_records = []

    lines = input_path.read_text(encoding="utf-8").splitlines()
    for line_num, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"Line {line_num}: JSON decode error: {exc}")
            continue

        decision = row.get("review_decision")
        if decision not in VALID_REVIEW_DECISIONS:
            errors.append(f"Line {line_num}: Invalid review_decision '{decision}'")
            continue

        if decision == "PENDING_INDEPENDENT_REVIEW":
            # Still pending, skip from gold corpus
            continue

        reviewer_id = row.get("reviewer_id")
        if require_reviewer_id and (not reviewer_id or not isinstance(reviewer_id, str) or not reviewer_id.strip()):
            errors.append(f"Line {line_num}: Completed review requires reviewer_id")
            continue

        if decision == "REJECTED":
            # Item deemed invalid/noise, do not add to gold evaluation
            continue

        # Determine final issues
        if decision == "CONFIRMED":
            final_issues = row.get("suggested_scenario_issues", [])
            final_relations = row.get("suggested_relations", [])
        elif decision == "CORRECTED":
            final_issues = row.get("human_issue_labels")
            final_relations = row.get("human_relations") or []
            if not isinstance(final_issues, list) or not final_issues:
                errors.append(f"Line {line_num}: Decision CORRECTED requires non-empty human_issue_labels")
                continue
        else:
            # DISPUTED or AMBIGUOUS
            continue

        # Form gold record
        gold_rec = {
            "record_id": f"gold_{row['record_id'].replace('syn_', '')}",
            "text_sanitized": row["text_sanitized"],
            "source_kind": "human_authored",
            "label_origin": "human_annotator",
            "review_status": "reviewed",
            "is_gold": True,
            "language": "roman_urdu",
            "scenario_id": "human_adjudicated",
            "family_id": f"gold_fam_{row['record_id'][:12]}",
            "reviewer_id": reviewer_id,
            "reviewed_at": row.get("reviewed_at") or datetime.now(timezone.utc).isoformat(),
            "review_decision": decision,
            "issues": final_issues,
            "relations": final_relations,
            "context_flags": ["human_verified_gold"],
            "expected_route": "review" if not final_issues else "candidate_auto_route",
            "notes": row.get("notes"),
        }
        gold_records.append(gold_rec)

    if gold_records:
        with gold_out_path.open("w", encoding="utf-8") as f:
            for rec in gold_records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return len(gold_records), errors


def compute_inter_annotator_agreement(
    file_1: Path,
    file_2: Path,
) -> Dict[str, Any]:
    """Compute agreement metrics between two independent review files on the same record set."""
    rows1 = {r["record_id"]: r for r in [json.loads(line) for line in Path(file_1).read_text(encoding="utf-8").splitlines() if line.strip()]}
    rows2 = {r["record_id"]: r for r in [json.loads(line) for line in Path(file_2).read_text(encoding="utf-8").splitlines() if line.strip()]}

    common_ids = sorted(set(rows1.keys()) & set(rows2.keys()))
    if not common_ids:
        return {"error": "No common record IDs found between review sets"}

    decision_agreements = 0
    issue_agreements = 0

    for rid in common_ids:
        r1, r2 = rows1[rid], rows2[rid]
        if r1.get("review_decision") == r2.get("review_decision"):
            decision_agreements += 1

        depts1 = {iss["department_key"] for iss in (r1.get("human_issue_labels") or r1.get("suggested_scenario_issues") or [])}
        depts2 = {iss["department_key"] for iss in (r2.get("human_issue_labels") or r2.get("suggested_scenario_issues") or [])}
        if depts1 == depts2:
            issue_agreements += 1

    total = len(common_ids)
    return {
        "common_sample_size": total,
        "decision_agreement_rate": decision_agreements / total,
        "department_set_agreement_rate": issue_agreements / total,
    }
