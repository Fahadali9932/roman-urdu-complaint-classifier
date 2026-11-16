"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Quality & Privacy Validators.

Provides:
- Schema and provenance validation conforming to synthetic_record.schema.json.
- Privacy & PII scanner (Pakistani phone, CNIC, emails, tokens, private residences).
- Syntactic negation and contradiction detection.
- Exact and fuzzy character 4-gram shingle deduplication.
- Cross-split family leakage detection.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Any, Dict, List, Set, Tuple

DEPARTMENTS = {"kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"}
RELATIONS = {
    "INDEPENDENT",
    "CAUSES",
    "EFFECT_OF",
    "SAME_INCIDENT_DIFFERENT_REPAIRS",
    "MENTION_ONLY",
    "UNCERTAIN",
}

# --- PII Regular Expressions ---
PHONE_PATTERNS = [
    re.compile(r"(?<!\d)(?:\+?92[- ]?)?0?3\d{2}[- ]?\d{7}(?!\d)", re.IGNORECASE),
    re.compile(r"\b03\d{2}[- ]?\d{7}\b"),
    re.compile(r"\b021[- ]?\d{7,8}\b"),  # Karachi landline
]
CNIC_PATTERN = re.compile(r"(?<!\d)\d{5}-?\d{7}-?\d(?!\d)")
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
API_KEY_PATTERN = re.compile(r"\b(sk-[A-Za-z0-9_-]{20,}|ey[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,})\b")
PRIVATE_RESIDENCE_PATTERN = re.compile(
    r"\b(?:house|makan|flat|banglow|bungalow|plot)\s*(?:no\.?|number|#)?\s*[a-z0-9\-/]+\b",
    re.IGNORECASE,
)


def scan_pii(text: str) -> List[str]:
    """Scan text for personally identifiable information (PII). Returns list of found PII types."""
    found = []
    if any(p.search(text) for p in PHONE_PATTERNS):
        found.append("phone_number")
    if CNIC_PATTERN.search(text):
        found.append("cnic")
    if EMAIL_PATTERN.search(text):
        found.append("email")
    if API_KEY_PATTERN.search(text):
        found.append("api_key_or_token")
    if PRIVATE_RESIDENCE_PATTERN.search(text):
        found.append("private_residence")
    return found


def has_pii(text: str) -> bool:
    """Convenience boolean check for PII presence."""
    return len(scan_pii(text)) > 0


# --- Syntactic Negation & Contradiction Detection ---
# In Roman Urdu:
# Negation of fault: "sarak theek hai", "road par koi khadda nahi", "gas leak nahi hai"
# Outage affirmation (NOT negation): "bijli nahi aa rahi", "pani nahi hai", "gas nahi hai"
NEGATION_RULES = [
    {
        "denial_pattern": re.compile(r"\b(?:sarak|road|sadak)\s+(?:bilkul\s+)?theek\s+hai\b|\b(?:koi\s+)?(?:khadda|gadda|damage)\s+nahi\b|\broad\s+kharab\s+nahi\b", re.IGNORECASE),
        "forbidden_issue": "road_damage",
        "forbidden_dept": "kmc",
        "description": "Affirming road is intact while labeling KMC road_damage",
    },
    {
        "denial_pattern": re.compile(r"\bgas\s+(?:leak|leek)\s+nahi\s+hai\b|\bgas\s+ki\s+boo\s+bilkul\s+nahi\b|\bkoi\s+leakage\s+nahi\b", re.IGNORECASE),
        "forbidden_issue": "gas_leak",
        "forbidden_dept": "ssgc",
        "description": "Denying gas leak while labeling SSGC gas_leak hazard",
    },
    {
        "denial_pattern": re.compile(r"\bkachra\s+nahi\s+hai\b|\bkachray\s+ka\s+masla\s+nahi\b|\bsafai\s+theek\s+hai\b", re.IGNORECASE),
        "forbidden_issue": "waste_overflow",
        "forbidden_dept": "sswmb",
        "description": "Denying waste problem while labeling SSWMB",
    },
    {
        "denial_pattern": re.compile(r"\btaar\s+(?:safe|theek)\s+hai\b|\bwire\s+se\s+khatra\s+nahi\b|\bbijli\s+ki\s+taar\s+nahi\s+giri\b", re.IGNORECASE),
        "forbidden_issue": "exposed_wire",
        "forbidden_dept": "kelectric",
        "description": "Affirming wire safety while labeling dangerous wire hazard",
    },
    {
        "denial_pattern": re.compile(r"\bbuilding\s+mazboot\s+hai\b|\bimarat\s+ko\s+khatra\s+nahi\b|\bkoi\s+illegal\s+kaam\s+nahi\b", re.IGNORECASE),
        "forbidden_issue": "unsafe_building",
        "forbidden_dept": "sbca",
        "description": "Denying building hazard while labeling SBCA unsafe_building",
    },
]


def check_contradictions(text: str, issues: List[Dict[str, Any]]) -> List[str]:
    """Check if the text explicitly denies a defect that was assigned in issues."""
    contradictions = []
    issue_types = {i.get("issue_type") for i in issues if isinstance(i, dict)}
    depts = {i.get("department_key") for i in issues if isinstance(i, dict)}

    for rule in NEGATION_RULES:
        if rule["denial_pattern"].search(text):
            if rule["forbidden_issue"] in issue_types or rule["forbidden_dept"] in depts:
                # Check if it was an active issue
                contradictions.append(
                    f"Contradiction: {rule['description']}"
                )
    return contradictions


# --- Deduplication (Exact & Shingle 4-gram) ---
def get_char_shingles(text: str, n: int = 4) -> Set[str]:
    """Extract character n-gram shingles after whitespace collapsing and lowercase."""
    cleaned = re.sub(r"\s+", " ", text.casefold().strip())
    if len(cleaned) < n:
        return {cleaned}
    return {cleaned[i:i + n] for i in range(len(cleaned) - n + 1)}


def jaccard_similarity(s1: Set[str], s2: Set[str]) -> float:
    """Calculate Jaccard similarity between two sets of shingles."""
    if not s1 or not s2:
        return 0.0
    intersection = len(s1 & s2)
    union = len(s1 | s2)
    return intersection / union if union > 0 else 0.0


# --- Schema and Integrity Validator ---
def validate_record(record: Dict[str, Any], seen_ids: Set[str], seen_texts: Set[str]) -> List[str]:
    """Validate a single record against the V11 data contract. Returns list of errors."""
    errors = []
    rec_id = record.get("record_id")
    text = record.get("text_sanitized")

    # Record ID
    if not isinstance(rec_id, str) or not (rec_id.startswith("syn_") or rec_id.startswith("hum_") or rec_id.startswith("gold_")):
        errors.append(f"Invalid record_id: must start with syn_, hum_, or gold_ (got {rec_id})")
    elif rec_id in seen_ids:
        errors.append(f"Duplicate record_id: {rec_id}")
    else:
        seen_ids.add(rec_id)

    # Text sanitized
    if not isinstance(text, str) or not text.strip():
        errors.append("Missing or empty text_sanitized")
    else:
        norm_text = re.sub(r"\s+", " ", text.casefold().strip())
        if norm_text in seen_texts:
            errors.append(f"Exact duplicate complaint text: '{text[:40]}...'")
        else:
            seen_texts.add(norm_text)

        # PII Check
        pii_found = scan_pii(text)
        if pii_found:
            errors.append(f"PII detected ({', '.join(pii_found)}) in text: '{text[:30]}...'")

    # Provenance integrity
    source_kind = record.get("source_kind")
    label_origin = record.get("label_origin")
    review_status = record.get("review_status")
    is_gold = record.get("is_gold")

    if source_kind == "synthetic_factory":
        if is_gold is not False:
            errors.append("Synthetic factory record must have is_gold=False")
        if review_status != "unreviewed":
            errors.append("Synthetic factory record must have review_status='unreviewed'")
        if label_origin != "scenario_spec":
            errors.append("Synthetic factory record must have label_origin='scenario_spec'")
    elif source_kind in {"human_authored", "consented_real"}:
        if review_status not in {"reviewed", "unreviewed"}:
            errors.append(f"Invalid review_status for human record: {review_status}")

    # Family and Scenario
    fam_id = record.get("family_id")
    scen_id = record.get("scenario_id")
    if not fam_id:
        errors.append("Missing family_id")
    if source_kind == "synthetic_factory" and fam_id != scen_id:
        errors.append(f"family_id ({fam_id}) must match scenario_id ({scen_id}) for synthetic records")

    # Issues
    issues = record.get("issues")
    if not isinstance(issues, list):
        errors.append("issues must be a list")
        issues = []
    else:
        issue_ids = set()
        for i, issue in enumerate(issues):
            if not isinstance(issue, dict):
                errors.append(f"Issue {i} is not a dict")
                continue
            iid = issue.get("issue_id")
            dept = issue.get("department_key")
            itype = issue.get("issue_type")

            if not iid:
                errors.append(f"Issue {i} missing issue_id")
            elif iid in issue_ids:
                errors.append(f"Duplicate issue_id: {iid}")
            else:
                issue_ids.add(iid)

            if dept not in DEPARTMENTS:
                errors.append(f"Invalid department_key: {dept}")
            if not itype or not isinstance(itype, str):
                errors.append(f"Missing or invalid issue_type in issue {i}")

    # Relations
    relations = record.get("relations")
    if not isinstance(relations, list):
        errors.append("relations must be a list")
    else:
        issue_ids = {iss["issue_id"] for iss in issues if isinstance(iss, dict) and "issue_id" in iss}
        for j, rel in enumerate(relations):
            if not isinstance(rel, dict):
                errors.append(f"Relation {j} is not a dict")
                continue
            left = rel.get("left")
            right = rel.get("right")
            rtype = rel.get("type")

            if rtype not in RELATIONS:
                errors.append(f"Invalid relation type: {rtype}")
            if left not in issue_ids or right not in issue_ids:
                errors.append(f"Relation pointers ({left}, {right}) do not exist in issues ({issue_ids})")
            if left == right:
                errors.append(f"Self-referential relation: left and right both {left}")

        # If more than 1 issue, must annotate relationship
        if len(issues) > 1 and not relations:
            errors.append(f"Multi-issue complaint ({len(issues)} issues) must have relation annotations")

    # Expected route
    route = record.get("expected_route")
    if not issues and route != "review":
        errors.append("Complaints with no actionable issues must have expected_route='review'")
    elif issues and route not in {"candidate_auto_route", "review"}:
        errors.append(f"Invalid expected_route: {route}")

    # Contradiction check
    if isinstance(text, str) and issues:
        contradictions = check_contradictions(text, issues)
        errors.extend(contradictions)

    return errors


def validate_dataset(records: List[Dict[str, Any]], check_fuzzy: bool = False, fuzzy_threshold: float = 0.88) -> List[str]:
    """Validate an entire collection of records. Checks schema, PII, duplicates, and optional near-duplicates."""
    all_errors = []
    seen_ids: Set[str] = set()
    seen_texts: Set[str] = set()
    shingles_by_family: Dict[str, List[Tuple[str, Set[str]]]] = defaultdict(list)

    for idx, r in enumerate(records, 1):
        errs = validate_record(r, seen_ids, seen_texts)
        for e in errs:
            all_errors.append(f"Record {idx} (ID: {r.get('record_id', 'unknown')}): {e}")

        if check_fuzzy and "text_sanitized" in r:
            fam = r.get("family_id", "unknown")
            text = r["text_sanitized"]
            sh = get_char_shingles(text)
            shingles_by_family[fam].append((r.get("record_id", f"idx_{idx}"), sh))

    # Cross-family near-duplicate check (leakage check)
    if check_fuzzy:
        families = list(shingles_by_family.keys())
        for i in range(len(families)):
            for j in range(i + 1, len(families)):
                f1, f2 = families[i], families[j]
                # Compare a subset or all pairs across different families
                for id1, sh1 in shingles_by_family[f1][:5]:
                    for id2, sh2 in shingles_by_family[f2][:5]:
                        sim = jaccard_similarity(sh1, sh2)
                        if sim > fuzzy_threshold:
                            all_errors.append(
                                f"Fuzzy near-duplicate cross-family leakage ({sim:.2f}): {id1} (fam: {f1}) vs {id2} (fam: {f2})"
                            )

    return all_errors


def check_family_leakage(train_records: List[Dict[str, Any]], val_records: List[Dict[str, Any]], test_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Verify strictly disjoint family partitioning across splits."""
    train_fams = {r["family_id"] for r in train_records if "family_id" in r}
    val_fams = {r["family_id"] for r in val_records if "family_id" in r}
    test_fams = {r["family_id"] for r in test_records if "family_id" in r}

    tv_overlap = train_fams & val_fams
    tt_overlap = train_fams & test_fams
    vt_overlap = val_fams & test_fams

    has_leak = bool(tv_overlap or tt_overlap or vt_overlap)
    return {
        "has_leak": has_leak,
        "train_families_count": len(train_fams),
        "val_families_count": len(val_fams),
        "test_families_count": len(test_fams),
        "train_val_overlap": list(tv_overlap),
        "train_test_overlap": list(tt_overlap),
        "val_test_overlap": list(vt_overlap),
    }
