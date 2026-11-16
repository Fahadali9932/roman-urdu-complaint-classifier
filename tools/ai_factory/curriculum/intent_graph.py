"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.3 Compositional Intent Graph Schema.

Defines civic grievance intent graphs BEFORE text generation:
- Issues (nodes) with department, defect type, urgency, and actionable status.
- Relations (edges): SINGLE, SINGLE_INFORMAL, CAUSES_CONTEXT_ONLY,
  SAME_INCIDENT_DIFFERENT_REPAIRS, INDEPENDENT, MENTION_ONLY_NEGATED,
  RECIPIENT_ONLY, SPATIAL_PROXIMITY_ONLY, UNCERTAIN.
- Explicit target departments (ground truth) vs suppressed/negated departments.
- Human review necessity and structured review reasons.
"""
from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Set

DEPARTMENTS: Sequence[str] = ("kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca")

VALID_RELATIONS: Set[str] = {
    "SINGLE",
    "SINGLE_INFORMAL",
    "CAUSES_CONTEXT_ONLY",
    "SAME_INCIDENT_DIFFERENT_REPAIRS",
    "INDEPENDENT",
    "MENTION_ONLY_NEGATED",
    "RECIPIENT_ONLY",
    "SPATIAL_PROXIMITY_ONLY",
    "UNCERTAIN",
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


@dataclass
class IssueNode:
    node_id: str
    department: str
    defect_type: str
    family_id: str
    urgency: str = "medium"
    is_primary: bool = True
    actionable: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> IssueNode:
        return cls(**data)


@dataclass
class RelationEdge:
    source_id: str
    target_id: str
    relation_type: str
    description: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RelationEdge:
        return cls(**data)


@dataclass
class IntentGraph:
    graph_id: str
    difficulty_level: int
    split: str
    issues: List[IssueNode] = field(default_factory=list)
    edges: List[RelationEdge] = field(default_factory=list)
    target_departments: List[str] = field(default_factory=list)
    suppressed_departments: List[str] = field(default_factory=list)
    negated_departments: List[str] = field(default_factory=list)
    addressee_department: Optional[str] = None
    spatial_landmark_department: Optional[str] = None
    needs_review: bool = False
    review_reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.difficulty_level not in (1, 2, 3, 4, 5):
            raise ValueError(f"Difficulty level must be 1..5, got {self.difficulty_level}")
        if self.split not in ("train", "validation", "test"):
            raise ValueError(f"Split must be train/validation/test, got {self.split}")
        # Normalize and sort target departments
        self.target_departments = sorted(list(set(self.target_departments)))
        self.suppressed_departments = sorted(list(set(self.suppressed_departments)))
        self.negated_departments = sorted(list(set(self.negated_departments)))

    def validate(self) -> List[str]:
        """Validate logical consistency of the intent graph."""
        errors = []
        node_ids = {node.node_id for node in self.issues}
        for edge in self.edges:
            if edge.source_id not in node_ids:
                errors.append(f"Edge source_id '{edge.source_id}' not found in issue nodes")
            if edge.target_id not in node_ids:
                errors.append(f"Edge target_id '{edge.target_id}' not found in issue nodes")
            if edge.relation_type not in VALID_RELATIONS:
                errors.append(f"Invalid relation_type '{edge.relation_type}'")

        for dept in self.target_departments:
            if dept not in DEPARTMENTS:
                errors.append(f"Invalid target department '{dept}'")

        for dept in self.target_departments:
            if dept in self.suppressed_departments:
                errors.append(f"Department '{dept}' cannot be simultaneously target and suppressed")
            if dept in self.negated_departments:
                errors.append(f"Department '{dept}' cannot be simultaneously target and negated")

        if self.needs_review and self.review_reason not in VALID_REVIEW_REASONS:
            errors.append(f"Invalid review_reason '{self.review_reason}'")

        return errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "graph_id": self.graph_id,
            "difficulty_level": self.difficulty_level,
            "split": self.split,
            "issues": [node.to_dict() for node in self.issues],
            "edges": [edge.to_dict() for edge in self.edges],
            "target_departments": self.target_departments,
            "suppressed_departments": self.suppressed_departments,
            "negated_departments": self.negated_departments,
            "addressee_department": self.addressee_department,
            "spatial_landmark_department": self.spatial_landmark_department,
            "needs_review": self.needs_review,
            "review_reason": self.review_reason,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> IntentGraph:
        issues = [IssueNode.from_dict(i) for i in data.get("issues", [])]
        edges = [RelationEdge.from_dict(e) for e in data.get("edges", [])]
        return cls(
            graph_id=data["graph_id"],
            difficulty_level=data["difficulty_level"],
            split=data["split"],
            issues=issues,
            edges=edges,
            target_departments=data.get("target_departments", []),
            suppressed_departments=data.get("suppressed_departments", []),
            negated_departments=data.get("negated_departments", []),
            addressee_department=data.get("addressee_department"),
            spatial_landmark_department=data.get("spatial_landmark_department"),
            needs_review=data.get("needs_review", False),
            review_reason=data.get("review_reason"),
            metadata=data.get("metadata", {}),
        )
