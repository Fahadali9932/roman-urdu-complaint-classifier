#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.5 Python Two-Department Routing Scope Engine
Parity with TypeScript src/services/v13_5/v13_5_engine.ts.
Academic Stakeholder: Fahad (Greenwich University)
"""

from typing import Dict, Any, List, Optional
from tools.ai_factory.v13_4_issue_relation_graph import build_issue_relation_graph

V13_5_DECISION_POLICY = "v13_5_two_department_routing_policy_v1"

def classify_v13_5_python(text: str, model_artifact: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Applies the Two-Department Routing Scope Policy:
    1. Automatic routing focuses on 1-2 independent departments.
    2. If >= 3 independent departments detected:
       - Escalate to human review with EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED
       - Preserve all detected departments and issue candidates in allDetectedDepartments
       - Do not arbitrarily drop or truncate to 2 departments.
    """
    graph = build_issue_relation_graph(text)
    detected = list(graph.get("actionable_departments", []))

    if len(detected) > 2:
        return {
            "departments": [],  # Avoid arbitrary truncation
            "allDetectedDepartments": detected,
            "needsReview": True,
            "reviewReason": "EXCEEDS_TWO_DEPARTMENTS_HUMAN_TRIAGE_REQUIRED",
            "isTwoDepartmentCompliant": False,
            "twoDeptPolicyTriggered": True,
            "decisionPolicy": V13_5_DECISION_POLICY,
            "graph": graph,
            "notes": [
                f"[TWO_DEPT_POLICY] Detected {len(detected)} independent municipal defects ({', '.join(detected).upper()}). Escalated to human triage under two-department policy."
            ]
        }

    return {
        "departments": detected,
        "allDetectedDepartments": detected,
        "needsReview": False if len(detected) > 0 else True,
        "reviewReason": None if len(detected) > 0 else "NO_ACTIONABLE_DEFECT",
        "isTwoDepartmentCompliant": True,
        "twoDeptPolicyTriggered": False,
        "decisionPolicy": V13_5_DECISION_POLICY,
        "graph": graph,
        "notes": []
    }
