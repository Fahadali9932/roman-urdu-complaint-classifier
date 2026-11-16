"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Offline Synthetic Scenario Generator.

Generates realistic Roman Urdu civic complaints derived strictly from hand-authored
typed scenario truth with rich vocabulary, spelling variance, authentic Karachi
locations, diverse narrative lengths, and deterministic reproducibility.
"""
from __future__ import annotations

import hashlib
import random
import re
from typing import Any, Dict, List, Optional, Set

from tools.ai_factory.scenarios import (
    DEPARTMENTS,
    PREFIXES,
    PUBLIC_PLACES,
    RELATIONS,
    REQUESTS,
    SCENARIOS,
    SUFFIXES,
    TIMES,
)
from tools.ai_factory.validators import has_pii, validate_record

VERSION = "v11-factory-1"

# Common Roman Urdu spelling variations to inject natural linguistic diversity
SPELLING_ALTERNATIVES: Dict[str, List[str]] = {
    "bohat": ["bohot", "bht", "bohat"],
    "kharab": ["khrab", "kharab", "khrb"],
    "sarak": ["sadak", "sarak", "road"],
    "pani": ["paani", "pani"],
    "bijli": ["bijlee", "light", "bijli"],
    "gutter": ["gatar", "gutter", "sewer line"],
    "kachra": ["kachray", "kachra", "garbage"],
    "pipe": ["paip", "pipe", "pipeline"],
    "masla": ["maslah", "masla", "problem"],
    "theek": ["thik", "theek"],
    "nahi": ["nhi", "nai", "nahi"],
    "hai": ["he", "hai"],
    "mein": ["mai", "me", "mein"],
    "bhi": ["b", "bhi"],
    "aur": ["or", "aur"],
    "boho": ["bohot", "bohat"],
    "shikayat": ["complaint", "shikayat"],
    "foran": ["forun", "foran", "jaldi"],
}


def apply_spelling_variance(text: str, rng: random.Random, probability: float = 0.25) -> str:
    """Selectively substitute canonical words with valid Roman Urdu spelling variants."""
    words = text.split()
    modified = []
    for w in words:
        punct = ""
        clean_w = w
        if w and w[-1] in {".", ",", ":", ";", "!", "?"}:
            punct = w[-1]
            clean_w = w[:-1]

        lower_w = clean_w.lower()
        if lower_w in SPELLING_ALTERNATIVES and rng.random() < probability:
            choice = rng.choice(SPELLING_ALTERNATIVES[lower_w])
            # Preserve capitalization if first letter was upper
            if clean_w and clean_w[0].isupper():
                choice = choice.capitalize()
            modified.append(choice + punct)
        else:
            modified.append(w)
    return " ".join(modified)


def create_record(
    scenario_spec: Dict[str, Any],
    rng: random.Random,
    index: int,
    seed: int,
    length_style: str = "standard",
    inject_spelling_noise: bool = True,
) -> Dict[str, Any]:
    """Render a single complaint record from a typed scenario specification."""
    variant_tmpl = rng.choice(scenario_spec["variants"])
    place = rng.choice(PUBLIC_PLACES)
    when = rng.choice(TIMES)
    request = rng.choice(REQUESTS)
    prefix = rng.choice(PREFIXES)
    suffix = rng.choice(SUFFIXES)

    core_text = variant_tmpl.format(place=place, time=when)

    if length_style == "short":
        # Compact: variant + request
        full_text = f"{core_text}. {request}".strip()
    elif length_style == "long":
        # Elaborate narrative with prefix, core, community impact, and urgent plea
        community_impact = rng.choice([
            "bachay aur buzurg bohot preshan hain.",
            "aane jane walon ke liye shadid aziyat bani hui hai.",
            "kayi bar complaint ki magar koi sunwai nahi hui.",
            "pure mohallay ka nizaam darham barham ho gaya hai.",
            "tamam ilaqay wale shadid mushkil mein mubtila hain.",
        ])
        full_text = f"{prefix}{core_text}. {community_impact} {request}{suffix}.".strip()
    else:
        # Standard length
        full_text = f"{prefix}{core_text}. {request}{suffix}".strip()

    # Clean double spaces or trailing periods
    full_text = re.sub(r"\s+", " ", full_text)
    full_text = re.sub(r"\.+", ".", full_text)

    if inject_spelling_noise:
        full_text = apply_spelling_variance(full_text, rng)

    issues = [dict(issue) for issue in scenario_spec["issues"]]

    # Construct pair relations if multiple issues exist
    relations = []
    rel_type = scenario_spec.get("relation")
    if rel_type and len(issues) == 2:
        relations.append({
            "left": issues[0]["issue_id"],
            "right": issues[1]["issue_id"],
            "type": rel_type,
        })
    elif len(issues) > 2:
        # Chain relations for 3+ issues as INDEPENDENT by default
        for i in range(len(issues) - 1):
            relations.append({
                "left": issues[i]["issue_id"],
                "right": issues[i + 1]["issue_id"],
                "type": rel_type or "INDEPENDENT",
            })

    # Expected route determination
    context_flags = list(scenario_spec.get("flags", []))
    if not issues:
        expected_route = "review"
    elif any("needs_review" in f for f in context_flags):
        expected_route = "review"
    else:
        expected_route = "candidate_auto_route"

    # Deterministic SHA-256 ID
    hash_input = f"{seed}|{index}|{scenario_spec['family_id']}|{full_text}"
    uid = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:20]

    record = {
        "record_id": f"syn_{uid}",
        "text_sanitized": full_text,
        "source_kind": "synthetic_factory",
        "label_origin": "scenario_spec",
        "review_status": "unreviewed",
        "is_gold": False,
        "language": "roman_urdu",
        "scenario_id": scenario_spec["family_id"],
        "family_id": scenario_spec["family_id"],
        "generator_version": VERSION,
        "seed": seed,
        "issues": issues,
        "relations": relations,
        "context_flags": context_flags,
        "expected_route": expected_route,
    }
    return record


def generate_dataset(
    count: int = 500,
    seed: int = 42,
    custom_scenarios: Optional[List[Dict[str, Any]]] = None,
    length_distribution: Tuple[float, float, float] = (0.2, 0.6, 0.2),  # (short, standard, long)
) -> List[Dict[str, Any]]:
    """Generate a high-quality, verified synthetic dataset adhering to V11 contract."""
    if count < 1 or count > 50_000:
        raise ValueError(f"Count must be between 1 and 50000 (requested {count})")

    scenario_pool = custom_scenarios or SCENARIOS
    if not scenario_pool:
        raise ValueError("Scenario catalog cannot be empty")

    rng = random.Random(seed)
    records: List[Dict[str, Any]] = []
    seen_texts: Set[str] = set()
    seen_ids: Set[str] = set()

    attempts = 0
    max_attempts = count * 50

    short_p, std_p, long_p = length_distribution

    while len(records) < count and attempts < max_attempts:
        # Ensure round-robin over all scenario families before random choice
        if attempts < len(scenario_pool):
            spec = scenario_pool[attempts]
        else:
            spec = rng.choice(scenario_pool)

        # Decide length style
        r_style = rng.random()
        if r_style < short_p:
            style = "short"
        elif r_style < short_p + std_p:
            style = "standard"
        else:
            style = "long"

        record = create_record(
            scenario_spec=spec,
            rng=rng,
            index=attempts,
            seed=seed,
            length_style=style,
            inject_spelling_noise=True,
        )
        attempts += 1

        norm_text = re.sub(r"\s+", " ", record["text_sanitized"].casefold().strip())
        if norm_text in seen_texts:
            continue

        if has_pii(record["text_sanitized"]):
            continue

        # In-line schema validation
        errs = validate_record(record, seen_ids, seen_texts)
        if errs:
            continue

        records.append(record)

    if len(records) < count:
        raise RuntimeError(
            f"Could only generate {len(records)} unique records out of {count} requested. "
            f"Expand scenario pool or adjust variance parameters."
        )

    return records
