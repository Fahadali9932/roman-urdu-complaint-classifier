#!/usr/bin/env python3
"""
AWAAZ-E-AWAM — Phase V13.2 Python Issue Extractor (Parity with TypeScript)
"""

import re
from typing import List, Dict, Any, Set, Tuple
from tools.ai_factory.v13_2_normalizer import normalize_roman_urdu_v13_2

DEPARTMENT_LEXICONS = {
    "kelectric": {
        "assets": [r"\b(?:bijli|light|electric|electricity|power|transformer|khamba|pole|taar|wire|wires|cable|feeder|voltage|meter|phase)\b"],
        "defects": [
            r"\b(?:nahi\s+aa\s+rahi|chali\s+gayi|chali\s+gai|gul(?:\s+ho\s+gayi)?|band(?:\s+hai)?|toot\s+gayi|gir\s+gaya|blast|phat\s+gaya|phata|dhamaka|chingari|sparking|current|trip|low\s+voltage|load\s*shedding|kharab|jhool\s+rahe|nange\s+taar|jal\s+gaya|jal\s+gya|jal\s+gai|andhera)\b",
            r"\b(?:tripping|outage|power\s+cut|feeder\s+down)\b"
        ],
        "standalone": [r"\b(?:load\s*shedding|feeder\s+tripping|transformer\s+blast|transformer\s+phat|transformer\s+jal|nange\s+taar|current\s+lagne)\b"]
    },
    "kwsc": {
        "assets": [
            r"\b(?:pani|water|supply|gutter|sewerage|sewer|manhole|dhakkan|tanker|motor|water\s*board|nal|nullah|main\s+line)\b",
            r"\b(?:pani|water|sewer|gutter)\s*(?:ki\s+)?(?:pipe|pipeline|line)\b"
        ],
        "defects": [
            r"\b(?:nahi\s+aa\s+raha|nahi\s+aa\s+rahi|band\s+hai|sookhi|sookha|leak|burst|phat|phati|choke|overflow|ubal|ubalta|ganda\s+pani|badboo|dhakkan\s+gayab|kharab|line\s+leakage|motor\s+nahi\s+chal)\b",
            r"\b(?:sewer\s+overflow|drainage\s+block|contaminated|peenay\s+ka\s+pani\s+band)\b"
        ],
        "standalone": [r"\b(?:gutter\s+ubal|sewerage\s+overflow|dhakkan\s+gayab|main\s+line\s+phat|pani\s+band|water\s+supply\s+line\s+burst)\b"]
    },
    "kmc": {
        "assets": [r"\b(?:road|sarak|footpath|bridge|pul|flyover|underpass|street\s*light|bulb|chowrangi|pavement)\b"],
        "defects": [
            r"\b(?:toot\s+gayi|toot\s+gaya|tooti|kharab|khadda|khadday|gaddha|crater|dhans\s+gayi|dhas|pothole|asphalt|tameer\s+adhoori|malba\s+para|bulb\s+fuse|andhera)\b",
            r"\b(?:toota\s+phoota|tooti\s+phooti|gehre\s+khadday|road\s+damage)\b"
        ],
        "standalone": [r"\b(?:road\s+toot|sarak\s+tooti|gehre\s+khadday|street\s+lights?\s+band|potholes?)\b"]
    },
    "ssgc": {
        "assets": [r"\b(?:gas|sui\s*gas|pipeline|line|chulha|cylinder|gas\s*meter|flame|meter)\b"],
        "defects": [
            r"\b(?:nahi\s+aa\s+rahi|band\s+hai|low\s+pressure|pressure\s+kam|zero\s+pressure|leak|leek|boodar|badboo|smell|chulha\s+nahi\s+jal|khana\s+nahi\s+pak|dhamaka)\b",
            r"\b(?:gas\s+outage|methane|gas\s+boo)\b"
        ],
        "standalone": [r"\b(?:gas\s+leak|gas\s+band|zero\s+pressure|gas\s+pressure\s+kam|chulha\s+thanda|gas\s+line\s+phat)\b"]
    },
    "sswmb": {
        "assets": [r"\b(?:kachra|kooda|safai|dustbin|dumpster|dumper|kundi|sweeper|malba|kachra\s*kundi)\b"],
        "defects": [
            r"\b(?:dher|dhaer|ambar|nahi\s+uthaya|bikhra|gandagi|badboo|sad\s+raha|safai\s+nahi|kooda\s+uthao|kachra\s+gaari\s+nahi|para\s+hai|para\s+he|parha\s+hai|jama\s+hai|phaila)\b",
            r"\b(?:garbage\s+pile|uncollected|waste\s+accumulation)\b"
        ],
        "standalone": [r"\b(?:kachray\s+ka\s+dher|kooday\s+ke\s+dher|kachra\s+nahi\s+uthaya|safai\s+nahi\s+ho\s+rahi|kachra\s+para)\b"]
    },
    "sbca": {
        "assets": [r"\b(?:building|imarat|plaza|makan|chhat|deewar|pillar|construction|builder|commercial\s+tameer|plot|manzil|floor)\b"],
        "defects": [
            r"\b(?:illegal|ghair\s+qanooni|bina\s+permit|bina\s+noc|extra\s+floor|manzila|crack|daraar|girne\s+wali|substandard|collapse|demolition|ghairqanooni|baghair\s+noc)\b",
            r"\b(?:unauthorized\s+construction|pillars?\s+mein\s+crack|dangerous\s+building)\b"
        ],
        "standalone": [r"\b(?:ghair\s+qanooni\s+building|illegal\s+construction|pillars?\s+mein\s+daraar|building\s+girne\s+wali|baghair\s+noc|bina\s+noc|extra\s+chhati\s+manzil)\b"]
    }
}

CAUSAL_CONNECTORS = [
    r"\b(?:jis|us|is)\s+ki\s+wajah\s+se\b",
    r"\b(?:jis|us|is)\s+wajah\s+se\b",
    r"\bisi\s+liye(?:\s+ke)?\b",
    r"\bke\s+sabab\b",
    r"\bke\s+natijay\s+mein\b",
    r"\bke\s+bais\b",
    r"\bjis\s+se\b",
    r"\bki\s+wajah\s+ban\s+raha\b"
]

HISTORICAL_PATTERNS = [
    r"\b(?:pehle|guzishta\s+(?:hafte|maah|saal)|pichle\s+(?:hafte|maah)|sabqa)\b.*?\b(?:theek|hal|solve|repair|safai)\s+(?:kar\s+di|ho\s+chuki|ho\s+gaya|tha|thi)\b",
    r"\b(?:theek|repair|safai)\s+to\s+(?:kar\s+di|ho\s+chuki|ho\s+gayi)\s+thi\b",
    r"\bmasla\s+pehle\s+tha\s+ab\s+theek\s+hai\b"
]

NEGATION_PATTERNS = [
    ("kelectric", r"\b(?:bijli|light|electric)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bbijli\s+(?:bilkul\s+)?theek\s+hai\b|\btaar\s+se\s+khatra\s+nahi\b"),
    ("kwsc", r"\b(?:pani|sewerage|gutter)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bpani\s+(?:bilkul\s+)?theek\s+hai\b"),
    ("kmc", r"\b(?:sarak|road)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\broad\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+khadda\s+nahi\b"),
    ("ssgc", r"\b(?:gas|sui\s*gas)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bgas\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+gas\s+leak\s+nahi\b"),
    ("sswmb", r"\b(?:kachra|safai)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bsafai\s+(?:bilkul\s+)?theek\s+hai\b|\bkachra\s+nahi\s+hai\b"),
    ("sbca", r"\b(?:building|construction)\s+ka\s+(?:koi\s+)?(?:masla|issue|shikayat)\s+nahi\b|\bbuilding\s+(?:bilkul\s+)?theek\s+hai\b|\bkoi\s+crack\s+nahi\b"),
]

LOCATION_ANCHOR_PATTERNS = [
    r"\b(?:road|sarak|gali|footpath|chowrangi)\s+(?:par|pe|mein|me|ke\s+kinare|ke\s+samne)\s+(?:kachra|gutter|pani|taar|gas|wire|dher)\b",
    r"\b(?:kachra|gutter|pani|taar|wire)\s+(?:road|sarak|gali|footpath)\s+par\s+(?:beh|para|gir|ubal|latak)\b"
]


def segment_discourse_clauses(text: str) -> List[str]:
    clean = re.sub(r"([.?!;\n]+)", r" \1 ", text)
    clean = re.sub(
        r"\b(aur\s+alag\s+se|aur\s+doosra\s+masla|aur\s+mazeed\s+yeh\s+ke|aur\s+sath\s+hi\s+sath|doosri\s+taraf|doosri\s+gali\s+mein|saath\s+wali|aur\s+pichlay|jis\s+ki\s+wajah\s+se|us\s+ki\s+wajah\s+se|is\s+wajah\s+se|isi\s+liye|ke\s+sabab|ke\s+natijay\s+mein|jis\s+se|lekin\s+ab|magar\s+ab|jabke|halanke)\b",
        r". \1",
        clean,
        flags=re.I
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
                if re.search(r"\b(?:rod|road|sarak|bijli|light|pani|gutter|gas|kachra|building|taar|transformer)\b", next_part, flags=re.I):
                    final_segments.append(current_sub)
                    current_sub = next_part
                else:
                    current_sub += " aur " + next_part
            if current_sub:
                final_segments.append(current_sub)

    return [s for s in final_segments if s.strip()]


def extract_municipal_issues_v13_2(raw_text: str) -> Dict[str, Any]:
    normalized_text = normalize_roman_urdu_v13_2(raw_text)
    clauses = segment_discourse_clauses(normalized_text)

    issues = []
    notes = []
    causal_chains = []

    full_text_negations = set()
    for dept, pattern in NEGATION_PATTERNS:
        if re.search(pattern, normalized_text, flags=re.I):
            full_text_negations.add(dept)
            notes.append(f"Explicit negation detected: {dept.upper()} reported defect-free")

    historically_resolved_depts = set()
    for pattern in HISTORICAL_PATTERNS:
        match = re.search(pattern, normalized_text, flags=re.I)
        if match:
            match_text = match.group(0)
            for dept, lex in DEPARTMENT_LEXICONS.items():
                if any(re.search(p, match_text, flags=re.I) for p in lex["assets"]):
                    historically_resolved_depts.add(dept)
                    notes.append(f"Historical repair detected: {dept.upper()} was previously fixed")

    issue_counter = 1
    for clause in clauses:
        for dept, lex in DEPARTMENT_LEXICONS.items():
            has_asset = any(re.search(p, clause, flags=re.I) for p in lex["assets"])
            has_defect = any(re.search(p, clause, flags=re.I) for p in lex["defects"])
            has_standalone = any(re.search(p, clause, flags=re.I) for p in lex["standalone"])

            if (has_asset and has_defect) or has_standalone:
                asset_match = dept
                m_asset = re.search(lex["assets"][0], clause, flags=re.I)
                if m_asset:
                    asset_match = m_asset.group(0)

                defect_match = "reported defect"
                m_defect = re.search(lex["defects"][0], clause, flags=re.I)
                if m_defect:
                    defect_match = m_defect.group(0)

                status = "INDEPENDENT_FAULT"
                if dept in full_text_negations:
                    status = "NEGATED_MENTION"
                elif dept in historically_resolved_depts:
                    status = "HISTORICAL_RESOLVED"

                if dept == "kmc" and status == "INDEPENDENT_FAULT":
                    is_spatial = any(re.search(p, clause, flags=re.I) for p in LOCATION_ANCHOR_PATTERNS)
                    has_road_dmg = bool(re.search(r"\b(?:toot|tooti|khadda|khadday|gaddha|crater|pothole|dhans|asphalt|damaged)\b", clause, flags=re.I))
                    if is_spatial and not has_road_dmg:
                        status = "LOCATION_ONLY"
                        notes.append("Suppressed KMC: Road is merely spatial location anchor")

                issues.append({
                    "id": f"iss_{issue_counter}",
                    "department": dept,
                    "asset": asset_match,
                    "defect": defect_match,
                    "evidence_span": clause,
                    "status": status,
                    "is_actionable": (status == "INDEPENDENT_FAULT"),
                    "confidence": 0.85
                })
                issue_counter += 1

    # Causal chain resolution
    for i in range(len(issues)):
        root = issues[i]
        if root["status"] != "INDEPENDENT_FAULT":
            continue
        for j in range(len(issues)):
            if i == j:
                continue
            target = issues[j]
            if target["department"] == root["department"]:
                continue

            combined = root["evidence_span"] + " " + target["evidence_span"]
            has_causal = any(re.search(p, target["evidence_span"], flags=re.I) or re.search(p, combined, flags=re.I) for p in CAUSAL_CONNECTORS)

            is_causal_pair = False
            reason = ""

            if root["department"] == "kwsc" and target["department"] == "kmc":
                if re.search(r"\b(?:line|pipe|burst|leak|overflow)\b", root["evidence_span"], flags=re.I) and has_causal:
                    is_causal_pair = True
                    reason = "KWSC water leak caused KMC road damage"
            elif root["department"] == "ssgc" and target["department"] == "kmc":
                if re.search(r"\b(?:khod|khudai|excavation|pipeline)\b", root["evidence_span"], flags=re.I) and has_causal:
                    is_causal_pair = True
                    reason = "SSGC pipeline digging caused KMC road damage"
            elif root["department"] == "kelectric" and target["department"] == "kwsc":
                if re.search(r"\b(?:bijli|light|feeder|power|transformer)\b", root["evidence_span"], flags=re.I) and re.search(r"\bmotor\b", target["evidence_span"], flags=re.I):
                    is_causal_pair = True
                    reason = "K-Electric power outage caused domestic water motor to stop"
            elif root["department"] == "sswmb" and target["department"] == "kwsc":
                if re.search(r"\b(?:kachra|kooda|dher)\b", root["evidence_span"], flags=re.I) and re.search(r"\b(?:choke|block|overflow)\b", target["evidence_span"], flags=re.I):
                    is_causal_pair = True
                    reason = "SSWMB garbage dump caused sewer line blockage"

            if is_causal_pair:
                target["status"] = "CAUSAL_CONSEQUENCE"
                target["is_actionable"] = False
                target["caused_by_issue_id"] = root["id"]
                causal_chains.append({
                    "rootDept": root["department"],
                    "consequenceDept": target["department"],
                    "explanation": reason
                })
                notes.append(f"Fahad's Rule: Demoted {target['department'].upper()} ({reason})")

    actionable = sorted(list(set(iss["department"] for iss in issues if iss["is_actionable"])))
    suppressed = sorted(list(set(iss["department"] for iss in issues if not iss["is_actionable"]) - set(actionable)))

    return {
        "raw_text": raw_text,
        "normalized_text": normalized_text,
        "issues": issues,
        "actionable_departments": actionable,
        "actionableDepartments": actionable,
        "suppressed_departments": suppressed,
        "suppressedDepartments": suppressed,
        "causal_chains": causal_chains,
        "causalChains": causal_chains,
        "is_multi_issue": len(actionable) > 1,
        "isMultiIssue": len(actionable) > 1,
        "notes": notes
    }
