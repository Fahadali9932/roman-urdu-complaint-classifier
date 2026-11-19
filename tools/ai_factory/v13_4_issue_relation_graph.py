#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.4 Python Typed Issue Relation Graph & Grounding Engine
Full 1:1 parity with TypeScript src/services/v13_4/issueRelationGraph.ts.
Academic Stakeholder: Fahad (Greenwich University)
Zero budget, zero paid APIs, deterministic cryptographic provenance.
"""

import re
from typing import List, Dict, Any, Set, Optional, Tuple
from tools.ai_factory.v13_2_normalizer import normalize_roman_urdu_v13_2

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

CAUSAL_CONNECTORS = [
    re.compile(r"\b(?:jis|is|us|iski|uski|iski\s+bhi)\s*(?:ki\s+)?(?:wajah|waja|bais|sabab)\s*(?:se|say)?\b", re.I),
    re.compile(r"\b(?:is\s*liye|isi\s*liye|is\s*leye|isi\s*leye)\b", re.I),
    re.compile(r"\b(?:jis\s+se|is\s+se|us\s+se|jissay|issay)\b", re.I),
    re.compile(r"\b(?:ke\s+natijay\s+mein|k\s+natijay\s+main|nateejay\s+mein)\b", re.I),
    re.compile(r"\b(?:ke\s+sabab|k\s+sabab|ke\s+bais|k\s+bais)\b", re.I),
    re.compile(r"\b(?:tab\s+se|jab\s+se|tabhi\s+se)\b", re.I),
    re.compile(r"\b(?:kyun\s*ke|kyon\s*ke|kyunkay|qunke)\b", re.I),
    re.compile(r"\bjis\s*(?:ke|k)\s*(?:paani|pani)\s*(?:se|say)\b", re.I),
    re.compile(r"\b(?:pani\s+ke\s+bais|pani\s+bharne\s+ki\s+waja\s+se)\b", re.I),
]

NEGATION_PATTERNS = [
    {"dept": "kelectric", "pattern": re.compile(r"\b(?:bijli|light|electric|current|transformer|taar)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bbijli\s+(?:bilkul\s+)?theek\s+hai\b|\btaar\s+(?:se\s+)?khatra\s+nahi\b|\blight\s+(?:aa\s+rahi\s+hai|theek\s+hai)\b", re.I), "explanation": "Citizen explicitly affirmed K-Electric electricity / lighting is defect-free"},
    {"dept": "kwsc", "pattern": re.compile(r"\b(?:pani|sewerage|gutter|water\s*supply|line)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bpani\s+(?:bilkul\s+)?theek\s+hai\b|\bpaani\s+ara\s+hai\b|\bgutter\s+(?:saaf\s+hai|band\s+nahi)\b", re.I), "explanation": "Citizen explicitly affirmed KWSC water supply / drainage is defect-free"},
    {"dept": "kmc", "pattern": re.compile(r"\b(?:sarak|road|sadak|gali|footpath|street\s*light)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\broad\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+khadda\s+nahi\b|\bsarak\s+bani\s+hui\s+hai\b", re.I), "explanation": "Citizen explicitly affirmed KMC road infrastructure is defect-free"},
    {"dept": "ssgc", "pattern": re.compile(r"\b(?:gas|sui\s*gas|chulha)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bgas\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+gas\s+leak\s+nahi\b|\bgas\s+aa\s+rahi\s+hai\b", re.I), "explanation": "Citizen explicitly affirmed SSGC gas supply is defect-free"},
    {"dept": "sswmb", "pattern": re.compile(r"\b(?:kachra|kooda|safai)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bsafai\s+(?:bilkul\s+)?theek\s+hai\b|\bkachra\s+nahi\s+hai\b|\bkachra\s+uth\s+gaya\b", re.I), "explanation": "Citizen explicitly affirmed SSWMB sanitation is defect-free"},
    {"dept": "sbca", "pattern": re.compile(r"\b(?:building|construction|imarat)\s+(?:ka\s+)?(?:koi\s+)?(?:masla|issue|shikayat|problem)\s+(?:bilkul\s+|to\s+)?(?:nahi|ni)\b|\bbuilding\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+illegal\s+kaam\s+nahi\b", re.I), "explanation": "Citizen explicitly affirmed SBCA building construction is defect-free"},
]

HISTORICAL_PATTERNS = [
    re.compile(r"\b(?:pehle|guzishta\s+(?:hafte|maah|saal)|pichle\s+(?:hafte|maah|mahine)|sabqa)\b.*?\b(?:theek|hal|solve|repair|safai)\s+(?:kar\s+di|ho\s+chuki|ho\s+gaya|tha|thi)\b", re.I),
    re.compile(r"\b(?:theek|repair|safai)\s+to\s+(?:kar\s+di|ho\s+chuki|ho\s+gayi)\s+thi\b", re.I),
    re.compile(r"\bmasla\s+pehle\s+tha\s+ab\s+theek\s+hai\b", re.I),
]

LOCATION_ANCHOR_PATTERNS = [
    re.compile(r"\b(?:road|sarak|sadak|rod|gali|footpath|chowrangi|chowk)\s+(?:par|pe|mein|me|ke\s+kinare|ke\s+samne|ke\s+beech)\s+(?:kachra|kooda|gutter|pani|taar|gas|wire|dher|khamba|pole|meter|dustbin|kundi)\b", re.I),
    re.compile(r"\b(?:kachra|kooda|gutter|pani|taar|wire|khamba|pole|gas\s*leak|dustbin|kundi)\s+(?:road|sarak|sadak|rod|gali|footpath|chowrangi|chowk)\s+(?:par|pe|mein)\s+(?:beh|para|gir|ubal|latak|phail|leak|bikhra)\b", re.I),
    re.compile(r"\b(?:sth\s+wali|saath\s+wali|hamari)\s+(?:rod|road|gali|sarak)\s+(?:pe|par)\s+(?:khambay|taar|pole|wire|kachra|gas)\b", re.I),
]

ROAD_STRUCTURAL_DEFECT_REGEX = re.compile(
    r"\b(?:road|roads|sarak|sadak|rod|street|gali|asphalt|footpath|underpass|flyover|bridge|pavement|expressway)\b[^\.\,\;]{0,35}\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|toot\s*phoot|tut\s*phut|khadda|khadday|khadde|gaddha|crater|pothole|potholes|dhans|damaged|asphalt\s*ukhad|surfacing\s*utar|malba\s*para)\b|\b(?:toot|toota|tooti|toote|tut|tuta|tuti|tute|khadda|khadday|khadde|crater|pothole|potholes|dhans|damaged|asphalt\s*ukhad|surfacing\s*utar|malba\s*para)\b[^\.\,\;]{0,35}\b(?:road|roads|sarak|sadak|rod|street|gali|asphalt|footpath|underpass|flyover|bridge|pavement|expressway)\b",
    re.I
)

STRICT_DEPARTMENT_LEXICONS = {
    "kelectric": {
        "assets": [
            re.compile(r"\b(?:bijli|light|electricity|power|transformer|transformar|tranforma|feeder|voltage|load\s*shedding|khamba|pole|taar|wire|wires|cable|k-electric|k\s+electric|kelectric|k\.e\.)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:nahi\s+aa\s+rahi|nahi\s+arhi|chali\s+gayi|chali\s+gai|gul(?:\s+ho\s+gayi)?|band(?:\s+hai)?|outage|power\s+cut|feeder\s+tripping|tripping|trip\s+ho\s+raha|low\s+voltage|voltage\s+kam|high\s+voltage|dim\s+light)\b", re.I),
            re.compile(r"\b(?:blast|dhamaka|phat\s+gaya|phata|chingari|sparking|current|jal\s+gaya|jal\s+gya|jal\s+gai|smoke|dhuwan|dhamakay)\b", re.I),
            re.compile(r"\b(?:toot\s+gayi|toot\s+kar\s+gir|gir\s+gaya|latak\s+rahi|nange\s+taar|jhool\s+rahe|dangerous\s+wire|hanging\s+wire)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:load\s*shedding|feeder\s+tripping|transformer\s+blast|transformer\s+phat|transformer\s+jal|nange\s+taar|current\s+lagne|bijli\s+band|light\s+gayab)\b", re.I),
        ],
    },
    "kwsc": {
        "assets": [
            re.compile(r"\b(?:pani|paani|water|sewerage|sewer|gutter|manhole|dhakkan|water\s*board|kw&sc|kwsb|tanker|main\s*line|drinking\s*water|peenay\s*ka\s*pani|line\s*burst)\b", re.I),
            re.compile(r"\b(?:pani|water|sewer|gutter)\s*(?:ki\s+)?(?:pipe|pipeline|line)\b", re.I),
            re.compile(r"\b(?:motor|pump)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:nahi\s+aa\s+raha|nahi\s+ara|nahi\s+araha|band\s+hai|sookha|sookhi|qillat|supply\s+band|peenay\s+ka\s+pani\s+band|water\s+crisis)\b", re.I),
            re.compile(r"\b(?:leak|leek|burst|phat\s+gayi|phat\s+gai|phati|overflow|ubal\s+raha|ubal\s+rahi|choke|block|ganda\s+pani|badboo|badbu|sewerage\s+ka\s+pani|gandagi)\b", re.I),
            re.compile(r"\b(?:dhakkan\s+gayab|khula\s+manhole|open\s+manhole|dhakkan\s+toota|gutter\s+ka\s+dhakkan\s+gayab|motor\s+nahi\s+chal)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:gutter\s+ubal|sewerage\s+overflow|dhakkan\s+gayab|main\s+line\s+phat|pani\s+band|water\s+supply\s+line\s+burst|open\s+manhole)\b", re.I),
        ],
        "excludeIfPresent": re.compile(r"\b(?:gas\s+pipeline|gas\s+line|sui\s*gas)\b", re.I),
    },
    "kmc": {
        "assets": [
            re.compile(r"\b(?:road|roads|sarak|sadak|rod|street|gali|footpath|foot\s*path|bridge|pul|flyover|underpass|street\s*light|street\s*lights|bulb|chowrangi|pavement|asphalt)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:toot\s*(?:gayi|gaya|gai|gya)?|toota|tooti|toote|tut\s*(?:gayi|gaya|gai|gya)?|tuta|tuti|tute|toot\s*phoot|tut\s*phut)\b", re.I),
            re.compile(r"\b(?:khadda|khadday|khadde|gaddha|crater|craters|pothole|potholes|dhans\s*(?:gayi|gai)?|dhas|damaged|kharab\s*sarak)\b", re.I),
            re.compile(r"\b(?:fuse|fuses|nahi\s+jal\s+rahi|andhera|bulb\s+kharab|lights\s+band)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:gehre\s+khadday|potholes?|tooti\s*sarak|road\s*toot|sadak\s*kharab|street\s*lights?\s*fuse)\b", re.I),
        ],
    },
    "ssgc": {
        "assets": [
            re.compile(r"\b(?:gas|sui\s*gas|gas\s*pipeline|gas\s*line|chulha|chulhay|stove|gas\s*meter|ssgc)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:nahi\s+aa\s+rahi|nahi\s+ara|band\s+hai|low\s+pressure|pressure\s+kam|zero\s+pressure|leak|leek|boodar|badboo|smell|gas\s*boo|chulha\s+nahi\s+jal|khana\s+nahi\s+pak|dhamaka|excavation|khudai|khoda|khodi|hiss|nikal\s*rahi|damage)\b", re.I),
            re.compile(r"\b(?:gas\s+outage|methane|gas\s+leak|gas\s+smell)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:gas\s+leak|gas\s+band|gas\s+nahi\s+aa\s+rahi|zero\s+pressure|gas\s+pressure\s+kam|chulha\s+thanda|gas\s+line\s+phat|sui\s*gas)\b", re.I),
        ],
        "excludeIfPresent": re.compile(r"\b(?:peenay\s+ka\s+pani|pani\s+ki\s+line|water\s+board|drainage|gutter|sewer)\b", re.I),
    },
    "sswmb": {
        "assets": [
            re.compile(r"\b(?:kachra|kachray|kachre|kooda|kooday|koode|safai|dustbin|dumpster|dumper|kundi|kachra\s*kundi|sweeper|solid\s*waste|sswmb)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:dher|dhaer|ambar|nahi\s+uthaya|bikhra|gandagi|badboo|sad\s+raha|safai\s+nahi|kooda\s+uthao|kachra\s+gaari\s+nahi|para\s+hai|para\s+he|parha\s+hai|jama\s+hai|phaila|overflow|gir\s+gaya)\b", re.I),
            re.compile(r"\b(?:garbage\s+pile|uncollected|waste\s+accumulation|trash\s+dump)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:kachray\s+ka\s+dher|kooday\s+ke\s+dher|kachra\s+nahi\s+uthaya|safai\s+nahi\s+ho\s+rahi|kachra\s+para|kachra\s+kundi)\b", re.I),
        ],
    },
    "sbca": {
        "assets": [
            re.compile(r"\b(?:building|buildings|imarat|imaraten|plaza|plazas|makan|chhat|deewar|pillar|pillars|beam|plinth|construction|builder|commercial\s+tameer|plot|manzil|floor|sbca)\b", re.I),
        ],
        "defects": [
            re.compile(r"\b(?:illegal|ghair\s+qanooni|bina\s+permit|bina\s+noc|extra\s+floor|manzila|crack|cracks|daraar|girne\s+wali|substandard|collapse|demolition|ghairqanooni|baghair\s+noc|baghair\s+naqsha|baith\s*rahi|gir\s*sakti|toot)\b", re.I),
            re.compile(r"\b(?:unauthorized\s+construction|pillars?\s+mein\s+crack|dangerous\s+building)\b", re.I),
        ],
        "standaloneDefects": [
            re.compile(r"\b(?:ghair\s+qanooni\s+building|illegal\s+construction|pillars?\s+mein\s+daraar|building\s+girne\s+wali|baghair\s+noc|bina\s+noc|extra\s+chhati\s+manzil)\b", re.I),
        ],
    },
}


def segment_discourse_clauses(text: str) -> List[str]:
    clean = re.sub(r"([.?!;\n]+)", r" \1 ", text)
    clean = re.sub(
        r"\b(aur\s+alag\s+se|aur\s+doosra\s+masla|aur\s+mazeed\s+yeh\s+ke|aur\s+sath\s+hi\s+sath|doosri\s+taraf|doosri\s+gali\s+mein|saath\s+wali|aur\s+pichlay|jis\s+ki\s+wajah\s+se|us\s+ki\s+wajah\s+se|is\s+wajah\s+se|isi\s+liye|ke\s+sabab|ke\s+natijay\s+mein|jis\s+se|is\s+se|lekin\s+ab|magar\s+ab|jabke|halanke|jis\s+k?e?\s*pa?ani\s+se)\b",
        r". \1",
        clean,
        flags=re.I,
    )
    raw_segments = [s.strip() for s in re.split(r"[.?!;\n]+", clean) if len(s.strip()) > 5]
    final_segments = []

    for seg in raw_segments:
        aur_parts = re.split(r"\baur\b", seg, flags=re.I)
        if len(aur_parts) <= 1:
            final_segments.append(seg)
        else:
            current_sub = aur_parts[0].strip()
            for i in range(1, len(aur_parts)):
                next_part = aur_parts[i].strip()
                if re.search(r"\b(?:rod|road|sarak|sadak|gali|bijli|light|pani|gutter|sewer|gas|sui\s*gas|kachra|kooda|building|imarat|taar|transformer)\b", next_part, re.I):
                    final_segments.append(current_sub)
                    current_sub = next_part
                else:
                    current_sub += " aur " + next_part
            if current_sub:
                final_segments.append(current_sub)

    return [s for s in final_segments if len(s.strip()) > 0]


def build_issue_relation_graph(raw_text: str) -> Dict[str, Any]:
    normalized_text = normalize_roman_urdu_v13_2(raw_text)
    clauses = segment_discourse_clauses(normalized_text)

    issues: List[Dict[str, Any]] = []
    actionable_depts: Set[str] = set()
    suppressed_depts: Set[str] = set()
    location_only_depts: Set[str] = set()
    causal_chains: List[Dict[str, Any]] = []

    negated_depts = {}
    for item in NEGATION_PATTERNS:
        if item["pattern"].search(normalized_text):
            negated_depts[item["dept"]] = item["explanation"]

    historical_depts = set()
    for pattern in HISTORICAL_PATTERNS:
        match = pattern.search(normalized_text)
        if match:
            m_text = match.group(0)
            for dept, lex in STRICT_DEPARTMENT_LEXICONS.items():
                if any(p.search(m_text) for p in lex["assets"]):
                    historical_depts.add(dept)

    counter = 1

    for clause in clauses:
        for dept, lex in STRICT_DEPARTMENT_LEXICONS.items():
            if "excludeIfPresent" in lex and lex["excludeIfPresent"].search(clause):
                continue

            has_asset = any(p.search(clause) for p in lex["assets"])
            has_defect = any(p.search(clause) for p in lex["defects"])
            has_standalone = any(p.search(clause) for p in lex["standaloneDefects"])

            if (has_asset and has_defect) or has_standalone:
                relationship = "INDEPENDENT"
                routing_decision = "ROUTED"
                reason = f"Affirmative independent defect for {dept.upper()}"
                is_actionable = True

                if dept in negated_depts:
                    relationship = "NEGATED"
                    routing_decision = "SUPPRESSED_NEGATION"
                    reason = negated_depts[dept]
                    is_actionable = False
                elif dept in historical_depts:
                    relationship = "RESOLVED_OR_HISTORICAL"
                    routing_decision = "SUPPRESSED_HISTORICAL"
                    reason = "Historical repair; not an active actionable defect"
                    is_actionable = False
                elif dept == "kmc":
                    has_road_specific = bool(ROAD_STRUCTURAL_DEFECT_REGEX.search(clause))
                    has_light_defect = bool(re.search(r"\b(?:street\s*lights?|gali\s*light|sarak\s*ki\s*light|batti|battiyan)\b[^\.\,\;]{0,25}\b(?:fuse|fuses|nahi\s+jal|andhera)\b", clause, re.I))
                    is_compromised = bool(re.search(r"\b(?:kooda\s*daan|dustbin|kundi|taar|wire|khamba|pole|pillar|beam)\b[^\.\,\;]{0,25}\b(?:toot|tut|gir)\b", clause, re.I))

                    if not has_road_specific and not has_light_defect:
                        relationship = "ASSET_LOCATION_ONLY"
                        routing_decision = "SUPPRESSED_LOCATION"
                        reason = "Road / street mentioned solely as spatial location anchor"
                        is_actionable = False
                    elif is_compromised and not ROAD_STRUCTURAL_DEFECT_REGEX.search(re.sub(r"\b(?:kooda\s*daan|dustbin|kundi|taar|wire|khamba|pole)\s+(?:toot|tut|gir)\w*\b", "", clause, flags=re.I)):
                        relationship = "ASSET_LOCATION_ONLY"
                        routing_decision = "SUPPRESSED_LOCATION"
                        reason = "Road mentioned as location of damaged dumpster/wire"
                        is_actionable = False

                if dept == "kwsc" and re.search(r"\b(?:water\s*pump|pani\s*ki\s*motor|water\s*motor|motor)\b", clause, re.I):
                    has_outage = bool(re.search(r"\b(?:bijli|light|transformer|feeder|tripping|voltage)\b", normalized_text, re.I))
                    has_water_board = bool(re.search(r"\b(?:main\s*line|line\s*burst|water\s*board|peenay\s*ka\s*pani|sewerage|gutter)\b", clause, re.I))
                    if has_outage and not has_water_board:
                        relationship = "CONSEQUENCE_OF"
                        routing_decision = "SUPPRESSED_CONSEQUENCE"
                        reason = "Domestic water motor failure is secondary symptom of power outage"
                        is_actionable = False

                if dept == "sswmb" and re.search(r"\b(?:kichar|keechad|mud)\b", clause, re.I):
                    has_broken_road = bool(re.search(r"\b(?:road|sarak|sadak|gali|rod)\b", normalized_text, re.I)) and bool(re.search(r"\b(?:toot|tut|khadda|barish)\b", normalized_text, re.I))
                    has_waste = bool(re.search(r"\b(?:kachra|kooda|dustbin|dumpster|kundi)\b", clause, re.I))
                    if has_broken_road and not has_waste:
                        relationship = "CONSEQUENCE_OF"
                        routing_decision = "SUPPRESSED_CONSEQUENCE"
                        reason = "Mud / kichar is contextual weather consequence of damaged road"
                        is_actionable = False

                issues.append({
                    "id": f"iss_{counter}",
                    "department": dept,
                    "raw_span": clause,
                    "normalized_span": clause,
                    "relationship": relationship,
                    "is_actionable": is_actionable,
                    "routing_decision": routing_decision,
                    "reason": reason,
                })
                counter += 1

    for dept, exp in negated_depts.items():
        if not any(iss["department"] == dept for iss in issues):
            issues.append({
                "id": f"iss_{counter}",
                "department": dept,
                "raw_span": normalized_text,
                "normalized_span": normalized_text,
                "relationship": "NEGATED",
                "is_actionable": False,
                "routing_decision": "SUPPRESSED_NEGATION",
                "reason": exp,
            })
            counter += 1

    for dept in historical_depts:
        if not any(iss["department"] == dept for iss in issues):
            issues.append({
                "id": f"iss_{counter}",
                "department": dept,
                "raw_span": normalized_text,
                "normalized_span": normalized_text,
                "relationship": "RESOLVED_OR_HISTORICAL",
                "is_actionable": False,
                "routing_decision": "SUPPRESSED_HISTORICAL",
                "reason": "Historical repair; not an active actionable defect",
            })
            counter += 1

    # Cross-Issue Causal Consequence Linking
    for i in range(len(issues)):
        root = issues[i]
        if root["relationship"] != "INDEPENDENT":
            continue

        for j in range(len(issues)):
            if i == j:
                continue
            target = issues[j]
            if target["department"] == root["department"]:
                continue
            if target["relationship"] != "INDEPENDENT":
                continue

            combined = f"{root['normalized_span']} {target['normalized_span']}"
            connector_match = None
            for p in CAUSAL_CONNECTORS:
                if p.search(target["normalized_span"]) or p.search(combined) or p.search(normalized_text):
                    connector_match = p.pattern
                    break

            is_causal_pair = False
            explanation = ""

            # 1. KWSC Water Main Burst / Gutter Overflow -> KMC Road Damage
            if root["department"] == "kwsc" and target["department"] == "kmc":
                root_has_leak = bool(re.search(r"\b(?:line|pipe|burst|phat|leak|gutter|sewer|overflow|ubal|pani)\b", root["normalized_span"], re.I))
                target_has_road = bool(re.search(r"\b(?:road|sarak|sadak|gali|asphalt|khadda|toot|tut)\b", target["normalized_span"], re.I))
                has_water_road = connector_match or bool(re.search(r"\b(?:jis\s*(?:ke|k)\s*(?:paani|pani)\s*(?:se|say)|gutter\s*ka\s*pani\s*ubalne\s*ki\s*wajah\s*se|drainage\s*block\s*hone\s*se)\b", normalized_text, re.I))
                if root_has_leak and target_has_road and has_water_road:
                    is_causal_pair = True
                    explanation = "KWSC water main burst / sewer overflow caused downstream KMC road erosion"

            # 2. SSGC Digging -> KMC Road Pothole / Trench
            elif root["department"] == "ssgc" and target["department"] == "kmc":
                root_has_dig = bool(re.search(r"\b(?:khod\w*|khudai|excavation|repair\s*ke\s*liye|pipeline|pipe\s*line)\b", root["normalized_span"], re.I))
                target_has_road = bool(re.search(r"\b(?:road|sarak|sadak|gali|khadda|khadday|tooti|toota)\b", target["normalized_span"], re.I))
                if root_has_dig and target_has_road and (connector_match or re.search(r"\b(?:khod\w*|khudai|chor\s*kar)\b", normalized_text, re.I)):
                    is_causal_pair = True
                    explanation = "SSGC utility excavation trench left road broken; responsibility belongs to SSGC"

            # 3. K-Electric Outage -> KWSC Domestic Water Pump Stoppage
            elif root["department"] == "kelectric" and target["department"] == "kwsc":
                root_has_outage = bool(re.search(r"\b(?:bijli|light|feeder|power|transformer|trip|band)\b", root["normalized_span"], re.I))
                target_has_pump = bool(re.search(r"\b(?:pump|motor|pani\s*nahi\s*bhara|pani\s*band)\b", target["normalized_span"], re.I))
                has_water_board = bool(re.search(r"\b(?:water\s*board|line\s*burst|main\s*line|meetha\s*pani)\b", target["normalized_span"], re.I))
                if root_has_outage and target_has_pump and not has_water_board:
                    is_causal_pair = True
                    explanation = "K-Electric power outage caused domestic water motor to stop"

            # 4. SSWMB Garbage Pile -> KWSC Drain / Gutter Choke
            elif root["department"] == "sswmb" and target["department"] == "kwsc":
                root_has_garbage = bool(re.search(r"\b(?:kachra|kachray|kooda|dher|malba)\b", root["normalized_span"], re.I))
                target_has_choke = bool(re.search(r"\b(?:drain|gutter|sewer|choke|block|manhole)\b", target["normalized_span"], re.I))
                if root_has_garbage and target_has_choke and (connector_match or re.search(r"\b(?:drain\s*ke\s*uper|sewer\s*line\s*mein)\b", normalized_text, re.I)):
                    is_causal_pair = True
                    explanation = "SSWMB solid waste dump caused drainage / sewer line blockage"

            if is_causal_pair:
                target["relationship"] = "CONSEQUENCE_OF"
                target["is_actionable"] = False
                target["routing_decision"] = "SUPPRESSED_CONSEQUENCE"
                target["reason"] = explanation
                root["relationship"] = "CAUSES"

                causal_chains.append({
                    "root_dept": root["department"],
                    "consequence_dept": target["department"],
                    "explanation": explanation,
                })

    for iss in issues:
        if iss["is_actionable"]:
            actionable_depts.add(iss["department"])
        else:
            suppressed_depts.add(iss["department"])
            if iss["relationship"] == "ASSET_LOCATION_ONLY":
                location_only_depts.add(iss["department"])

    return {
        "issues": issues,
        "actionable_departments": sorted(list(actionable_depts)),
        "suppressed_departments": sorted(list(suppressed_depts)),
        "location_only_departments": sorted(list(location_only_depts)),
        "causal_chains": causal_chains,
    }
