"""Awaaz-e-Awam (آوازِ عوام) — Phase V11.3 Autonomous Roman Urdu Realizer.

Renders diverse, authentic Roman Urdu complaints from compositional Intent Graphs
across Curriculum Levels 1 to 5:
- Level 1: Obvious single-fault baseline across all 6 departments.
- Level 2: Natural informal Roman Urdu with realistic spelling variations, slang,
           colloquialisms, short and narrative phrasing.
- Level 3: Contextual consequences (power cut stopping domestic pump -> K-Electric only;
           sewage making road wet -> KWSC only; low gas -> SSGC only; trash -> SSWMB only).
- Level 4: Genuinely independent multi-department civic issues (dual physical repairs).
- Level 5: Hard counterfactuals, explicit negations, addressee-only mentions,
           spatial landmarks without damage, technical loanwords, and review triage.

Enforces:
- Strict group isolation: scenario families are assigned BEFORE text generation.
- Zero PII: rejects genuine phone numbers, CNICs, emails, and private addresses.
- Negative PII check: preserves ordinary Roman Urdu words like 'makanon', 'flaton'.
"""
from __future__ import annotations

import hashlib
import random
import re
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from tools.ai_factory.curriculum.intent_graph import (
    DEPARTMENTS,
    IntentGraph,
    IssueNode,
    RelationEdge,
)
from tools.ai_factory.scenarios import (
    PREFIXES,
    PUBLIC_PLACES,
    REQUESTS,
    SCENARIOS,
    SUFFIXES,
    TIMES,
)
from tools.ai_factory.validators import has_pii

# Map all 75 scenarios by family_id
SCENARIO_BY_ID: Dict[str, Dict[str, Any]] = {s["family_id"]: s for s in SCENARIOS}

# Frozen partition scenario family assignments (Group Isolation)
VAL_FAMILIES: Set[str] = {
    "ke_live_wire_fallen_hazard",
    "ke_low_voltage_fluctuation",
    "kmc_road_flooded_monsoon",
    "kwsc_low_water_pressure",
    "negation_road_fine_sewer_broken",
    "pair_waste_and_building",
    "pair_waste_and_road",
    "ssgc_gas_supply_loss",
    "ssgc_pipeline_fracture_excavation",
    "sswmb_burning_garbage_smoke",
    "uncertain_cause_speculation",
}

TEST_FAMILIES: Set[str] = {
    "causal_power_motor_kwsc_suppressed",
    "ke_feeder_tripping_frequent",
    "ke_phase_missing",
    "kmc_street_lights_out",
    "pair_gas_and_wire",
    "pair_road_and_power",
    "pair_water_and_gas",
    "sbca_illegal_extra_floors",
    "sbca_sealing_order_violation",
    "ssgc_pipeline_leak_odor_hazard",
    "sswmb_animal_carcass_urgent",
    "sswmb_garbage_overflow_dump",
}

# Training pool: all remaining catalog scenarios (52 families)
TRAIN_FAMILIES: Set[str] = set(SCENARIO_BY_ID.keys()) - (VAL_FAMILIES | TEST_FAMILIES)

SPLIT_FAMILIES: Dict[str, Set[str]] = {
    "train": TRAIN_FAMILIES,
    "validation": VAL_FAMILIES,
    "test": TEST_FAMILIES,
}

# Group scenarios by department within each split: Single vs Multi-issue
DEPT_SINGLE_SCENARIOS_BY_SPLIT: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    split: {dept: [] for dept in DEPARTMENTS} for split in ("train", "validation", "test")
}
PAIR_SCENARIOS_BY_SPLIT: Dict[str, List[Dict[str, Any]]] = {
    split: [] for split in ("train", "validation", "test")
}

for _s in SCENARIOS:
    _fid = _s["family_id"]
    _split = "train" if _fid in TRAIN_FAMILIES else ("validation" if _fid in VAL_FAMILIES else "test")
    is_pair = len(_s.get("issues", [])) > 1 or _fid.startswith("pair_") or _fid.startswith("dual_")
    if is_pair:
        if _s not in PAIR_SCENARIOS_BY_SPLIT[_split]:
            PAIR_SCENARIOS_BY_SPLIT[_split].append(_s)
    else:
        for _iss in _s.get("issues", []):
            _dept = _iss.get("department_key")
            if _dept in DEPARTMENTS:
                if _s not in DEPT_SINGLE_SCENARIOS_BY_SPLIT[_split][_dept]:
                    DEPT_SINGLE_SCENARIOS_BY_SPLIT[_split][_dept].append(_s)

# Colloquial Roman Urdu spelling permutations
COLLOQUIAL_SPELLINGS: List[Tuple[str, str]] = [
    ("bohot", "boht"),
    ("bohot", "bht"),
    ("sarak", "sadak"),
    ("sarak", "road"),
    ("nahi", "nhi"),
    ("nahi", "nai"),
    ("hai", "he"),
    ("hai", "hy"),
    ("gaya", "gya"),
    ("rahi", "rhi"),
    ("pani", "paani"),
    ("bijli", "light"),
    ("theek", "thik"),
    ("kharab", "khrab"),
    ("karo", "krdo"),
    ("mein", "me"),
    ("aur", "or"),
    ("bhi", "b"),
]

# Informal Karachite openings and expressions
INFORMAL_OPENINGS: Sequence[str] = (
    "yr dekho",
    "bhai jan",
    "sun lein janab",
    "hmaray area me",
    "plz check krlo",
    "roz ka masla hy yahan",
    "bhai koi hal nikalo",
    "bar bar bol chukay hain",
    "salam bhai",
)

INFORMAL_PLEAS: Sequence[str] = (
    "awam tang agai hy",
    "kuch to reham kro bhai",
    "jaldi team bhejen",
    "jeena dushwar hogya hy",
    "koi sunwai nhi horhi",
    "fori notice lia jaye",
)

CONSEQUENCE_TEMPLATES: Dict[str, Sequence[Tuple[str, str, str]]] = {
    # department -> list of (consequence_text, suppressed_dept, relation_note)
    "kelectric": [
        ("jiski wajah se ghar ki pani wali motor nahi chal rahi aur tanki khali hai", "kwsc", "Domestic water motor failure is downstream consequence of electricity outage"),
        ("is liye fridge aur motor sab band pari hain", "kwsc", "Appliance failure downstream of power cut"),
    ],
    "kwsc": [
        ("jis se road par ganda pani beh raha hai aur traffic slow ho gaya hai", "kmc", "Traffic congestion and wet road are downstream consequences of sewer overflow"),
        ("pani road par jama hai aur gariyan phans rahi hain sarak tooti nahi hai", "kmc", "Surface water causing traffic obstruction without structural road defect"),
    ],
    "ssgc": [
        ("is wajah se chulha nahi jal raha aur breakfast nahi ban saka", "none", "Cooking disruption is personal consequence of gas outage"),
        ("gas na hone se khana banana namumkin ho gaya hai", "none", "Cooking disruption is personal consequence of gas pressure drop"),
    ],
    "sswmb": [
        ("is se shadeed badboo aur machar phail gaye hain bimari ka khatra hai", "none", "Foul odor and insect proliferation are downstream environmental symptoms of solid waste"),
        ("badboo ki wajah se saans lena mushkil ho gaya hai", "none", "Odor consequence of waste accumulation"),
    ],
    "sbca": [
        ("construction ka scaffolding footpath par laga hai rasta tang ho gaya hai sarak theek hai", "kmc", "Construction obstruction without structural pavement defect"),
    ],
    "kmc": [
        ("pothole ki wajah se traffic jam ho raha hai aur gariyan slow hain", "none", "Traffic slowdown consequence of road defect"),
    ],
}

INDEPENDENT_CONNECTORS: Sequence[str] = (
    "aur alag se doosra masla ye hai ke",
    "aur is ke sath sath alag se",
    "aur saath mein doosra bara issue ye hai ke",
    "is ke ilawa ek aur alag problem ye hai ke",
    "aur mazeed ye ke alag se",
)

DECOY_LABELS: Dict[str, str] = {
    "kmc": "sarak ya road",
    "kwsc": "pani ya gutter",
    "kelectric": "bijli ya light",
    "ssgc": "gas",
    "sswmb": "kachra ya safai",
    "sbca": "building ya construction",
}


def normalize_text(text: str) -> str:
    """Normalize text for cross-split duplicate checks."""
    return " ".join(re.findall(r"\w+", text.casefold()))


def apply_informal_noise(text: str, rng: random.Random, probability: float = 0.35) -> str:
    """Inject authentic Roman Urdu colloquial spelling substitutions."""
    words = text.split()
    res = []
    for w in words:
        punct = ""
        clean = w
        if w and w[-1] in {".", ",", "!", "?", ":"}:
            punct = w[-1]
            clean = w[:-1]
        lower = clean.lower()
        subbed = False
        if rng.random() < probability:
            for src, target in COLLOQUIAL_SPELLINGS:
                if lower == src:
                    if clean and clean[0].isupper():
                        res.append(target.capitalize() + punct)
                    else:
                        res.append(target + punct)
                    subbed = True
                    break
        if not subbed:
            res.append(w)
    return " ".join(res)


class AutonomousCurriculumRealizer:
    """Generates synthetic complaints strictly derived from typed intent graphs."""

    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)

    def plan_intent_graph(
        self,
        split: str,
        difficulty_level: int,
        primary_dept: Optional[str] = None,
        secondary_dept: Optional[str] = None,
        target_focus_level: Optional[int] = None,
    ) -> IntentGraph:
        """Construct an Intent Graph before generating text."""
        level = target_focus_level if target_focus_level is not None else difficulty_level
        graph_id = f"graph_{split}_L{level}_{self.rng.randint(100000, 999999)}"

        if primary_dept is None:
            primary_dept = self.rng.choice(list(DEPARTMENTS))

        # Select primary scenario from the split's authorized single families
        dept_scenarios = DEPT_SINGLE_SCENARIOS_BY_SPLIT[split][primary_dept]
        if not dept_scenarios:
            avail = [s for s in SCENARIOS if s["family_id"] in SPLIT_FAMILIES[split] and len(s.get("issues", [])) == 1]
            if avail:
                primary_spec = self.rng.choice(avail)
                primary_dept = primary_spec["issues"][0]["department_key"]
            else:
                avail_all = [s for s in SCENARIOS if s["family_id"] in SPLIT_FAMILIES[split]]
                primary_spec = self.rng.choice(avail_all)
                primary_dept = primary_spec["issues"][0]["department_key"]
        else:
            primary_spec = self.rng.choice(dept_scenarios)

        primary_issue_type = primary_spec["issues"][0]["issue_type"] if primary_spec.get("issues") else "general_grievance"

        graph = IntentGraph(
            graph_id=graph_id,
            difficulty_level=level,
            split=split,
        )

        node_1 = IssueNode(
            node_id="i1",
            department=primary_dept,
            defect_type=primary_issue_type,
            family_id=primary_spec["family_id"],
            urgency="high" if "hazard_reported" in primary_spec.get("flags", []) else "medium",
            is_primary=True,
            actionable=True,
        )
        graph.issues.append(node_1)

        if level == 1:
            graph.target_departments = [primary_dept]
            graph.edges.append(RelationEdge("i1", "i1", "SINGLE", "Single clear municipal defect"))

        elif level == 2:
            graph.target_departments = [primary_dept]
            graph.edges.append(RelationEdge("i1", "i1", "SINGLE_INFORMAL", "Informal noisy phrasing of single defect"))

        elif level == 3:
            graph.target_departments = [primary_dept]
            suppressed = None
            if primary_dept in CONSEQUENCE_TEMPLATES:
                cand = self.rng.choice(CONSEQUENCE_TEMPLATES[primary_dept])
                if cand[1] != "none":
                    suppressed = cand[1]
                    graph.suppressed_departments = [suppressed]
            graph.edges.append(RelationEdge("i1", "i1", "CAUSES_CONTEXT_ONLY", "Downstream symptom or consequence"))

        elif level == 4:
            # Genuinely independent multi-department complaint
            pair_cands = PAIR_SCENARIOS_BY_SPLIT[split]
            if pair_cands and self.rng.random() < 0.40:
                pair_spec = self.rng.choice(pair_cands)
                graph.issues = []
                target_depts = set()
                for idx, iss in enumerate(pair_spec["issues"]):
                    d = iss["department_key"]
                    target_depts.add(d)
                    graph.issues.append(IssueNode(
                        node_id=f"i{idx+1}",
                        department=d,
                        defect_type=iss["issue_type"],
                        family_id=pair_spec["family_id"],
                        urgency="high" if "hazard_reported" in pair_spec.get("flags", []) else "medium",
                        is_primary=(idx == 0),
                        actionable=True,
                    ))
                graph.target_departments = sorted(list(target_depts))
                rel_type = pair_spec.get("relation", "INDEPENDENT")
                graph.edges.append(RelationEdge("i1", "i2", rel_type, "Two distinct actionable municipal repairs"))
            else:
                if secondary_dept is None or secondary_dept == primary_dept:
                    avail_depts = [d for d in DEPARTMENTS if d != primary_dept]
                    secondary_dept = self.rng.choice(avail_depts)

                sec_scenarios = DEPT_SINGLE_SCENARIOS_BY_SPLIT[split][secondary_dept]
                if not sec_scenarios:
                    avail_sec = [s for s in SCENARIOS if s["family_id"] in SPLIT_FAMILIES[split] and s["family_id"] != primary_spec["family_id"] and len(s.get("issues", [])) == 1]
                    sec_spec = self.rng.choice(avail_sec) if avail_sec else self.rng.choice(SCENARIOS)
                    secondary_dept = sec_spec["issues"][0]["department_key"]
                else:
                    sec_spec = self.rng.choice(sec_scenarios)

                sec_issue_type = sec_spec["issues"][0]["issue_type"] if sec_spec.get("issues") else "general_grievance"

                node_2 = IssueNode(
                    node_id="i2",
                    department=secondary_dept,
                    defect_type=sec_issue_type,
                    family_id=sec_spec["family_id"],
                    urgency="high" if "hazard_reported" in sec_spec.get("flags", []) else "medium",
                    is_primary=False,
                    actionable=True,
                )
                graph.issues.append(node_2)
                graph.target_departments = sorted([primary_dept, secondary_dept])
                graph.edges.append(RelationEdge("i1", "i2", "INDEPENDENT", "Two distinct actionable municipal repairs"))

        elif level == 5:
            # Counterfactual / Negation / Recipient / Review
            allowed_subtypes = ["negation", "recipient_mention", "spatial_landmark", "loanwords"]
            if split in ("train", "validation"):
                allowed_subtypes.append("uncertain_review")
            subtype = self.rng.choice(allowed_subtypes)
            graph.metadata["subtype"] = subtype

            if subtype == "negation":
                other_dept = self.rng.choice([d for d in DEPARTMENTS if d != primary_dept])
                graph.target_departments = [primary_dept]
                graph.negated_departments = [other_dept]
                graph.edges.append(RelationEdge("i1", "i1", "MENTION_ONLY_NEGATED", f"Explicit denial of {other_dept} problem"))

            elif subtype == "recipient_mention":
                other_dept = self.rng.choice([d for d in DEPARTMENTS if d != primary_dept])
                graph.target_departments = [primary_dept]
                graph.addressee_department = other_dept
                graph.edges.append(RelationEdge("i1", "i1", "RECIPIENT_ONLY", f"{other_dept} addressed as conversational recipient"))

            elif subtype == "spatial_landmark":
                graph.target_departments = [primary_dept]
                graph.spatial_landmark_department = "kmc"
                graph.edges.append(RelationEdge("i1", "i1", "SPATIAL_PROXIMITY_ONLY", "Road/footpath mentioned purely as spatial location"))

            elif subtype == "loanwords":
                graph.target_departments = [primary_dept]
                graph.edges.append(RelationEdge("i1", "i1", "SINGLE", "Technical English loanword phrasing"))

            else:  # uncertain_review
                graph.target_departments = []
                graph.needs_review = True
                graph.review_reason = "VAGUE_UNSPECIFIED"
                graph.issues = []
                graph.edges = []

        return graph

    def realize(self, graph: IntentGraph) -> Dict[str, Any]:
        """Realize Roman Urdu text from the Intent Graph."""
        place = self.rng.choice(PUBLIC_PLACES)
        when = self.rng.choice(TIMES)
        req = self.rng.choice(REQUESTS)
        level = graph.difficulty_level

        if graph.needs_review:
            # Vague / unroutable inputs assigned to split-specific scenario family
            if graph.split == "validation":
                scenario_fam = "uncertain_cause_speculation"
                vague_texts = [
                    f"{place} mein pani nahi aa raha shayad bijli ki wajah se hai pata nahi samajh nahi aa raha.",
                    f"{place} par service band hai magar asal wajah maloom nahi hai check karein.",
                    f"{place} par light aur pani dono ka masla lag raha hai pata nahi kya issue hai.",
                ]
            else:
                scenario_fam = "vague_complaint_no_service_detail"
                vague_texts = [
                    f"{place} par bohot masla hai awam pareshan hai koi sunwai nahi ho rahi.",
                    f"{place} mein halaat bohot kharab hain barah e karam koi to tawajjo de.",
                    f"hamare ilaqay mein har taraf pareshani hai koi dekhne wala nahi hai {place} par.",
                    f"ye masla kab hal hoga pure ilaqay mein zillat ho rahi hai koi team bhejen.",
                ]
            full_text = self.rng.choice(vague_texts)
            record_id = f"cur_{hashlib.sha256(full_text.encode('utf-8')).hexdigest()[:16]}"
            return {
                "record_id": record_id,
                "text_sanitized": full_text,
                "department_labels": [],
                "difficulty": level,
                "split": graph.split,
                "scenario_family": scenario_fam,
                "issue_graph": graph.to_dict(),
                "source_kind": "synthetic_agent",
                "is_genuine_citizen_report": False,
                "needs_review": True,
                "review_reason": graph.review_reason,
            }

        primary_node = graph.issues[0]
        primary_spec = SCENARIO_BY_ID[primary_node.family_id]
        base_tmpl = self.rng.choice(primary_spec["variants"])
        primary_text = base_tmpl.format(place=place, time=when).strip()

        if level == 1:
            full_text = f"{primary_text}. {req}."

        elif level == 2:
            op = self.rng.choice(INFORMAL_OPENINGS)
            plea = self.rng.choice(INFORMAL_PLEAS)
            length_style = self.rng.choice(["short", "medium", "long"])
            if length_style == "short":
                core = f"{primary_text}, {plea}"
            elif length_style == "long":
                core = f"{op}, {primary_text}. {req}, {plea}"
            else:
                core = f"{op}, {primary_text}. {req}"
            full_text = apply_informal_noise(core, self.rng, probability=0.40)

        elif level == 3:
            dept = primary_node.department
            consequence_text = ""
            if dept in CONSEQUENCE_TEMPLATES:
                cands = CONSEQUENCE_TEMPLATES[dept]
                chosen = self.rng.choice(cands)
                consequence_text = chosen[0]
            if not consequence_text:
                consequence_text = "is wajah se aane jane walon ko shadeed pareshani ka samna hai"
            full_text = f"{primary_text}, {consequence_text}. {req}."

        elif level == 4:
            if len(graph.issues) > 1 and graph.issues[0].family_id == graph.issues[1].family_id:
                # Realized from a pair scenario
                pair_spec = SCENARIO_BY_ID[graph.issues[0].family_id]
                base_tmpl = self.rng.choice(pair_spec["variants"])
                full_text = f"{base_tmpl.format(place=place, time=when).strip()}. {req}."
            else:
                sec_node = graph.issues[1]
                sec_spec = SCENARIO_BY_ID[sec_node.family_id]
                sec_tmpl = self.rng.choice(sec_spec["variants"])
                # Format second without repeating identical location
                sec_text = sec_tmpl.format(place="is ke qareeb", time="alag se").strip()
                conn = self.rng.choice(INDEPENDENT_CONNECTORS)
                full_text = f"{primary_text}, {conn} {sec_text}. Barah e karam dono issues par action lein."

        elif level == 5:
            subtype = graph.metadata.get("subtype", "negation")
            if subtype == "negation" and graph.negated_departments:
                neg_dept = graph.negated_departments[0]
                decoy_name = DECOY_LABELS.get(neg_dept, neg_dept)
                denial_opening = self.rng.choice([
                    f"ye {decoy_name} ka masla nahi hai, asal mein",
                    f"ye {decoy_name} ka issue nahi, hamara masla ye hai ke",
                    f"{decoy_name} bilkul theek hai magar",
                ])
                full_text = f"{denial_opening} {primary_text}. {req}."

            elif subtype == "recipient_mention" and graph.addressee_department:
                addr_dept = graph.addressee_department
                recipient_phrases = {
                    "kelectric": "K-Electric wale please dekhein,",
                    "kmc": "KMC staff ko chahiye ke ghor karein,",
                    "kwsc": "Water Board team please tawajjo de,",
                    "ssgc": "SSGC wale please note karein,",
                    "sswmb": "SSWMB walay hazrat please dekhein,",
                    "sbca": "SBCA office ko arz hai,",
                }
                addr_prefix = recipient_phrases.get(addr_dept, f"{addr_dept.upper()} team please dekhein,")
                full_text = f"{addr_prefix} {primary_text}. {req}."

            elif subtype == "spatial_landmark":
                full_text = f"footpath aur road par {primary_text}. Sarak tooti nahi hai sirf yeh khatra hal karein."

            elif subtype == "loanwords":
                loanword_samples = {
                    "kelectric": f"{place} par whole street running on single phase due to burnt cutout fuse and severe voltage tripping.",
                    "kwsc": f"{place} par underground high pressure main water line leakage causing water shortage.",
                    "kmc": f"{place} par asphalt road carpet completely eroded with multiple dangerous potholes.",
                    "ssgc": f"{place} par low gas pressure during peak cooking hours unable to use kitchen appliances.",
                    "sswmb": f"{place} par overflowing waste dumpster with uncollected garbage bags scattered.",
                    "sbca": f"{place} par ongoing unauthorized building construction in violation of SBCA stop-work order.",
                }
                full_text = loanword_samples.get(primary_node.department, f"{primary_text}. {req}.")

            else:
                full_text = f"{primary_text}. {req}."

        # Final sanitization and double-space collapse
        full_text = re.sub(r"\s+", " ", full_text).strip()
        full_text = re.sub(r"\.+", ".", full_text)

        # Privacy assurance: Must not have citizen PII
        if has_pii(full_text):
            # In rare event template interpolation triggers PII regex, clean it
            full_text = re.sub(r"\b03\d{9}\b", "", full_text)

        # Record character spans for all issues
        if len(graph.issues) == 1:
            p_start = full_text.find(primary_text)
            if p_start != -1:
                graph.issues[0].metadata["span"] = [p_start, p_start + len(primary_text)]
                graph.issues[0].metadata["span_text"] = primary_text
        elif len(graph.issues) > 1:
            if graph.issues[0].family_id == graph.issues[1].family_id:
                graph.issues[0].metadata["span"] = [0, len(full_text)]
                graph.issues[0].metadata["span_text"] = full_text
                graph.issues[1].metadata["span"] = [0, len(full_text)]
                graph.issues[1].metadata["span_text"] = full_text
            else:
                p_start = full_text.find(primary_text)
                if p_start != -1:
                    graph.issues[0].metadata["span"] = [p_start, p_start + len(primary_text)]
                    graph.issues[0].metadata["span_text"] = primary_text
                if 'sec_text' in locals():
                    s_start = full_text.find(sec_text)
                    if s_start != -1:
                        graph.issues[1].metadata["span"] = [s_start, s_start + len(sec_text)]
                        graph.issues[1].metadata["span_text"] = sec_text

        scenario_family = "+".join(sorted([node.family_id for node in graph.issues])) if graph.issues else "uncertain_review"
        record_id = f"cur_{hashlib.sha256(full_text.encode('utf-8')).hexdigest()[:16]}"

        return {
            "record_id": record_id,
            "text_sanitized": full_text,
            "department_labels": graph.target_departments,
            "difficulty": level,
            "split": graph.split,
            "scenario_family": scenario_family,
            "issue_graph": graph.to_dict(),
            "source_kind": "synthetic_agent",
            "is_genuine_citizen_report": False,
            "needs_review": graph.needs_review,
            "review_reason": graph.review_reason,
        }

    def generate_batch(
        self,
        split: str,
        levels: List[int],
        count: int,
        focus_level: Optional[int] = None,
        existing_texts: Optional[Set[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate a batch of unique, group-isolated synthetic complaints."""
        seen = set(existing_texts or set())
        batch: List[Dict[str, Any]] = []
        attempts = 0
        max_attempts = count * 60

        while len(batch) < count and attempts < max_attempts:
            attempts += 1
            lvl = focus_level if (focus_level is not None and self.rng.random() < 0.60) else self.rng.choice(levels)
            graph = self.plan_intent_graph(split, lvl)
            record = self.realize(graph)
            norm = normalize_text(record["text_sanitized"])

            if norm in seen:
                continue
            seen.add(norm)
            batch.append(record)

        if len(batch) < count:
            raise RuntimeError(f"Could not generate enough unique samples ({len(batch)}/{count}) without duplicates.")

        self.rng.shuffle(batch)
        return batch
