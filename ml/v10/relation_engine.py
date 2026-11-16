"""Awaaz-e-Awam (آوازِ عوام) — Phase V10 Issue Relation & Causal Disambiguation Engine.

Differentiates between:
1. INDEPENDENT issues (e.g. power outage AND water main burst) -> Two departments assigned.
2. CAUSES / EFFECT_OF consequences (e.g. power outage causes household water motor to stop) -> One department (K-Electric) assigned; suppresses phantom water issue.
3. SAME_INCIDENT_DIFFERENT_REPAIRS (e.g. water main burst erodes road asphalt) -> Two departments (KWSC + KMC) assigned with linked incident.
4. MENTION_ONLY / SYMPTOM (e.g. sewerage water causes traffic jam on road) -> Sewerage (KWSC) assigned; suppresses phantom KMC road repair.
5. NEGATED (e.g. kachra para hai naali band nahi) -> Suppresses negated department.
6. UNCERTAIN (e.g. pani nahi aa raha shayad bijli ki wajah se?) -> Flags for human review with AMBIGUOUS_CAUSE_EFFECT.
"""
from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import re
from typing import List, Dict, Any, Tuple, Optional
from ml.v10.preprocess import normalize_roman_urdu, segment_clauses, detect_causal_markers, is_clause_negated

# Department taxonomy definitions
DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# Department-specific affirmative defect indicators (must be present to be an actionable defect)
AFFIRMATIVE_DEFECT_PATTERNS = {
    "kmc": re.compile(
        r"\b(sarak\s+(toot|kharab|dhans)|road\s+(toot|kharab|dhans|damage|break)|khadda|khadday|pothole|gadda|footpath\s+(toot|encroach)|flyover|storm\s+drain|barsati\s+nala|asphalt)\b",
        re.IGNORECASE,
    ),
    "kwsc": re.compile(
        r"\b(pani\s+(nahi|band|supply|leak|qillat|shortage)|pipeline\s+(phat|burst|leak)|water\s+(leak|shortage|supply)|gutter\s+(ubal|overflow|band|leak)|sewage\s+(overflow|leak|ganda)|manhole\s+(khula|toota|lid|cover))\b",
        re.IGNORECASE,
    ),
    "kelectric": re.compile(
        r"\b(bijli\s+(nahi|band|chali|trip|load\s*shedding)|transformer\s+(kharab|jal|blast|spark)|wire\s+(toot|gir|spark|nangi|latak)|current\s+aa\s+raha|voltage\s+(low|kam|high|fluctuat)|feeder\s+trip|pmt)\b",
        re.IGNORECASE,
    ),
    "ssgc": re.compile(
        r"\b(gas\s+(nahi|band|kam|low|pressure)|gas\s+leak|gas\s+ki\s+boo|pipeline\s+se\s+gas|meter\s+leak|cylinder\s+blast)\b",
        re.IGNORECASE,
    ),
    "sswmb": re.compile(
        r"\b(kachra\s+(para|dher|kundi|overflow)|koora\s+(para|dher)|garbage\s+(dump|pile|overflow)|safai\s+nahi|sweeping|dead\s+animal|janwar\s+ki\s+laash)\b",
        re.IGNORECASE,
    ),
    "sbca": re.compile(
        r"\b(building\s+(gir|crack|unsafe|illegal)|imarat\s+(gir|daraar|bila\s+ijazat)|illegal\s+construction|tameer\s+ghair\s+qanooni|chhat\s+gir|pillar\s+crack)\b",
        re.IGNORECASE,
    ),
}

# Consequence patterns that do NOT represent an independent secondary infrastructure failure
CONSEQUENCE_PATTERNS = [
    # Household water motor stopped because electricity is out -> ONLY electricity issue!
    {
        "primary": "kelectric",
        "consequence_dept": "kwsc",
        "regex": re.compile(r"\b(motor\s+(nahi|band)|pani\s+ki\s+motor|motor\s+chalana)\b", re.IGNORECASE),
        "explanation": "Household water motor failure is an operational consequence of power outage, not a KWSC supply defect.",
    },
    # Traffic obstruction / road flooded by sewer overflow -> ONLY sewage issue unless road asphalt structurally broken!
    {
        "primary": "kwsc",
        "consequence_dept": "kmc",
        "regex": re.compile(r"\b(traffic\s+(ruk|jam|block|mushkil)|road\s+geeli|sarak\s+geeli|road\s+par\s+pani|sarak\s+par\s+pani)\b", re.IGNORECASE),
        "requires_negative_check_on_dept": "kmc",
        "explanation": "Traffic jam or water accumulation on pavement is a symptom of sewer overflow, not an independent structural road defect.",
    },
    # Garbage blocking storm drain -> if garbage cleaning alone fixes it, primarily waste/drain
    {
        "primary": "sswmb",
        "consequence_dept": "kmc",
        "regex": re.compile(r"\b(kachra\s+para\s+hai\s+aur\s+nala\s+saaf|kachre\s+se\s+pani\s+ruk)\b", re.IGNORECASE),
        "explanation": "Waste obstruction rather than structural drain failure.",
    },
]

# Explicit Dual Repair Patterns (One physical incident, but both departments must independently deploy crews)
DUAL_REPAIR_INCIDENTS = [
    # Water main burst broke the road surface -> Both KWSC and KMC
    re.compile(r"\b(pipe|line|main)\s+(phat|burst).*\b(sarak|road)\s+(toot|damage|dhans|satah)", re.IGNORECASE),
    re.compile(r"\b(sarak|road)\s+(toot|damage|dhans).*\b(pipe|line)\s+(phat|burst)", re.IGNORECASE),
    # Road excavation ruptured gas pipeline -> Both KMC and SSGC
    re.compile(r"\b(khudai|excavat).*\b(gas\s+line|pipeline\s+phat|gas\s+leak)", re.IGNORECASE),
    # Live electric wire fallen into rainwater/sewerage pool -> Both K-Electric and KWSC
    re.compile(r"\b(wire|taar)\s+(toot|gir|latak).*\b(pani|gutter|sewer)", re.IGNORECASE),
]


class IssueRelationResolver:
    """Analyzes semantic clauses, candidate department scores, and causal markers to resolve
    actionable department assignments and their relationships.
    """

    def __init__(self):
        pass

    def analyze_complaint(
        self,
        text: str,
        initial_departments: List[str],
        department_scores: Dict[str, float],
    ) -> Dict[str, Any]:
        """Resolves actionable issues, filters phantom consequences, and produces relation graph."""
        normalized = normalize_roman_urdu(text)
        clauses = segment_clauses(text)
        causal_markers = detect_causal_markers(text)

        actionable_depts: List[str] = []
        suppressed_depts: List[Dict[str, str]] = []
        relations: List[Dict[str, Any]] = []
        review_reasons: List[str] = []

        # 1. Check for syntactic negations per department
        negated_depts: set[str] = set()
        for dept in initial_departments:
            for clause in clauses:
                if is_clause_negated(clause, dept):
                    negated_depts.add(dept)

        # 2. Check for consequence suppressions (e.g. power out -> motor band)
        consequence_suppressed: set[str] = set()
        for rule in CONSEQUENCE_PATTERNS:
            primary = rule["primary"]
            consequence = rule["consequence_dept"]
            if primary in initial_departments and consequence in initial_departments:
                if rule["regex"].search(normalized):
                    # Check if the consequence department has its OWN independent affirmative defect
                    aff_check = AFFIRMATIVE_DEFECT_PATTERNS.get(consequence)
                    # If affirmative defect pattern doesn't match or is only matched by consequence terms
                    if consequence == "kwsc" and re.search(r"\b(motor\s+(nahi|band)|pani\s+ki\s+motor)\b", normalized):
                        # Does it mention public pipeline burst or water shortage independently?
                        if not re.search(r"\b(sarkari\s+line|main\s+line|pipeline\s+phat|peene\s+ka\s+pani\s+nahi)\b", normalized):
                            consequence_suppressed.add(consequence)
                            suppressed_depts.append({
                                "department": consequence,
                                "reason": rule["explanation"],
                                "primary": primary,
                            })
                            relations.append({
                                "from_dept": primary,
                                "to_dept": consequence,
                                "type": "EFFECT_OF",
                                "actionable": False,
                            })
                    elif consequence == "kmc" and re.search(r"\b(traffic\s+(ruk|jam)|road\s+geeli|sarak\s+geeli)\b", normalized):
                        # Does it mention actual structural asphalt pothole/damage?
                        if not re.search(r"\b(khadda|pothole|gadda|sarak\s+toot|road\s+toot|dhans)\b", normalized):
                            consequence_suppressed.add(consequence)
                            suppressed_depts.append({
                                "department": consequence,
                                "reason": rule["explanation"],
                                "primary": primary,
                            })
                            relations.append({
                                "from_dept": primary,
                                "to_dept": consequence,
                                "type": "EFFECT_OF",
                                "actionable": False,
                            })

        # 3. Check for Dual Repair Shared Incidents
        is_dual_repair = False
        for dual_pat in DUAL_REPAIR_INCIDENTS:
            if dual_pat.search(normalized):
                is_dual_repair = True
                break

        # 4. Check for Ambiguous Speculation
        if re.search(r"\b(shayad|ho\s+sakta\s+hai|lagta\s+hai|pata\s+nahi|samajh\s+nahi)\b", normalized) and len(initial_departments) > 1:
            review_reasons.append("AMBIGUOUS_CAUSE_EFFECT")

        # 5. Build final actionable departments list
        for dept in initial_departments:
            if dept in negated_depts:
                suppressed_depts.append({
                    "department": dept,
                    "reason": "Department defect explicitly negated in text.",
                })
                continue
            if dept in consequence_suppressed and not is_dual_repair:
                continue
            actionable_depts.append(dept)

        # 6. Populate relation types
        if len(actionable_depts) == 1:
            relations.append({
                "from_dept": actionable_depts[0],
                "to_dept": actionable_depts[0],
                "type": "INDEPENDENT",
                "actionable": True,
            })
        elif len(actionable_depts) > 1:
            rel_type = "SAME_INCIDENT_DIFFERENT_REPAIRS" if is_dual_repair else "INDEPENDENT"
            for i in range(len(actionable_depts)):
                for j in range(i + 1, len(actionable_depts)):
                    relations.append({
                        "from_dept": actionable_depts[i],
                        "to_dept": actionable_depts[j],
                        "type": rel_type,
                        "actionable": True,
                    })

        return {
            "actionable_departments": actionable_depts,
            "suppressed_departments": suppressed_depts,
            "relations": relations,
            "review_reasons": review_reasons,
            "is_dual_repair": is_dual_repair,
            "normalized_text": normalized,
        }


if __name__ == "__main__":
    resolver = IssueRelationResolver()

    # Test Case A: Power out causing motor to stop
    ex_a = "kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi"
    res_a = resolver.analyze_complaint(ex_a, ["kelectric", "kwsc"], {"kelectric": 0.95, "kwsc": 0.65})
    print("\nCase A (Motor stopped):", res_a["actionable_departments"])
    print("Suppressed:", res_a["suppressed_departments"])

    # Test Case B: Independent power + water
    ex_b = "hamare area mein bijli nahi aa rahi aur sarkari pani ki main pipeline bhi phat gai hai"
    res_b = resolver.analyze_complaint(ex_b, ["kelectric", "kwsc"], {"kelectric": 0.95, "kwsc": 0.92})
    print("\nCase B (Independent):", res_b["actionable_departments"])
    print("Relations:", res_b["relations"])

    # Test Case C: Water main burst breaks road
    ex_c = "pani ki main line phat gai hai aur us ki wajah se road ki satah bhi toot gai hai"
    res_c = resolver.analyze_complaint(ex_c, ["kwsc", "kmc"], {"kwsc": 0.94, "kmc": 0.90})
    print("\nCase C (Dual Repair):", res_c["actionable_departments"])
    print("Relations:", res_c["relations"])

    # Test Case D: Sewerage on road causing traffic
    ex_d = "sewerage ka pani road par aa raha hai jis se traffic ruk gaya hai"
    res_d = resolver.analyze_complaint(ex_d, ["kwsc", "kmc"], {"kwsc": 0.93, "kmc": 0.70})
    print("\nCase D (Traffic consequence):", res_d["actionable_departments"])
    print("Suppressed:", res_d["suppressed_departments"])
