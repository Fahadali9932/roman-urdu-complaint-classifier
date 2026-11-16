"""Awaaz-e-Awam (آوازِ عوام) — Phase V10 Advanced Roman Urdu Preprocessing & Linguistic Normalizer.

Provides:
- Robust Unicode & character cleanup.
- Context-safe word-boundary token normalization for high-variance Roman Urdu transliterations.
- Dual feature representation: Word n-grams (1-2) + Character n-grams (3-5 within word boundaries).
- Syntactic clause segmentation and causal marker detection.
- Clause-scoped negation detection preventing false hazard and service alarms.
"""
from __future__ import annotations

import re
import unicodedata
from typing import List, Tuple, Dict, Any

# ==============================================================================
# 1. Roman Urdu Spelling Normalization Rules (Word-Boundary Protected)
# ==============================================================================

TOKEN_REPLACEMENTS: List[Tuple[re.Pattern, str]] = [
    # Common verbs and auxiliary words
    (re.compile(r"\b(humare|hmare|hmaray)\b", re.IGNORECASE), "hamare"),
    (re.compile(r"\b(bohat|bht|bhut|bhot)\b", re.IGNORECASE), "bohot"),
    (re.compile(r"\b(zada|ziada|zayada)\b", re.IGNORECASE), "zyada"),
    (re.compile(r"\b(hoi\s+v\s+hai|hui\s+v\s+hai|hoi\s+v|hui\s+v|hoi\s+hui|hui\s+hui)\b", re.IGNORECASE), "hui hai"),
    (re.compile(r"\b(hoi|huwi)\b", re.IGNORECASE), "hui"),
    (re.compile(r"\b(pass|pas)\b", re.IGNORECASE), "paas"),
    (re.compile(r"\b(thik|thek)\b", re.IGNORECASE), "theek"),
    (re.compile(r"\b(kiya\s+jae|kya\s+jaye|karein|karain|krna\s+chahiye)\b", re.IGNORECASE), "kiya jaye"),
    (re.compile(r"\b(jae)\b", re.IGNORECASE), "jaye"),
    (re.compile(r"\b(nai|nhi|nhn|nay)\b", re.IGNORECASE), "nahi"),
    (re.compile(r"\b(hy|ha)\b", re.IGNORECASE), "hai"),
    (re.compile(r"\b(hain|hen|hn)\b", re.IGNORECASE), "hain"),
    (re.compile(r"\b(aur\s+bhi|or\s+bhi)\b", re.IGNORECASE), "aur"),
    (re.compile(r"\b(or)\b", re.IGNORECASE), "aur"),

    # Road & KMC Infrastructure
    (re.compile(r"\b(sadak|sarrak|sadrak)\b", re.IGNORECASE), "sarak"),
    (re.compile(r"\b(tooti|tuti|toot\s+gayi|toot\s+gai|tot\s+gai)\b", re.IGNORECASE), "tooti"),
    (re.compile(r"\b(gadda|gadday|gaddhe|khadday|khadde|potholes|pothole)\b", re.IGNORECASE), "khadda"),
    (re.compile(r"\b(dhans\s+gayi|dhans\s+gai|baith\s+gayi)\b", re.IGNORECASE), "dhans gai"),
    (re.compile(r"\b(foot\s+path|sidewalk)\b", re.IGNORECASE), "footpath"),
    (re.compile(r"\b(street\s+light|streetlights|street\s+lights|battiyan)\b", re.IGNORECASE), "streetlight"),

    # Water & KWSC Sanitation
    (re.compile(r"\b(paani|paany)\b", re.IGNORECASE), "pani"),
    (re.compile(r"\b(gutters|gutr|guttr)\b", re.IGNORECASE), "gutter"),
    (re.compile(r"\b(sewerage|sewer|sewreg)\b", re.IGNORECASE), "sewage"),
    (re.compile(r"\b(manholes|menhole|man\s+hole)\b", re.IGNORECASE), "manhole"),
    (re.compile(r"\b(pipe\s+line|pipelin|pipe)\b", re.IGNORECASE), "pipeline"),
    (re.compile(r"\b(badboo|ganda\s+pani|badbu)\b", re.IGNORECASE), "badboo"),

    # Electricity & K-Electric Power
    (re.compile(r"\b(bijlee|electrcity|electrisity)\b", re.IGNORECASE), "bijli"),
    (re.compile(r"\b(transfomer|transfarmer|pmt)\b", re.IGNORECASE), "transformer"),
    (re.compile(r"\b(taar|wires|taarein)\b", re.IGNORECASE), "wire"),
    (re.compile(r"\b(chingari|sparking|dhamaka)\b", re.IGNORECASE), "spark"),
    (re.compile(r"\b(khamba|khambay|pole|poles)\b", re.IGNORECASE), "khamba"),

    # Gas & SSGC
    (re.compile(r"\b(sooi\s+gas|sui\s+gas)\b", re.IGNORECASE), "gas"),
    (re.compile(r"\b(leaking|leek)\b", re.IGNORECASE), "leak"),
    (re.compile(r"\b(kam\s+pressure|low\s+presure)\b", re.IGNORECASE), "low pressure"),

    # Waste & SSWMB
    (re.compile(r"\b(kachraa|koora|kura|rubbish|trash)\b", re.IGNORECASE), "kachra"),
    (re.compile(r"\b(dustbin|kachra\s+dabba)\b", re.IGNORECASE), "kundi"),
    (re.compile(r"\b(safai\s+nahi|safai\s+na\s+hona)\b", re.IGNORECASE), "safai nahi"),

    # Building & SBCA
    (re.compile(r"\b(imarat|emarat|building)\b", re.IGNORECASE), "building"),
    (re.compile(r"\b(daraar|daraarein|cracks)\b", re.IGNORECASE), "crack"),
    (re.compile(r"\b(girne\s+wali|collapse|gir\s+rahi)\b", re.IGNORECASE), "girne wali"),
    (re.compile(r"\b(ghair\s+qanooni|bila\s+ijazat)\b", re.IGNORECASE), "illegal construction"),
]


def normalize_roman_urdu(text: str) -> str:
    """Performs Unicode cleanup and safe word-boundary token normalization."""
    if not text:
        return ""
    # Unicode canonical normalization
    s = unicodedata.normalize("NFC", text)
    # Strip invisible / control characters
    s = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", s)
    # Normalize quotes, apostrophes, and dashes
    s = re.sub(r"[`'\"’‘]", "'", s)
    s = re.sub(r"[—–−]", "-", s)
    # Lowercase
    s = s.lower()
    # Apply token-level replacements
    for pattern, replacement in TOKEN_REPLACEMENTS:
        s = pattern.sub(replacement, s)
    # Collapse excess whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ==============================================================================
# 2. Clause Segmentation & Syntactic Boundary Analysis
# ==============================================================================

CLAUSE_DELIMITERS = re.compile(
    r"(?:[.,;!?\n]+|\baur\s+sath\s+hi\b|\bsath\s+hi\b|\baur\s+alag\s+se\b|\baur\b|\bmagar\b|\blekin\b|\bjabke\b|\bpar\b|\bwarna\b|\bis\s+liye\b|\bis\s+wajah\s+se\b|\bjis\s+se\b|\bki\s+wajah\s+se\b)",
    re.IGNORECASE,
)

CAUSAL_CONNECTORS = [
    "is liye",
    "is wajah se",
    "jis ki wajah se",
    "jis se",
    "ki wajah se",
    "wajah se",
    "kyunke",
    "kyunki",
]


def segment_clauses(text: str) -> List[str]:
    """Splits Roman Urdu complaint into meaningful semantic clauses."""
    raw_clauses = CLAUSE_DELIMITERS.split(text)
    clauses = [c.strip() for c in raw_clauses if len(c.strip()) > 2]
    return clauses if clauses else [text.strip()]


def detect_causal_markers(text: str) -> List[Dict[str, Any]]:
    """Detects causal conjunctions linking an antecedent issue to a consequence."""
    low = text.lower()
    found: List[Dict[str, Any]] = []
    for marker in CAUSAL_CONNECTORS:
        pattern = rf"\b{re.escape(marker)}\b"
        match = re.search(pattern, low)
        if match:
            found.append({
                "marker": marker,
                "start": match.start(),
                "end": match.end(),
            })
    return found


# ==============================================================================
# 3. Negation & False Alarm Detection
# ==============================================================================

# In Roman Urdu complaints:
# "bijli nahi aa rahi", "pani nahi hai", "gas nahi hai", "safai nahi hai" are AFFIRMATIVE SERVICE SHORTAGE DEFECTS!
# True negations negate the defect or problem itself:
# "khatra nahi", "masla nahi", "leak nahi", "tooti nahi", "kharab nahi", "band nahi", "saaf hai", "theek hai"
DEFECT_NEGATION_PATTERNS = [
    re.compile(r"\b(sarak|road)\s+(theek|tooti\s+nahi|kharab\s+nahi)\b", re.IGNORECASE),
    re.compile(r"\b(khadda|pothole)\s+(nahi\s+hai|nahi\s+h)\b", re.IGNORECASE),
    re.compile(r"\b(naali|nala|drain)\s+(band\s+nahi|saaf\s+hai|theek\s+hai)\b", re.IGNORECASE),
    re.compile(r"\b(sewage|gutter)\s+(masla\s+nahi|band\s+nahi|overflow\s+nahi)\b", re.IGNORECASE),
    re.compile(r"\b(gas\s+leak|leakage)\s+(nahi\s+hai|nahi\s+h|nahi\s+hy)\b", re.IGNORECASE),
    re.compile(r"\b(wire|taar)\s+(theek\s+hai|toota\s+nahi|khatra\s+nahi)\b", re.IGNORECASE),
    re.compile(r"\b(khatra\s+nahi|danger\s+nahi|masla\s+nahi|theek\s+hai|koi\s+masla\s+nahi)\b", re.IGNORECASE),
]


def is_clause_negated(clause: str, target_dept: str) -> bool:
    """Checks whether a target municipal service defect is explicitly negated in the clause.
    
    Crucial: 'pani nahi hai' or 'bijli nahi aa rahi' is NOT a negation; it is an affirmative shortage!
    Negation only applies when the defect or fault itself is denied (e.g. 'naali band nahi hai').
    """
    low = clause.lower()
    if target_dept == "kmc" and re.search(r"\b(sarak\s+(theek|tooti\s+nahi|kharab\s+nahi)|road\s+(theek|tooti\s+nahi|kharab\s+nahi)|khadda\s+nahi)\b", low):
        return True
    if target_dept == "kwsc" and re.search(r"\b(gutter\s+(theek|band\s+nahi)|naali\s+(saaf\s+hai|band\s+nahi)|sewage\s+masla\s+nahi)\b", low):
        return True
    if target_dept == "kelectric" and re.search(r"\b(wire\s+(theek|toota\s+nahi)|bijli\s+theek|khatra\s+nahi|current\s+nahi)\b", low):
        return True
    if target_dept == "ssgc" and re.search(r"\b(gas\s+(theek|leak\s+nahi|leakage\s+nahi)|smell\s+nahi)\b", low):
        return True
    if target_dept == "sswmb" and re.search(r"\b(kachra\s+nahi|safai\s+hai|saaf\s+hai)\b", low):
        return True
    if target_dept == "sbca" and re.search(r"\b(building\s+theek|imarat\s+theek|khatra\s+nahi)\b", low):
        return True
    return False


# ==============================================================================
# 4. Token & Character Feature Extraction (Dual Representation)
# ==============================================================================

def extract_word_and_char_tokens(text: str, ngram_words: Tuple[int, int] = (1, 2), ngram_chars: Tuple[int, int] = (3, 5)) -> List[str]:
    """Extracts unified word n-grams and character n-grams within word boundaries.
    
    This matches Scikit-Learn's FeatureUnion(TfidfVectorizer(word), TfidfVectorizer(char_wb))
    and ensures 100% determinism when ported to pure TypeScript.
    """
    normalized = normalize_roman_urdu(text)
    words = normalized.split()
    tokens: List[str] = []

    # 1. Word n-grams
    w_min, w_max = ngram_words
    for n in range(w_min, w_max + 1):
        for i in range(len(words) - n + 1):
            tokens.append("w:" + " ".join(words[i:i + n]))

    # 2. Character n-grams with word boundary marker (char_wb)
    c_min, c_max = ngram_chars
    for word in words:
        padded = f" {word} "
        for n in range(c_min, c_max + 1):
            for i in range(len(padded) - n + 1):
                tokens.append("c:" + padded[i:i + n])

    return tokens


if __name__ == "__main__":
    sample = "humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae"
    print("Original:", sample)
    norm = normalize_roman_urdu(sample)
    print("Normalized:", norm)
    print("Clauses:", segment_clauses(sample))
    tokens = extract_word_and_char_tokens(sample)
    print("Total tokens extracted (word+char):", len(tokens))
    print("Sample tokens:", tokens[:15])
