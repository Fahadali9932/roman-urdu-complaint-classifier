"""Awaaz-e-Awam (آوازِ عوام) — Human Data Schema Specification & Validation.

Enforces:
1. Strict human-authored provenance and consent confirmation.
2. Verified character-level issue spans matching original text.
3. Causal, consequence, independent, and dual-repair relational taxonomy.
4. Syntactic negation and mention-only contextual scoping.
5. Automated PII detection gate (rejects any unredacted phone, CNIC, email, or private residence address).
6. Controlled review necessity classification.
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from tools.ai_factory.scenarios import DEPARTMENTS
from tools.ai_factory.validators import scan_pii

VALID_DEPARTMENTS: Set[str] = set(DEPARTMENTS)

VALID_RELATION_TYPES: Set[str] = {
    "INDEPENDENT",
    "CAUSES",
    "EFFECT_OF",
    "SAME_INCIDENT_DIFFERENT_REPAIRS",
    "MENTION_ONLY",
    "UNCERTAIN",
}

VALID_SOURCE_CHANNELS: Set[str] = {
    "direct_citizen_interview",
    "verified_civic_archive",
    "public_hearing_transcript",
    "community_survey_consent",
    "citizen_portal_donation",
}

VALID_REVIEW_REASONS: Set[str] = {
    "UNCERTAIN_DEFECT",
    "VAGUE_UNSPECIFIED",
    "INSUFFICIENT_DETAIL",
    "CONTRADICTORY_CLAIMS",
    "OUT_OF_MUNICIPAL_JURISDICTION",
    "PRIVATE_DISPUTE",
    "DUAL_AMBIGUOUS",
}

VALID_ADJUDICATION_STATUSES: Set[str] = {
    "SINGLE_ANNOTATED",
    "DUAL_CONSENSUS",
    "ADJUDICATED",
    "PENDING_ADJUDICATION",
    "REJECTED",
}


@dataclass
class HumanIssueSpan:
    """Character-grounded actionable defect span in a human complaint."""
    issue_id: str
    department_key: str
    issue_type: str
    span_text: str
    start_char: int
    end_char: int
    severity: str = "medium"  # low, medium, high, emergency

    def validate(self, full_text: str) -> List[str]:
        errors = []
        if self.department_key not in VALID_DEPARTMENTS:
            errors.append(f"Invalid department_key '{self.department_key}'; must be one of {sorted(VALID_DEPARTMENTS)}")
        if not self.issue_id or not isinstance(self.issue_id, str):
            errors.append("issue_id must be a non-empty string")
        if not self.span_text or not isinstance(self.span_text, str):
            errors.append("span_text must be a non-empty string")

        # Verify character bounds
        if self.start_char < 0 or self.end_char > len(full_text) or self.start_char >= self.end_char:
            errors.append(f"Invalid char offsets [{self.start_char}:{self.end_char}] for text of length {len(full_text)}")
        else:
            actual_sub = full_text[self.start_char:self.end_char]
            if actual_sub != self.span_text:
                errors.append(
                    f"Span mismatch: text[{self.start_char}:{self.end_char}] is '{actual_sub}', expected '{self.span_text}'"
                )
        return errors


@dataclass
class HumanRelationAnnotation:
    """Relational edge between two annotated issue spans."""
    source_issue_id: str
    target_issue_id: str
    relation_type: str

    def validate(self, valid_issue_ids: Set[str]) -> List[str]:
        errors = []
        if self.relation_type not in VALID_RELATION_TYPES:
            errors.append(f"Invalid relation_type '{self.relation_type}'; must be one of {sorted(VALID_RELATION_TYPES)}")
        if self.source_issue_id not in valid_issue_ids:
            errors.append(f"source_issue_id '{self.source_issue_id}' not found in annotated issues")
        if self.target_issue_id not in valid_issue_ids:
            errors.append(f"target_issue_id '{self.target_issue_id}' not found in annotated issues")
        if self.source_issue_id == self.target_issue_id and self.relation_type != "MENTION_ONLY":
            errors.append(f"Self-referential relation on issue '{self.source_issue_id}' not permitted for {self.relation_type}")
        return errors


@dataclass
class HumanContextAnnotation:
    """Contextual metadata: negations, recipient mentions, and hazard indicators."""
    negated_departments: List[str] = field(default_factory=list)
    negated_spans: List[str] = field(default_factory=list)
    mentioned_only_departments: List[str] = field(default_factory=list)
    mentioned_spans: List[str] = field(default_factory=list)
    has_hazard: bool = False
    hazard_type: Optional[str] = None  # electrical_hazard, gas_leak_hazard, structural_hazard

    def validate(self, full_text: str) -> List[str]:
        errors = []
        for d in self.negated_departments:
            if d not in VALID_DEPARTMENTS:
                errors.append(f"Invalid negated department '{d}'")
        for d in self.mentioned_only_departments:
            if d not in VALID_DEPARTMENTS:
                errors.append(f"Invalid mentioned-only department '{d}'")
        for s in self.negated_spans:
            if s.lower() not in full_text.lower():
                errors.append(f"Negated span '{s}' not found in complaint text")
        for s in self.mentioned_spans:
            if s.lower() not in full_text.lower():
                errors.append(f"Mentioned span '{s}' not found in complaint text")
        return errors


@dataclass
class HumanProvenanceAnnotation:
    """Provenance and citizen consent tracking."""
    provenance_id: str
    source_channel: str
    consent_confirmed: bool
    collected_at: str
    locality: str
    district: str
    pii_scrubbed: bool = True
    source_kind: str = "human_authored"

    def validate(self) -> List[str]:
        errors = []
        if self.source_kind != "human_authored":
            errors.append(f"source_kind must be strictly 'human_authored', got '{self.source_kind}'")
        if self.source_channel not in VALID_SOURCE_CHANNELS:
            errors.append(f"Invalid source_channel '{self.source_channel}'; must be one of {sorted(VALID_SOURCE_CHANNELS)}")
        if not self.consent_confirmed:
            errors.append("consent_confirmed must be True for all ingested human complaints")
        if not self.pii_scrubbed:
            errors.append("pii_scrubbed must be True")
        if not self.locality or not isinstance(self.locality, str):
            errors.append("locality must be a non-empty string")
        if not self.district or not isinstance(self.district, str):
            errors.append("district must be a non-empty string")
        return errors


@dataclass
class HumanAnnotationMeta:
    """Annotator identity, agreement, and adjudication state."""
    annotator_id: str
    annotated_at: str
    adjudication_status: str = "SINGLE_ANNOTATED"
    adjudicated_by: Optional[str] = None
    adjudicated_at: Optional[str] = None
    notes: Optional[str] = None

    def validate(self) -> List[str]:
        errors = []
        if not self.annotator_id or not isinstance(self.annotator_id, str):
            errors.append("annotator_id must be a non-empty string")
        if self.adjudication_status not in VALID_ADJUDICATION_STATUSES:
            errors.append(f"Invalid adjudication_status '{self.adjudication_status}'; must be one of {sorted(VALID_ADJUDICATION_STATUSES)}")
        if self.adjudication_status == "ADJUDICATED" and not self.adjudicated_by:
            errors.append("adjudication_status 'ADJUDICATED' requires non-empty adjudicated_by")
        return errors


@dataclass
class HumanComplaintRecord:
    """Complete specification for an independently collected, annotated human complaint."""
    record_id: str
    complaint_text: str
    issues: List[HumanIssueSpan]
    relations: List[HumanRelationAnnotation]
    context: HumanContextAnnotation
    provenance: HumanProvenanceAnnotation
    annotation_meta: HumanAnnotationMeta
    needs_review: bool = False
    review_reason: Optional[str] = None
    review_explanation: Optional[str] = None
    language_profile: str = "roman_urdu"  # roman_urdu, mixed_urdu_english

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> HumanComplaintRecord:
        issues = [HumanIssueSpan(**iss) for iss in data.get("issues", [])]
        relations = [HumanRelationAnnotation(**rel) for rel in data.get("relations", [])]
        context = HumanContextAnnotation(**data.get("context", {}))
        provenance = HumanProvenanceAnnotation(**data.get("provenance", {}))
        meta = HumanAnnotationMeta(**data.get("annotation_meta", {}))

        return cls(
            record_id=data["record_id"],
            complaint_text=data["complaint_text"],
            issues=issues,
            relations=relations,
            context=context,
            provenance=provenance,
            annotation_meta=meta,
            needs_review=data.get("needs_review", False),
            review_reason=data.get("review_reason"),
            review_explanation=data.get("review_explanation"),
            language_profile=data.get("language_profile", "roman_urdu"),
        )

    def validate(self) -> List[str]:
        """Validate all constraints, offsets, PII, and relational consistency."""
        errors = []

        if not self.record_id or not isinstance(self.record_id, str):
            errors.append("record_id must be a non-empty string")
        if not self.complaint_text or not isinstance(self.complaint_text, str) or len(self.complaint_text.strip()) < 5:
            errors.append("complaint_text must be at least 5 characters long")

        # 1. PII Security Gate
        pii_found = scan_pii(self.complaint_text)
        if pii_found:
            errors.append(f"PII detected in complaint text: {pii_found}. Complaint must be scrubbed before ingestion.")

        # 2. Issues & Spans
        issue_ids: Set[str] = set()
        for iss in self.issues:
            if iss.issue_id in issue_ids:
                errors.append(f"Duplicate issue_id '{iss.issue_id}'")
            issue_ids.add(iss.issue_id)
            errors.extend(iss.validate(self.complaint_text))

        # 3. Relations
        for rel in self.relations:
            errors.extend(rel.validate(issue_ids))

        # 4. Context & Negations
        errors.extend(self.context.validate(self.complaint_text))

        # 5. Provenance
        errors.extend(self.provenance.validate())

        # 6. Annotation Metadata
        errors.extend(self.annotation_meta.validate())

        # 7. Review logic
        if self.needs_review:
            if self.review_reason not in VALID_REVIEW_REASONS:
                errors.append(f"When needs_review is True, review_reason must be one of {sorted(VALID_REVIEW_REASONS)}")
        else:
            if len(self.issues) == 0:
                errors.append("Complaint has 0 actionable issues but needs_review is False. Must set needs_review=True if no department applies.")

        return errors


@dataclass
class HumanAnnotationPacket:
    """Standardized blinded annotation packet for human labeling teams."""
    packet_id: str
    created_at: str
    target_annotator: str
    complaints: List[Dict[str, Any]]

    def to_jsonl(self, out_path: Path) -> None:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            for item in self.complaints:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")


def validate_human_record(data: Dict[str, Any]) -> List[str]:
    """Top-level validation for a single human complaint dictionary."""
    try:
        rec = HumanComplaintRecord.from_dict(data)
        return rec.validate()
    except Exception as exc:
        return [f"Schema instantiation exception: {exc}"]


def validate_human_dataset(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Batch validator returning comprehensive error audit and distribution summary."""
    total = len(records)
    all_errors = []
    dept_counts: Dict[str, int] = {d: 0 for d in DEPARTMENTS}
    multi_issue_count = 0
    needs_review_count = 0
    channel_counts: Dict[str, int] = {}
    adjudication_counts: Dict[str, int] = {}

    for idx, r in enumerate(records):
        errs = validate_human_record(r)
        if errs:
            for e in errs:
                all_errors.append(f"Record #{idx+1} [ID: {r.get('record_id', 'unknown')}]: {e}")
        else:
            rec = HumanComplaintRecord.from_dict(r)
            if len(rec.issues) > 1:
                multi_issue_count += 1
            if rec.needs_review:
                needs_review_count += 1
            for iss in rec.issues:
                dept_counts[iss.department_key] = dept_counts.get(iss.department_key, 0) + 1
            
            ch = rec.provenance.source_channel
            channel_counts[ch] = channel_counts.get(ch, 0) + 1
            adj = rec.annotation_meta.adjudication_status
            adjudication_counts[adj] = adjudication_counts.get(adj, 0) + 1

    return {
        "valid": len(all_errors) == 0,
        "total_records": total,
        "error_count": len(all_errors),
        "errors": all_errors[:50],  # first 50
        "summary": {
            "departments": dept_counts,
            "multi_issue_records": multi_issue_count,
            "needs_review_records": needs_review_count,
            "source_channels": channel_counts,
            "adjudication_statuses": adjudication_counts,
        },
    }
