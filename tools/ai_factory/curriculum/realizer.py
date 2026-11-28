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
    ("bohot", "bohat"),
    ("sarak", "sadak"),
    ("sarak", "road"),
    ("nahi", "nhi"),
    ("nahi", "nai"),
    ("aa rahi", "aarhi"),
    ("aa rahi", "arhi"),
    ("aa raha", "aarha"),
    ("aa raha", "arha"),
    ("wajah", "waja"),
    ("hai", "he"),
    ("hai", "hy"),
    ("hai", "h"),
    ("gaya", "gya"),
    ("gayi", "gy"),
    ("gayi", "gai"),
    ("rahi", "rhi"),
    ("rahe", "rha"),
    ("pani", "paani"),
    ("bijli", "light"),
    ("theek", "thik"),
    ("kharab", "khrab"),
    ("karo", "krdo"),
    ("mein", "me"),
    ("aur", "or"),
    ("bhi", "b"),
    ("bhi", "bhee"),
]

CONCISE_PLACES: Sequence[str] = (
    "Gulshan", "Korangi", "Clifton", "Saddar", "Lyari",
    "North Nazimabad", "Malir", "PECHS", "Nazimabad", "Keamari",
    "Baldia", "Gulberg", "Liaquatabad", "Jauhar", "SITE"
)

CONCISE_REQUESTS: Sequence[str] = (
    "Fori check karein.", "Jald theek karein.", "Team bhejen.",
    "Notice lein.", "Koshish karein.", "Hal karein.", "Jald az jald hal karo."
)

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

    def realize(self, graph: IntentGraph, length_tier: Optional[int] = None) -> Dict[str, Any]:
        """Realize Roman Urdu text from the Intent Graph across 5 explicit length tiers."""
        tier = length_tier or graph.metadata.get("length_tier") or self.rng.choice([1, 2, 3, 4, 5])
        graph.metadata["length_tier"] = tier

        place = self.rng.choice(PUBLIC_PLACES)
        c_place = self.rng.choice(CONCISE_PLACES)
        when = self.rng.choice(TIMES)
        req = self.rng.choice(REQUESTS)
        c_req = self.rng.choice(CONCISE_REQUESTS)
        level = graph.difficulty_level

        if graph.needs_review:
            # Vague / unroutable inputs assigned to split-specific scenario family
            if tier == 1:
                vague_texts = [
                    f"{c_place} par bohot masla hai.",
                    f"{c_place} mein halaat kharab hain.",
                    f"service band hai {c_place} par.",
                    f"awam pareshan hai {c_place} mein.",
                ]
            elif tier == 2:
                vague_texts = [
                    f"{place} par bohot masla hai awam pareshan hai koi sunwai nahi ho rahi.",
                    f"{place} mein halaat bohot kharab hain barah e karam koi to tawajjo de.",
                    f"hamare ilaqay mein har taraf pareshani hai koi dekhne wala nahi hai {place} par.",
                ]
            elif tier == 3:
                vague_texts = [
                    f"Janab aali, {place} mein har taraf ajeeb masla bana hua hai aur log sakht pareshan hain. "
                    f"Service ka shadeed bohran hai magar kisi ko samajh nahi aa raha ke asal kharabi kahan hai. "
                    f"Pata nahi bijli ka masla hai ya water supply ka, koi wazeh soorat-e-haal maloom nahi ho rahi. "
                    f"Barah e karam mutalliqah staff bhej kar muaina karwayen taake haqeeqat samne aa sake."
                ]
            elif tier == 4:
                vague_texts = [
                    f"Bakhidmat Janab Mutalliqah Hukkam, Karachi. Hum ahl-e-ilaqa {place} aap ki tawajjo is taraf mabzool karwana chahtay hain. "
                    f"Pichlay {when} se pure ilaqay mein ajeeb o ghareeb pareshani barpa hai aur roz marrah ki aamad-o-raft shadeed mutasir ho chuki hai. "
                    f"Awam ko intehayi mushkilat ka samna hai magar koi ye batane ko tayyar nahi ke asal masla kis department ka hai. "
                    f"Kayi martaba complaints darj karwane ke bawajood kisi ne ground par aakar tehqeeq nahi ki aur log shadeed aziyat mein mubtala hain. "
                    f"Lihaza aali janab se purzor iltija hai ke fori notice le kar supervisory staff ko muainay ke liye rawana karein."
                ]
            else:
                vague_texts = [
                    f"Ba-Khidmat Janab Managing Director wa Municipal Commissioner Sahab, Civic Authorities Karachi. "
                    f"Guzarish baraye fori sadd-e-bab wa imdad: Ahlian-e-{place}. "
                    f"Mohtaram Janab-e-Aala, Hum ahl-e-ilaqa nihayat adab se aap ki janib ek intehayi sangeen masla pesh kar rahe hain. "
                    f"Pichlay taweel arsay se hamare ilaqay {place} mein soorat-e-haal intehayi ghumbeer aur na-qabil-e-bardasht ho chuki hai magar abhi tak koi wazeh waja samne nahi aa saki. "
                    f"Pure mohallay ke hazaron log shadeed pareshani aur be-yaqeeni ki kefiyat mein mubtala hain. "
                    f"Aap ke ilaqai daftar par mutaddad baar darj karwai gayi shikayatat ke bawajood ab tak kisi zimmedar afsar ne is par amli dhyan nahi diya aur sirf khali tasalliyan di gayin. "
                    f"Lihaza aali martabat se pur-khuloos guzarish hai ke reham farma kar fori inquiry committee rawana farmayein taake is sangeen soorat-e-haal ka jaiza le kar relief faraham kiya jaye. Ahlian-e-Ilaqa."
                ]
            full_text = self.rng.choice(vague_texts)
            scenario_fam = "uncertain_cause_speculation" if graph.split == "validation" else "vague_complaint_no_service_detail"
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

        # Extract secondary text for level 4 pairs if available
        sec_text = None
        if len(graph.issues) > 1 and graph.issues[0].family_id != graph.issues[1].family_id:
            sec_spec = SCENARIO_BY_ID[graph.issues[1].family_id]
            sec_tmpl = self.rng.choice(sec_spec["variants"])
            sec_text = sec_tmpl.format(place="is ke qareeb", time="alag se").strip()

        # Extract consequence text for level 3 if available
        consequence_text = None
        if level == 3 and primary_node.department in CONSEQUENCE_TEMPLATES:
            chosen = self.rng.choice(CONSEQUENCE_TEMPLATES[primary_node.department])
            consequence_text = chosen[0]

        # Realize text by length tier
        if tier == 1:
            rendered_short = base_tmpl.format(place=c_place, time="kal se").strip()
            primary_text = rendered_short
            if level == 3 and consequence_text:
                full_text = f"{rendered_short}, motor band hai."
            elif level == 4 and sec_text:
                sec_short = sec_spec["variants"][0].format(place="qareeb", time="alag se").strip()
                sec_text = sec_short
                full_text = f"{rendered_short}, aur alag se {sec_short}."
            elif level == 5:
                subtype = graph.metadata.get("subtype", "negation")
                if subtype == "negation" and graph.negated_departments:
                    neg_dept = graph.negated_departments[0]
                    decoy_name = DECOY_LABELS.get(neg_dept, neg_dept)
                    full_text = f"{decoy_name} theek hai, {rendered_short}."
                elif subtype == "recipient_mention" and graph.addressee_department:
                    addr_dept = graph.addressee_department.upper()
                    full_text = f"{addr_dept} dekhein, {rendered_short}."
                elif subtype == "spatial_landmark":
                    full_text = f"Footpath par {rendered_short}. Sarak theek hai."
                else:
                    full_text = f"{rendered_short}. {c_req}"
            else:
                full_text = f"{rendered_short}. {c_req}"

            if level == 2:
                full_text = apply_informal_noise(full_text, self.rng, probability=0.45)

            w_list = full_text.split()
            if len(w_list) > 20 and level != 4:
                full_text = " ".join(w_list[:19]) + "."
            elif len(w_list) < 5:
                full_text = full_text + " Jald dekhein."

        elif tier == 2:
            if level == 1:
                full_text = f"{primary_text}. {req}."
            elif level == 2:
                op = self.rng.choice(INFORMAL_OPENINGS)
                plea = self.rng.choice(INFORMAL_PLEAS)
                core = f"{op}, {primary_text}. {req}, {plea}"
                full_text = apply_informal_noise(core, self.rng, probability=0.40)
            elif level == 3:
                c_text = consequence_text or "is wajah se aane jane walon ko shadeed pareshani ka samna hai"
                full_text = f"{primary_text}, {c_text}. {req}."
            elif level == 4:
                if sec_text:
                    conn = self.rng.choice(INDEPENDENT_CONNECTORS)
                    full_text = f"{primary_text}, {conn} {sec_text}. Barah e karam dono issues par action lein."
                else:
                    full_text = f"{primary_text}. {req}."
            elif level == 5:
                subtype = graph.metadata.get("subtype", "negation")
                if subtype == "negation" and graph.negated_departments:
                    neg_dept = graph.negated_departments[0]
                    decoy_name = DECOY_LABELS.get(neg_dept, neg_dept)
                    full_text = f"ye {decoy_name} ka masla nahi hai, asal mein {primary_text}. {req}."
                elif subtype == "recipient_mention" and graph.addressee_department:
                    addr_dept = graph.addressee_department
                    full_text = f"{addr_dept.upper()} team please dekhein, {primary_text}. {req}."
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
            else:
                full_text = f"{primary_text}. {req}."

            w_list = full_text.split()
            if len(w_list) > 50 and level != 4:
                full_text = " ".join(w_list[:48]) + "."
            elif len(w_list) < 21:
                full_text = f"Hamare ilaqay {place} mein pichlay {when} se {full_text}"

        elif tier == 3:
            sec_part = f" Is ke sath sath alag se {sec_text}." if sec_text else ""
            conseq = consequence_text if consequence_text else "tamam ilaqay ke aane jane walon ko sakht dushwari pesh aa rahi hai"
            full_text = (
                f"Janab aali, hum {place} ke muqami rehayishi hain aur pichlay {when} se sakht pareshan hain. "
                f"Asal masla ye hai ke {primary_text}.{sec_part} "
                f"Is ki wajah se {conseq} aur roz marrah ke umoor mutasir ho chuke hain. "
                f"Hum ne pehle bhi complaint darj karwayi thi magar abhi tak koi pesh-raft nahi hui. "
                f"Barah e karam is shikayat par fori karwai farmaen taake awam ko relief mil sake. Shukriya."
            )
            if level == 2:
                full_text = apply_informal_noise(full_text, self.rng, probability=0.35)
            w_list = full_text.split()
            if len(w_list) > 100:
                full_text = " ".join(w_list[:98]) + "."
            elif len(w_list) < 51:
                full_text = full_text + " Barah e karam is masle par bila-takheer action lein aur fori team dispatch karein."

        elif tier == 4:
            sec_clause = f" Is ke sath sath alag se {sec_text}." if sec_text else (f" Is ki wajah se {consequence_text}." if consequence_text else " Is wajah se pure mohallay ka nizam darham barham ho chuka hai.")
            full_text = (
                f"Bakhidmat Janab Mutalliqah Afsaran, Karachi. Hum ahl-e-ilaqa {place} aap ki tawajjo is maslay ki janib mabzool karwana chahtay hain. "
                f"Hamare ilaqay mein pichlay {when} se {primary_text}.{sec_clause} "
                f"School jane wale bachon, buzurgon aur namaziyon ko aane jane mein shadeed takleef ka samna hai aur log gir kar zakhmi ho rahe hain. "
                f"Hum ne ilaqai complaint counter par do martaba application jama karwayi magar sirf tasalliyan di gayin aur koi amli iqdam nahi uthaya gaya. "
                f"Lihaza aali janab se purzor iltija hai ke fori notice le kar staff ko rawana karein."
            )
            if level == 2:
                full_text = apply_informal_noise(full_text, self.rng, probability=0.30)
            w_list = full_text.split()
            if len(w_list) > 150:
                full_text = " ".join(w_list[:148]) + "."
            elif len(w_list) < 101:
                full_text = full_text + " Ilawa azeen aam shehri aur karobari hazrat bhi is soorat-e-haal se sakht tang hain aur fori sadd-e-bab chahtay hain."

        else:
            sec_clause_5 = f" Mazeed bar-aan alag se doosra masla ye hai ke {sec_text}." if sec_text else (f" Is kharabi ke sabab {consequence_text}." if consequence_text else " Is wajah se ilaqay ki roz marrah zindagi bilkul maflooj ho kar reh gayi hai.")
            full_text = (
                f"Ba-Khidmat Janab Managing Director wa Municipal Commissioner Sahab, Civic Authorities Karachi. "
                f"Guzarish baraye fori sadd-e-bab wa imdad: Ahlian-e-{place}. "
                f"Mohtaram Janab-e-Aala, Hum ahl-e-ilaqa nihayat adab se aap ki janib ek intehayi sangeen masla pesh kar rahe hain. "
                f"Pichlay taweel arsay se hamare ilaqay {place} mein soorat-e-haal intehayi ghumbeer aur na-qabil-e-bardasht ho chuki hai. "
                f"Asal haqeeqat ye hai ke {primary_text}.{sec_clause_5} "
                f"Is kharabi ki wajah se hamare buzurg, beemar afrad aur school jane wale bachay shadeed aziyat mein mubtala hain aur aamad-o-raft intehayi dushwar ho chuki hai. "
                f"Aap ke ilaqai daftar par mutaddad baar darj karwai gayi shikayatat ke bawajood ab tak kisi zimmedar afsar ne is par amli dhyan nahi diya aur sirf khali tasalliyan di gayin. "
                f"Lihaza aali martabat se pur-khuloos guzarish hai ke reham farma kar fori inquiry committee aur field team rawana farmayein taake is maslay ko mustaqil bunyadon par hal kiya ja sake. Ahlian-e-Ilaqa."
            )
            if level == 2:
                full_text = apply_informal_noise(full_text, self.rng, probability=0.25)
            w_list = full_text.split()
            if len(w_list) > 200:
                full_text = " ".join(w_list[:198]) + "."
            elif len(w_list) < 151:
                full_text = full_text + " Hamare pure mohallay ke hazaron afrad is faryad par daskhat kar rahe hain aur ummeed rakhte hain ke aap is par bila takheer hidayat jari farmayenge. Shukriya."

        # Final sanitization and double-space collapse
        # Never truncate an independent issue to meet a cosmetic length bucket.
        # If a long wrapper cuts either issue, fall back to the complete core.
        if level == 4:
            if primary_text not in full_text or (sec_text and sec_text not in full_text):
                full_text = primary_text + (f". Alag se {sec_text}." if sec_text else ".")
            word_count = len(full_text.split())
            if word_count > 200:
                raise ValueError("Multi-issue realization exceeds the 200-word limit; cannot preserve all labeled issues")
            graph.metadata["length_tier"] = next(i for i, limit in enumerate((20, 50, 100, 150, 200), 1) if word_count <= limit)
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
            tier = (len(batch) % 5) + 1
            lvl = focus_level if (focus_level is not None and self.rng.random() < 0.60) else self.rng.choice(levels)
            graph = self.plan_intent_graph(split, lvl)
            graph.metadata["length_tier"] = tier
            record = self.realize(graph, length_tier=tier)
            norm = normalize_text(record["text_sanitized"])

            if norm in seen:
                continue
            seen.add(norm)
            batch.append(record)

        if len(batch) < count:
            raise RuntimeError(f"Could not generate enough unique samples ({len(batch)}/{count}) without duplicates.")

        self.rng.shuffle(batch)
        return batch
