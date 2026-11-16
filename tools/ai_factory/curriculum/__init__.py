"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.3 Autonomous Curriculum Package."""
from tools.ai_factory.curriculum.intent_graph import (
    DEPARTMENTS,
    IntentGraph,
    IssueNode,
    RelationEdge,
)
from tools.ai_factory.curriculum.realizer import (
    AutonomousCurriculumRealizer,
    SPLIT_FAMILIES,
    normalize_text,
)
from tools.ai_factory.curriculum.reporting import generate_markdown_report
from tools.ai_factory.curriculum.scheduler import (
    CurriculumHarness,
    assert_isolated,
    execute_curriculum_run,
)

__all__ = [
    "DEPARTMENTS",
    "IntentGraph",
    "IssueNode",
    "RelationEdge",
    "AutonomousCurriculumRealizer",
    "SPLIT_FAMILIES",
    "normalize_text",
    "CurriculumHarness",
    "assert_isolated",
    "execute_curriculum_run",
    "generate_markdown_report",
]
