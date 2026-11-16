"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.2B Human Data & Annotation Package.

Provides:
- Data schema models and validation for genuine human-written complaints.
- Privacy and PII scrubbing validation.
- Issue span, relation, and contextual annotation validation.
- Inter-annotator agreement metrics (Cohen's Kappa, Jaccard, Exact Match).
- Adjudication workflows and audit manifests.
"""
from __future__ import annotations

from .schema import (
    HumanComplaintRecord,
    HumanIssueSpan,
    HumanRelationAnnotation,
    HumanContextAnnotation,
    HumanAnnotationPacket,
    validate_human_record,
    validate_human_dataset,
)
from .agreement import (
    compute_detailed_inter_annotator_agreement,
    adjudicate_annotations,
)

__all__ = [
    "HumanComplaintRecord",
    "HumanIssueSpan",
    "HumanRelationAnnotation",
    "HumanContextAnnotation",
    "HumanAnnotationPacket",
    "validate_human_record",
    "validate_human_dataset",
    "compute_detailed_inter_annotator_agreement",
    "adjudicate_annotations",
]
