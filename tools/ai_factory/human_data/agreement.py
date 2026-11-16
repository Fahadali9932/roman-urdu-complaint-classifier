r"""Awaaz-e-Awam (آوازِ عوام) — Inter-Annotator Agreement & Adjudication Pipeline.

Calculates:
1. Exact department-set agreement rate.
2. Per-department Cohen's Kappa ($p_o, p_e, \kappa$).
3. Macro-averaged Cohen's Kappa across all 6 municipal authorities.
4. Mean Jaccard similarity over multi-label assignments.
5. Relational edge agreement rate.
6. Automated consensus adjudication with disputed packet export.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from tools.ai_factory.scenarios import DEPARTMENTS
from .schema import HumanComplaintRecord, validate_human_record


def calculate_cohen_kappa(y1: List[int], y2: List[int]) -> float:
    """Calculate Cohen's Kappa for binary presence/absence of a department."""
    if len(y1) != len(y2) or len(y1) == 0:
        return 0.0

    n = len(y1)
    # Contingency table:
    # a: 1, 1
    # b: 1, 0
    # c: 0, 1
    # d: 0, 0
    a = sum(1 for i in range(n) if y1[i] == 1 and y2[i] == 1)
    b = sum(1 for i in range(n) if y1[i] == 1 and y2[i] == 0)
    c = sum(1 for i in range(n) if y1[i] == 0 and y2[i] == 1)
    d = sum(1 for i in range(n) if y1[i] == 0 and y2[i] == 0)

    p_observed = (a + d) / n

    p_yes1 = (a + b) / n
    p_yes2 = (a + c) / n
    p_no1 = (c + d) / n
    p_no2 = (b + d) / n

    p_expected = (p_yes1 * p_yes2) + (p_no1 * p_no2)

    if p_expected >= 1.0 or (1.0 - p_expected) == 0:
        return 1.0 if p_observed == 1.0 else 0.0

    kappa = (p_observed - p_expected) / (1.0 - p_expected)
    return float(round(kappa, 4))


def compute_detailed_inter_annotator_agreement(
    file_1: Path,
    file_2: Path,
) -> Dict[str, Any]:
    """Compute exhaustive agreement metrics across two independent annotation passes."""
    file_1 = Path(file_1)
    file_2 = Path(file_2)

    records1: Dict[str, Dict[str, Any]] = {}
    for line in file_1.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            records1[row["record_id"]] = row

    records2: Dict[str, Dict[str, Any]] = {}
    for line in file_2.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            records2[row["record_id"]] = row

    common_ids = sorted(set(records1.keys()) & set(records2.keys()))
    if not common_ids:
        return {"error": "No overlapping record IDs found between annotation files", "sample_size": 0}

    n = len(common_ids)
    exact_set_agreements = 0
    jaccard_scores: List[float] = []
    relation_agreements = 0
    review_agreements = 0

    per_dept_y1: Dict[str, List[int]] = {d: [] for d in DEPARTMENTS}
    per_dept_y2: Dict[str, List[int]] = {d: [] for d in DEPARTMENTS}

    discrepancy_details = []

    for rid in common_ids:
        r1, r2 = records1[rid], records2[rid]
        depts1 = {iss["department_key"] for iss in r1.get("issues", [])}
        depts2 = {iss["department_key"] for iss in r2.get("issues", [])}

        # Exact department set match
        if depts1 == depts2:
            exact_set_agreements += 1

        # Jaccard
        union_len = len(depts1 | depts2)
        if union_len == 0:
            jaccard = 1.0 if (r1.get("needs_review") and r2.get("needs_review")) else 0.0
        else:
            jaccard = len(depts1 & depts2) / union_len
        jaccard_scores.append(jaccard)

        # Binary per-dept arrays
        for d in DEPARTMENTS:
            per_dept_y1[d].append(1 if d in depts1 else 0)
            per_dept_y2[d].append(1 if d in depts2 else 0)

        # Review agreement
        rev1 = bool(r1.get("needs_review"))
        rev2 = bool(r2.get("needs_review"))
        if rev1 == rev2:
            review_agreements += 1

        # Relations agreement
        rels1 = sorted(
            [
                f"{rel.get('source_issue_id')}:{rel.get('relation_type')}:{rel.get('target_issue_id')}"
                for rel in r1.get("relations", [])
            ]
        )
        rels2 = sorted(
            [
                f"{rel.get('source_issue_id')}:{rel.get('relation_type')}:{rel.get('target_issue_id')}"
                for rel in r2.get("relations", [])
            ]
        )
        if rels1 == rels2:
            relation_agreements += 1
        else:
            discrepancy_details.append({
                "record_id": rid,
                "type": "RELATION_DISCORDANCE",
                "annotator_1_relations": rels1,
                "annotator_2_relations": rels2,
            })

        if depts1 != depts2:
            discrepancy_details.append({
                "record_id": rid,
                "type": "DEPARTMENT_DISCORDANCE",
                "annotator_1_departments": sorted(depts1),
                "annotator_2_departments": sorted(depts2),
            })

    # Per-department Cohen's Kappa
    per_department_kappa = {}
    kappa_sum = 0.0
    for d in DEPARTMENTS:
        k = calculate_cohen_kappa(per_dept_y1[d], per_dept_y2[d])
        per_department_kappa[d] = k
        kappa_sum += k

    macro_kappa = float(round(kappa_sum / len(DEPARTMENTS), 4))
    exact_set_rate = float(round(exact_set_agreements / n, 4))
    mean_jaccard = float(round(sum(jaccard_scores) / n, 4))
    relation_rate = float(round(relation_agreements / n, 4))
    review_rate = float(round(review_agreements / n, 4))

    return {
        "common_sample_size": n,
        "exact_department_set_agreement_rate": exact_set_rate,
        "mean_jaccard_similarity": mean_jaccard,
        "macro_cohen_kappa": macro_kappa,
        "per_department_cohen_kappa": per_department_kappa,
        "relation_agreement_rate": relation_rate,
        "review_agreement_rate": review_rate,
        "total_discrepancies": len(discrepancy_details),
        "sample_discrepancies": discrepancy_details[:20],
    }


def adjudicate_annotations(
    file_1: Path,
    file_2: Path,
    out_consensus_gold: Path,
    out_disputed_queue: Path,
    adjudicator_id: str = "senior_adjudicator",
) -> Dict[str, Any]:
    """Merge consensus records and isolate discordant records into an adjudication queue."""
    file_1 = Path(file_1)
    file_2 = Path(file_2)
    out_consensus_gold = Path(out_consensus_gold)
    out_disputed_queue = Path(out_disputed_queue)

    out_consensus_gold.parent.mkdir(parents=True, exist_ok=True)
    out_disputed_queue.parent.mkdir(parents=True, exist_ok=True)

    records1 = {r["record_id"]: r for r in [json.loads(l) for l in file_1.read_text(encoding="utf-8").splitlines() if l.strip()]}
    records2 = {r["record_id"]: r for r in [json.loads(l) for l in file_2.read_text(encoding="utf-8").splitlines() if l.strip()]}

    common_ids = sorted(set(records1.keys()) & set(records2.keys()))
    consensus_records = []
    disputed_records = []

    now_iso = datetime.now(timezone.utc).isoformat()

    for rid in common_ids:
        r1, r2 = records1[rid], records2[rid]
        depts1 = sorted([iss["department_key"] for iss in r1.get("issues", [])])
        depts2 = sorted([iss["department_key"] for iss in r2.get("issues", [])])

        rels1 = sorted([f"{rel.get('source_issue_id')}:{rel.get('relation_type')}:{rel.get('target_issue_id')}" for rel in r1.get("relations", [])])
        rels2 = sorted([f"{rel.get('source_issue_id')}:{rel.get('relation_type')}:{rel.get('target_issue_id')}" for rel in r2.get("relations", [])])

        rev1 = bool(r1.get("needs_review"))
        rev2 = bool(r2.get("needs_review"))

        is_consensus = (depts1 == depts2 and rels1 == rels2 and rev1 == rev2)

        if is_consensus:
            # Unanimous agreement: mark as DUAL_CONSENSUS
            consensus_rec = dict(r1)
            consensus_rec["annotation_meta"] = {
                "annotator_id": f"{r1.get('annotation_meta', {}).get('annotator_id')}+{r2.get('annotation_meta', {}).get('annotator_id')}",
                "annotated_at": now_iso,
                "adjudication_status": "DUAL_CONSENSUS",
                "adjudicated_by": adjudicator_id,
                "adjudicated_at": now_iso,
                "notes": "Unanimous dual-annotator consensus",
            }
            consensus_records.append(consensus_rec)
        else:
            # Discrepancy: export packet for human adjudication
            disputed_item = {
                "record_id": rid,
                "complaint_text": r1.get("complaint_text"),
                "annotator_1": {
                    "id": r1.get("annotation_meta", {}).get("annotator_id"),
                    "departments": depts1,
                    "issues": r1.get("issues", []),
                    "relations": r1.get("relations", []),
                    "needs_review": rev1,
                },
                "annotator_2": {
                    "id": r2.get("annotation_meta", {}).get("annotator_id"),
                    "departments": depts2,
                    "issues": r2.get("issues", []),
                    "relations": r2.get("relations", []),
                    "needs_review": rev2,
                },
                "adjudication_decision": "PENDING_ADJUDICATION",
                "adjudicated_departments": None,
                "adjudicated_issues": None,
                "adjudicated_relations": None,
                "adjudicated_by": None,
                "adjudication_notes": None,
            }
            disputed_records.append(disputed_item)

    # Write consensus gold
    with out_consensus_gold.open("w", encoding="utf-8") as f:
        for rec in consensus_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # Write disputed queue
    with out_disputed_queue.open("w", encoding="utf-8") as f:
        for rec in disputed_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return {
        "total_evaluated": len(common_ids),
        "consensus_records_count": len(consensus_records),
        "disputed_records_count": len(disputed_records),
        "consensus_rate": float(round(len(consensus_records) / max(len(common_ids), 1), 4)),
        "consensus_output_path": str(out_consensus_gold),
        "disputed_output_path": str(out_disputed_queue),
    }
