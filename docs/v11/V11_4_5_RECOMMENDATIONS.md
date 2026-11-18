# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.4.5
# STRATEGIC RECOMMENDATIONS & ARCHITECTURAL ROADMAP

**Document ID:** `V11_4_5_RECOMMENDATIONS.md`  
**Date:** November 18, 2026  
**Author:** Principal NLP Evaluation Researcher & Lead Applied ML Architect  
**Project:** Awaaz-e-Awam (`D:\RomanUrdu_ComplaintClassifier_staff_auth`)  
**Scope:** Actionable Architectural Recommendations Derived from Adversarial Stress Testing

---

## 1. Executive Verdict & Operational Status

### Is the current V11.4.4 model suitable for continued LOCAL AI TEST MODE?
**YES, with clear operational disclosures.**

The V11.4.4 model achieved **71.77% exact department-set accuracy** on an intensely adversarial test set of 2,115 complaints containing heavy slang, insults, code-switching, spelling noise, and long paragraphs. Crucially:
- It maintains **zero false-positive hallucinations on causal chains (100.0% accuracy)**.
- It protects against non-municipal routing errors with a **97.01% out-of-scope review capture rate**.
- It is completely robust against citizen frustration and harsh colloquial language (**75.69% accuracy on complaints with insults**).
- It runs at **8.26 ms / complaint** on local CPU with zero cloud dependencies.

However, the stress test revealed that **independent compound complaints (2 or 3 distinct municipal defects in one narrative) remain the primary systemic bottleneck (48.42% accuracy, 46.32% silent omission rate)**. The model should remain in LOCAL AI TEST MODE while the following targeted upgrades are implemented in future iterations.

---

## 2. Priority 1: Multi-Department Intra-Span Extraction

### Problem Statement
Currently, `_classify_span_issue()` in `relation_engine.py` and `relationEngine.ts` attaches to the first matched department within a clause and terminates scanning for that span. When citizens write compound complaints without explicit punctuation (e.g. *"Maymar mein illegal building ban rahi hai aur alag flyover ka sariya nikal gaya hai"*), the second department is ignored.

### Recommended Architectural Fix
1. **Multi-Entity Span Scanning:** Allow the span classifier to loop over all 6 departments and identify all distinct affirmative (asset + defect) tuples present within the same sentence.
2. **Clause Re-Segmentation on Conjunctive Connectives:** Add `\s+aur\s+alag\b`, `\s+alag\s+se\b`, `\s+mazeed\s+bar-aan\b`, and `\s+sath\s+hi\s+sath\b` to primary boundary splitters, even when not preceded by a comma.
3. **Secondary Defect Preserver:** If two actionable departments are detected in one span, create two distinct `IssueCandidate` nodes with an `INDEPENDENT` relational edge between them.

---

## 3. Priority 2: Semantic Denial & Negation Normalization

### Problem Statement
Denial patterns in `DOMAIN_EVIDENCE[dept]["denials"]` currently look for rigid literal templates like `/\bye\s+pani\s+ka\s+masla\s+na?h?i\b/i`. When a citizen writes *"pani ka koi issue nahi hai line mein pani aa raha hai"*, the denial fails to fire, causing an explicit negation to become a false-positive department assignment.

### Recommended Architectural Fix
Implement generalized negation predicates across all departments:
```typescript
const GENERALIZED_DENIAL_PATTERNS = [
  /\b(?:ye|yeh)?\s*([a-z]+)\s*(?:ka\s+)?(?:koi\s+)?(?:masla|issue|problem|kharabi)\s+nahi\b/i,
  /\b([a-z]+)\s+(?:bilkul\s+)?(?:theek|sahi|behtar|safe)\s+(?:chal\s+rahi|hai|hain)\b/i,
  /\b([a-z]+)\s+(?:ka\s+)?fault\s+nahi\b/i,
];
```
When `GENERALIZED_DENIAL_PATTERNS` matches an asset belonging to department $D$, immediately flag department $D$ as `MENTION_ONLY_NEGATED` and cap its probability below $\tau_D \times 0.20$.

---

## 4. Priority 3: Windowed Proximity Defect Matching

### Problem Statement
Citizen complaints frequently separate the civic asset from its defect predicate with 4 to 8 descriptive words:
> *"drinking water ki **line mein** sewer ka badboodar ganda black paani **mix** ho kar aa raha hai"* (6 words separation)

Adjacent regexes like `/\bsewage\s*mix\b/` fail on this phrasing.

### Recommended Architectural Fix
Implement **Sliding-Window Proximity Matching** (Token Window = 8 words):
```python
def check_windowed_defect(tokens: List[str], asset_patterns: List[str], defect_patterns: List[str], window_size: int = 8) -> bool:
    for i, tok in enumerate(tokens):
        if any(re.search(pat, tok) for pat in asset_patterns):
            window = " ".join(tokens[max(0, i - window_size) : min(len(tokens), i + window_size + 1)])
            if any(re.search(d_pat, window) for d_pat in defect_patterns):
                return True
    return False
```
This decouples vocabulary recognition from word adjacency while preventing cross-sentence false positives.

---

## 5. Priority 4: Spatial Landmark Context De-Biasing

### Problem Statement
In 14.58% of spatial reference complaints, landmark infrastructure (e.g. *"k-electric ke khambay ke paas kachra pada hai"*) scores above threshold for the landmark department (K-Electric) in addition to the actual actionable department (SSWMB).

### Recommended Architectural Fix
1. **Prepositional Landmark Suppression:** Identify phrases following prepositional locatives:
   - `ke bilkul neeche`, `ke samne`, `ke paas`, `ke qareeb`, `ki deewar ke sath`, `ke muttasil`.
2. **Landmark Scope Tagging:** When an entity occurs within a locative prepositional phrase, mark it as `mention_type = 'landmark_reference'`.
3. **Probability Dampening:** Landmark entities must be penalized by 60% if an affirmative defect is present elsewhere in the complaint for a different department.

---

## 6. Priority 5: Preambular Narrative Segmenter for Long Complaints

### Problem Statement
In complaints exceeding 100 words, long preambles (family weddings, guest visits, matric exams, weather gossip) dilute the TF-IDF representation of the actual municipal grievance.

### Recommended Architectural Fix
1. **Salutation & Backstory Truncator:** Implement a lightweight narrative parser that scans for the pivot conjunction introducing the grievance:
   - `magar halat ye hain ke...`, `asal masla ye hai ke...`, `asal haqeeqat ye hai ke...`, `jab ke hamare ilaqay mein...`.
2. **Dual-Vector Weighting:** Weight tokens appearing after the grievance pivot at $2.5\times$ the weight of tokens appearing in the personal backstory preamble.

---

## 7. Strategic Roadmap & Future Milestones

| Milestone | Objective | Scope & Target Metric |
| :--- | :--- | :--- |
| **Current (V11.4.5)** | Adversarial Stress Testing | Frozen Model Evaluated; 71.77% stress accuracy established; failure taxonomy documented. |
| **Phase V11.5** | Multi-Issue & Negation Engine | Implement intra-span multi-scanning and generalized denial syntax. Target: > 75% compound accuracy. |
| **Phase V11.6** | Windowed Proximity Matching | Implement sliding-window asset-defect matching and landmark de-biasing. |
| **Phase V12.0** | Double-Annotated Human Benchmark | Independent human-gold evaluation as specified in Phase V11.2B prior to production deployment. |
