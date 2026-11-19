"""Awaaz-e-Awam (آوازِ عوام) — Phase V11 Model Training & Causal Resolver.

Provides:
- Dual-track Word (1-2) + Char (3-5 'char_wb') TF-IDF FeatureUnion.
- Multi-label classification models:
  - B0: Rule / Heuristic Baseline
  - B1-A: Balanced Logistic Regression
  - B1-B: Calibrated LinearSVC (Isotonic / Sigmoid)
  - B1-C: Calibrated SGDClassifier
- Civic Causal & Negation Relation Resolver (suppresses false consequence departments).
- Per-department validation threshold tuning.
- Complete JSON export for local inference and parity verification.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import FeatureUnion
from sklearn.svm import LinearSVC

DEPARTMENTS = ["kmc", "kwsc", "kelectric", "ssgc", "sswmb", "sbca"]

# Normalization & Evidence Lexicons for B0 Rule Baseline
DEPT_PATTERNS = {
    "kmc": re.compile(r"\b(?:sarak|sadak|road|footpath|pothole|khadda|khadday|gadday|manhole|dhakkan|gali|flyover|underpass|traffic\s+signal)\b", re.IGNORECASE),
    "kwsc": re.compile(r"\b(?:pani|paani|water|sewer|sewerage|gutter|gatar|line\s+phat|pipe\s+leak|tanker|drain|drainage|main\s+hole)\b", re.IGNORECASE),
    "kelectric": re.compile(r"\b(?:bijli|bijlee|light|electric|electricity|transformer|taar|taaren|wire|wires|voltage|sparks|meter|load\s*shedding|power\s+outage)\b", re.IGNORECASE),
    "ssgc": re.compile(r"\b(?:sui\s*gas|gas|pipeline|cylinder|methane|gas\s+leak|gas\s+pressure|boo|smell)\b", re.IGNORECASE),
    "sswmb": re.compile(r"\b(?:kachra|kachray|garbage|trash|safai|dustbin|dhair|dumper|sweeper|malba|kura)\b", re.IGNORECASE),
    "sbca": re.compile(r"\b(?:building|imarat|construction|illegal\s+floor|chath|daraar|crack|girne\s+ka\s+khatra|ghair\s+qanooni|demolition)\b", re.IGNORECASE),
}


class CivicRelationResolver:
    """Applies civic domain rules to refine raw multi-label department probabilities.
    
    Prevents false secondary routing on:
    1. Downstream causal symptoms (e.g. power outage causing domestic water pump failure).
    2. Explicitly negated defects (e.g. 'sarak theek hai', 'gas leak nahi hai').
    3. Location-only mentions (e.g. 'road par accident hua, sarak kharab nahi').
    4. Cross-domain unigram leakage (water pressure vs gas pressure).
    5. Structural building excavation vs gas pipeline fracture.
    6. Electrical wire hazards in spatial street/footpath locations without road damage.
    7. Agency addressed as conversational recipient without grievance.
    """

    # Negation indicators that dismiss a physical defect
    ROAD_DENIAL = re.compile(r"\b(?:sarak|road|sadak)\s+(?:bilkul\s+)?theek\s+hai\b|\b(?:koi\s+)?(?:khadda|gadda|damage)\s+nahi\b|\broad\s+kharab\s+nahi\b", re.IGNORECASE)
    GAS_LEAK_DENIAL = re.compile(r"\bgas\s+(?:leak|leek)\s+nahi\b|\bboo\s+(?:bilkul\s+)?nahi\b|\bkoi\s+leakage\s+nahi\b", re.IGNORECASE)
    WASTE_DENIAL = re.compile(r"\bkachra\s+nahi\s+hai\b|\bsafai\s+theek\s+hai\b", re.IGNORECASE)
    WIRE_SAFE = re.compile(r"\btaar\s+(?:safe|theek)\s+hai\b|\bwire\s+se\s+khatra\s+nahi\b", re.IGNORECASE)

    # Consequence symptoms (non-actionable secondary departments)
    MOTOR_CONSEQUENCE = re.compile(r"\b(?:pani\s+ki\s+)?motor\s+(?:nahi\s+chal\s+rahi|band\s+hai|ruk\s+gai)\b|\bwater\s+pump\s+band\b", re.IGNORECASE)
    TRAFFIC_CONSEQUENCE = re.compile(r"\b(?:traffic\s+jam|gariyan\s+phans\s+rahi|gariyan\s+ruk\s+rahi)\b", re.IGNORECASE)
    WET_ROAD_ONLY = re.compile(r"\broad\s+geeli\s+hai\b|\bsarak\s+par\s+pani\s+hai\b", re.IGNORECASE)
    ROAD_ACTUAL_DAMAGE = re.compile(r"\b(?:sarak|road)\s+(?:dhans\s+gai|toot\s+gai|baith\s+gai|khadday\s+par\s+gaye|parat\s+ukhad\s+gai)\b|\b(?:pothole|khadda|gadda|crater|asphalt|footpath\s+toot)\b", re.IGNORECASE)

    # Cross-domain disambiguation: Water pressure vs Gas pressure
    WATER_PRESSURE = re.compile(
        r"\b(?:water|pani|paani)(?:\s+supply)?(?:\s+ka)?\s+(?:intihai\s+|bohot\s+|bht\s+)?(?:low|kam|zero)\s+pressure\b|"
        r"\b(?:water|pani|paani)\s+(?:ka\s+)?pressure\b|"
        r"\bpressure\s+(?:intihai\s+)?kam\s+hai\s+(?:pani|motor)\b|"
        r"\bpressure\s+intihai\s+kam\s+hai\s+motor\b",
        re.IGNORECASE,
    )
    GAS_EVIDENCE = re.compile(r"\b(?:gas|sui\s*gas|chulha|stove|gas\s*meter|flame|methane)\b", re.IGNORECASE)

    # Cross-domain disambiguation: Building excavation vs Gas pipeline fracture
    BUILDING_EXCAVATION = re.compile(r"\b(?:basement|foundation|shoring|building|house|makan|wall|deewar|pillar)\b.*\b(?:excavation|khudai)\b|\b(?:excavation|khudai)\b.*\b(?:basement|foundation|shoring|building|house|wall|deewar|crack)\b", re.IGNORECASE)

    # Cross-domain disambiguation: Spatial wire hazard vs Road damage
    ELECTRICAL_HAZARD = re.compile(r"\b(?:wire|taar|taaren|cable|pole|khamba|transformer|current|sparks?|snapping)\b", re.IGNORECASE)
    ROAD_STRUCTURAL_DEFECT = re.compile(r"\b(?:khadda|khadday|gadda|gadday|pothole|potholes|toota|tooti|damaged?|crater|dhans|asphalt|carpeting|encroachment|thela|vendor)\b", re.IGNORECASE)

    # Solid waste affirmative check
    WASTE_EVIDENCE = re.compile(r"\b(?:kachra|kachray|garbage|trash|safai|dustbin|dhair|dumper|sweeper|malba|kura|dumpster|dumped|waste)\b", re.IGNORECASE)

    # Building affirmative check
    BUILDING_EVIDENCE = re.compile(
        r"\b(?:building|imarat|construction|floor|chath|daraar|crack|demolition|basement|pillar|plaza|makan|plot|premises|shutter)\b",
        re.IGNORECASE,
    )

    # Explicit defect negations across departments
    EXPLICIT_DEPT_DENIALS = [
        ("ssgc", re.compile(r"\b(?:ye\s+)?gas\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bgas\s+bilkul\s+theek\s+hai\b", re.IGNORECASE)),
        ("kmc", re.compile(r"\b(?:ye\s+)?(?:sarak|road|sadak)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\b(?:sarak|road|sadak)\s+(?:bilkul\s+)?theek\s+hai\b|\b(?:koi\s+)?(?:khadda|gadda|damage)\s+nahi\b|\broad\s+kharab\s+nahi\b", re.IGNORECASE)),
        ("kelectric", re.compile(r"\b(?:ye\s+)?(?:bijli|light|electric)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\btaar\s+(?:safe|theek)\s+hai\b|\bwire\s+se\s+khatra\s+nahi\b", re.IGNORECASE)),
        ("kwsc", re.compile(r"\b(?:ye\s+)?(?:pani|water|sewer|gutter)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bpaani\s+theek\s+hai\b", re.IGNORECASE)),
        ("sswmb", re.compile(r"\b(?:ye\s+)?(?:kachra|garbage|safai)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bkachra\s+nahi\s+hai\b|\bsafai\s+theek\s+hai\b", re.IGNORECASE)),
        ("sbca", re.compile(r"\b(?:ye\s+)?(?:building|construction)\s+ka\s+(?:koi\s+)?(?:masla|issue|masalah|problem)\s+nahi\b|\bbuilding\s+theek\s+hai\b|\bkoi\s+crack\s+nahi\b", re.IGNORECASE)),
    ]

    # Generalized recipient mentions across all 6 departments
    RECIPIENT_MENTIONS = [
        ("kelectric", re.compile(r"\bk-?electric\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:bijli|taar|voltage|transformer|light|current|feeder|meter|power|load\s*shedding)\b", re.IGNORECASE)),
        ("kmc", re.compile(r"\bkmc\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:sarak|road|sadak|footpath|flyover|bridge|khadda|pothole|underpass|street\s*light)\b", re.IGNORECASE)),
        ("kwsc", re.compile(r"\b(?:kwsc|kwsb|water\s+board)\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:pani|paani|water|sewer|sewerage|gutter|gatar|line\s+phat|pipe|drain)\b", re.IGNORECASE)),
        ("ssgc", re.compile(r"\bssgc\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:gas|sui\s*gas|cylinder|chulha|pipeline|meter)\b", re.IGNORECASE)),
        ("sswmb", re.compile(r"\bsswmb\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:kachra|garbage|trash|safai|dustbin|dhair|dumper|sweeper)\b", re.IGNORECASE)),
        ("sbca", re.compile(r"\bsbca\s+(?:wale|walay|team|staff|ko\s+chahiye|please|hazrat)\b", re.IGNORECASE), re.compile(r"\b(?:building|imarat|construction|floor|chath|daraar|crack|demolition)\b", re.IGNORECASE)),
    ]

    # English civic terms boosting
    ENGLISH_POWER = re.compile(r"\b(?:load\s*shedding|power\s*cut|continuous\s+power\s+cut|feeder\s+down|feeder\s+tripping)\b", re.IGNORECASE)
    ENGLISH_BUILDING = re.compile(r"\b(?:stop-work\s*order|seal\s+the\s+premises|unauthorized\s+construction|demolition\s+order)\b", re.IGNORECASE)

    @classmethod
    def resolve(cls, text: str, initial_probs: Dict[str, float]) -> Tuple[Dict[str, float], List[str]]:
        """Refine department probabilities and output reasoning notes."""
        probs = dict(initial_probs)
        notes = []

        # 0. Boost English civic loanwords
        if cls.ENGLISH_POWER.search(text):
            probs["kelectric"] = max(probs.get("kelectric", 0), 0.85)
            notes.append("Boosted K-Electric: English power terms detected")

        if cls.ENGLISH_BUILDING.search(text):
            probs["sbca"] = max(probs.get("sbca", 0), 0.85)
            notes.append("Boosted SBCA: English building control terms detected")

        # 1. Water pressure vs Gas pressure
        if cls.WATER_PRESSURE.search(text) and not cls.GAS_EVIDENCE.search(text):
            if probs.get("ssgc", 0) > 0.10:
                probs["ssgc"] = 0.05
                notes.append("Suppressed SSGC: 'pressure' refers to water supply, not gas")

        # 2. Building excavation vs Gas pipeline fracture
        if cls.BUILDING_EXCAVATION.search(text) and not cls.GAS_EVIDENCE.search(text):
            if probs.get("ssgc", 0) > 0.10:
                probs["ssgc"] = 0.05
                notes.append("Suppressed SSGC: Excavation relates to building construction, no gas pipeline mentioned")

        # 3. Spatial location (wire on footpath/road) without road defect
        if cls.ELECTRICAL_HAZARD.search(text):
            if not cls.ROAD_STRUCTURAL_DEFECT.search(text):
                if probs.get("kmc", 0) > 0.15:
                    probs["kmc"] = 0.05
                    notes.append("Suppressed KMC: Road/footpath is location of electrical hazard without structural road defect")

        # 4. SSWMB false positive without garbage evidence
        if probs.get("sswmb", 0) > 0.20 and not cls.WASTE_EVIDENCE.search(text):
            probs["sswmb"] = 0.05
            notes.append("Suppressed SSWMB: No affirmative waste/garbage tokens found")

        # 5. Power outage causing domestic water motor failure
        # If electricity has strong fault and motor is mentioned as symptom, suppress KWSC
        if probs.get("kelectric", 0) > 0.40 and cls.MOTOR_CONSEQUENCE.search(text):
            # Check if there is an affirmative public water line fault
            if not re.search(r"\b(?:sarkari|main|public)\s+(?:water\s+)?(?:line|pipe|pipeline)\b|\bpani\s+ki\s+supply\s+band\b", text, re.IGNORECASE):
                if probs.get("kwsc", 0) > 0.20:
                    probs["kwsc"] = min(probs.get("kwsc", 0), 0.15)
                    notes.append("Suppressed KWSC: Domestic water motor failure is downstream symptom of power outage")

        # 6. Sewer overflow causing traffic slowdown
        if probs.get("kwsc", 0) > 0.40 and cls.TRAFFIC_CONSEQUENCE.search(text):
            # Suppress KMC unless genuine road structural damage is affirmed
            if not cls.ROAD_ACTUAL_DAMAGE.search(text) and not re.search(r"\b(?:sarak|road)\s+(?:kharab|tooti)\b", text, re.IGNORECASE):
                if probs.get("kmc", 0) > 0.20:
                    probs["kmc"] = min(probs.get("kmc", 0), 0.15)
                    notes.append("Suppressed KMC: Traffic congestion is downstream effect of sewer overflow")

        # 7. Water line burst making road wet vs damaging road
        if probs.get("kwsc", 0) > 0.40 and cls.WET_ROAD_ONLY.search(text):
            if not cls.ROAD_ACTUAL_DAMAGE.search(text):
                probs["kmc"] = min(probs.get("kmc", 0), 0.15)
                notes.append("Suppressed KMC: Road is wet from water pipe leak without structural pavement damage")

        # 8. Explicit defect negations
        for dept, denial_pat in cls.EXPLICIT_DEPT_DENIALS:
            if denial_pat.search(text):
                probs[dept] = 0.05
                notes.append(f"Suppressed {dept}: Explicit denial of issue or confirmed defect-free")

        if cls.GAS_LEAK_DENIAL.search(text):
            notes.append("Noted: Gas leak explicitly denied")

        # 9. Mention of agency name as recipient without grievance
        for dept, mention_pat, fault_pat in cls.RECIPIENT_MENTIONS:
            if mention_pat.search(text) and not fault_pat.search(text):
                probs[dept] = 0.05
                notes.append(f"Suppressed {dept}: Entity addressed as message recipient, not fault owner")

        # 10. Affirmative domain evidence gating for SSGC and SBCA
        if probs.get("ssgc", 0) > 0.20 and not cls.GAS_EVIDENCE.search(text):
            probs["ssgc"] = 0.05
            notes.append("Suppressed SSGC: No affirmative gas infrastructure tokens found")

        if probs.get("sbca", 0) > 0.20 and not cls.BUILDING_EVIDENCE.search(text):
            probs["sbca"] = 0.05
            notes.append("Suppressed SBCA: No affirmative building control tokens found")

        return probs, notes


def build_feature_extractor() -> FeatureUnion:
    """Construct dual-track Word + Character TF-IDF feature union."""
    word_vec = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )
    char_vec = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        sublinear_tf=True,
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )
    return FeatureUnion([
        ("word", word_vec),
        ("char", char_vec),
    ])


class RuleBaselineModel:
    """Model A: Heuristic keyword pattern baseline (B0)."""

    def __init__(self, departments: List[str] = DEPARTMENTS):
        self.departments = departments

    def fit(self, X: List[str], y: np.ndarray) -> RuleBaselineModel:
        return self

    def predict_proba(self, X: List[str]) -> np.ndarray:
        probs = np.zeros((len(X), len(self.departments)), dtype=float)
        for i, text in enumerate(X):
            for j, dept in enumerate(self.departments):
                pattern = DEPT_PATTERNS.get(dept)
                if pattern and pattern.search(text):
                    probs[i, j] = 0.85
                else:
                    probs[i, j] = 0.10
        return probs

    def predict(self, X: List[str], threshold: float = 0.50) -> np.ndarray:
        return (self.predict_proba(X) >= threshold).astype(int)


def train_candidates(
    train_texts: List[str],
    train_labels: np.ndarray,
    departments: List[str] = DEPARTMENTS,
    seed: int = 42,
) -> Tuple[FeatureUnion, Dict[str, Any]]:
    """Train Model A, B, C, D candidates on training split."""
    # Build and fit feature extractor
    feature_union = build_feature_extractor()
    X_train_vec = feature_union.fit_transform(train_texts)

    candidates = {}

    # Model A: Rule Baseline
    m_a = RuleBaselineModel(departments=departments)
    m_a.fit(train_texts, train_labels)
    candidates["B0_RuleBaseline"] = m_a

    # Model B: Balanced Logistic Regression
    m_b = OneVsRestClassifier(LogisticRegression(
        class_weight="balanced",
        C=1.5,
        max_iter=1000,
        random_state=seed,
    ))
    m_b.fit(X_train_vec, train_labels)
    candidates["B1_A_Logistic"] = m_b

    # Model C: Calibrated LinearSVC (Sigmoid)
    base_svc = LinearSVC(class_weight="balanced", C=1.0, random_state=seed, max_iter=2000)
    m_c = CalibratedClassifierCV(base_svc, method="sigmoid", cv=3)
    # CalibratedClassifierCV works directly on multi-label if trained per-column or wrapped
    # Train OneVsRest wrapper of calibrated SVC
    m_c_ovr = OneVsRestClassifier(CalibratedClassifierCV(
        LinearSVC(class_weight="balanced", C=1.0, random_state=seed, max_iter=2000),
        method="sigmoid",
        cv=3,
    ))
    m_c_ovr.fit(X_train_vec, train_labels)
    candidates["B1_B_LinearSVC"] = m_c_ovr

    # Model D: Calibrated SGDClassifier (modified_huber provides native calibrated probabilities)
    m_d = OneVsRestClassifier(SGDClassifier(
        loss="modified_huber",
        penalty="l2",
        alpha=1e-4,
        max_iter=1000,
        random_state=seed,
        class_weight="balanced",
    ))
    m_d.fit(X_train_vec, train_labels)
    candidates["B1_C_SGD"] = m_d

    return feature_union, candidates


def tune_thresholds(
    model: Any,
    feature_union: Optional[FeatureUnion],
    val_texts: List[str],
    val_labels: np.ndarray,
    departments: List[str] = DEPARTMENTS,
) -> Dict[str, float]:
    """Find optimal decision threshold per department on disjoint validation set."""
    if feature_union is not None:
        X_val_vec = feature_union.transform(val_texts)
        raw_probs = model.predict_proba(X_val_vec)
    else:
        raw_probs = model.predict_proba(val_texts)

    tuned_thresholds = {}
    candidate_thresholds = np.linspace(0.25, 0.75, 21)

    for j, dept in enumerate(departments):
        best_f1 = -1.0
        best_thresh = 0.50
        y_true = val_labels[:, j]

        for t in candidate_thresholds:
            y_pred = (raw_probs[:, j] >= t).astype(int)
            tp = np.sum((y_pred == 1) & (y_true == 1))
            fp = np.sum((y_pred == 1) & (y_true == 0))
            fn = np.sum((y_pred == 0) & (y_true == 1))

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

            if f1 > best_f1:
                best_f1 = f1
                best_thresh = float(round(t, 2))

        tuned_thresholds[dept] = best_thresh

    return tuned_thresholds


def export_model_artifact(
    feature_union: FeatureUnion,
    model: Any,
    thresholds: Dict[str, float],
    out_path: Path,
    departments: List[str] = DEPARTMENTS,
) -> Dict[str, Any]:
    """Serialize calibrated model weights, vocabulary, and thresholds for local inference."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    word_vec = feature_union.transformer_list[0][1]
    char_vec = feature_union.transformer_list[1][1]

    # Model parameters extraction
    model_export_data: Dict[str, Any] = {
        "version": "v11-candidate-1",
        "departments": departments,
        "thresholds": thresholds,
        "word_vocab": word_vec.vocabulary_,
        "word_idf": word_vec.idf_.tolist(),
        "char_vocab": char_vec.vocabulary_,
        "char_idf": char_vec.idf_.tolist(),
    }

    # Extract weights based on model type
    if hasattr(model, "estimators_"):
        classifiers_data = []
        for est in model.estimators_:
            if hasattr(est, "coef_"):
                classifiers_data.append({
                    "coef": est.coef_[0].tolist() if est.coef_.ndim > 1 else est.coef_.tolist(),
                    "intercept": est.intercept_.tolist(),
                })
            elif hasattr(est, "calibrated_classifiers_"):
                # CalibratedClassifierCV
                sub_data = []
                for cal in est.calibrated_classifiers_:
                    # In scikit-learn 1.2+, sigmoid calibrator is stored in cal.calibrators[0]
                    calibrator = cal.calibrators[0] if hasattr(cal, "calibrators") and cal.calibrators else None
                    a_val = getattr(calibrator, "a_", getattr(cal, "a_", None))
                    b_val = getattr(calibrator, "b_", getattr(cal, "b_", None))
                    sub_data.append({
                        "coef": [round(float(w), 8) for w in cal.estimator.coef_[0]],
                        "intercept": [round(float(b0), 8) for b0 in cal.estimator.intercept_],
                        "a": round(float(a_val), 8) if a_val is not None else None,
                        "b": round(float(b_val), 8) if b_val is not None else None,
                    })
                classifiers_data.append({"calibrated": sub_data})
        model_export_data["classifiers"] = classifiers_data

    serialized = json.dumps(model_export_data, sort_keys=True)
    manifest_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    model_export_data["sha256_checksum"] = manifest_hash

    with out_path.open("w", encoding="utf-8") as f:
        f.write(json.dumps(model_export_data, indent=2))

    return {
        "artifact_path": str(out_path),
        "total_features": len(word_vec.vocabulary_) + len(char_vec.vocabulary_),
        "sha256": manifest_hash,
    }
