# Awaaz-e-Awam Phase V11.4 — Model Failure Analysis & Empirical Audit

**Project:** Awaaz-e-Awam (آوازِ عوام) — Civic Complaint Intelligence  
**Phase:** V11.4  
**Date:** November 17, 2026  
**Auditor:** Principal Applied ML Engineer & NLP Researcher  
**Target Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Baseline Model Audited:** Phase V11.3 Champion Model (`data/v11/curriculum_runs/run_001/champion_model.joblib`)  
**SHA-256:** `a29a91cf8b9c5aed427710ce8e6d2c5bfcadcab817f600405d16a18b4b3b5892`  
**Candidate JSON:** `data/v11/curriculum_runs/run_001/candidate_model.json`  
**SHA-256:** `4211343e40823fdec706ec8838ef56e8e6c8bf56f3959ef8992fd785e012295e`

---

## 1. Executive Summary & Diagnosis

In Phase V11.3, an autonomous 5-cycle curriculum training factory generated 6,000 unique synthetic complaints across Levels 1–5, evaluated against 250 frozen synthetic validation and 250 frozen synthetic test complaints. While Level 3 (causal consequence suppression) achieved an 83.33% exact-set match, the overall candidate model **failed to satisfy reliable routing criteria**:

1. **Catastrophic Failure on Independent Multi-Department Complaints (Level 4):**
   - Exact department-set accuracy on held-out test families collapsed to **16.39%** (10 / 61 correct).
   - False-extra department assignment rate was **83.61%** (51 / 61 cases had hallucinated extra departments).
   - Missed-department rate was **39.34%** (24 / 61 cases missed a genuine actionable defect).
2. **Elevated False-Extra Department Rate Across Held-Out Test:**
   - Overall false-extra rate on the 250 held-out test set was **38.00%**, yielding an exact-set accuracy of only **49.60%** (CI 95%: [43.2%, 56.4%]).
3. **Audit of the Historical 33 Developer-Authored Fixtures:**
   - In the V11.3 run report, the legacy fixtures were reported as **27.27% exact match** and **72.73% false extras**.
   - **Critical Root-Cause Discovery:** Investigation revealed a schema mismatch in `scheduler.py`: `locked_gold.jsonl` stores labels under `r["issues"][*]["department_key"]`, whereas synthetic curriculum records store `r["department_labels"]`. Calling `r.get("department_labels", [])` evaluated ground truth `y_true` to empty lists `[]` for all 33 fixtures. Thus, every time the model made any valid prediction (24/33), the evaluation scored it as a "false extra" (24/33 = 72.73%) and scored exact match only when the model predicted no department at all (9/33 = 27.27%).
   - **True Performance on 33 Fixtures:** When scored against the actual `issues` ground truth, V11.3 achieved **66.67% exact match** (22 / 33), **6.06% false extras** (2 / 33), and **30.30% misses** (10 / 33).
   - While better than the flawed artifact report, 66.67% represents a clear regression from V11.2A's 81.82%, driven by aggressive threshold tuning (e.g. KWSC threshold elevated to 0.60) and overly restrictive affirmative regexes.

---

## 2. Quantitative Baseline Breakdown

### 2.1 Frozen Synthetic Test Set (N = 250)

| Metric | V11.3 Reported / Verified | Target Benchmark | Status |
|---|---|---|---|
| **Exact Department-Set Match** | **49.60%** (124 / 250) | $\ge 80.00\%$ | **FAILED** |
| **Exact Match 95% CI** | [43.2%, 56.4%] | — | High Variance |
| **Macro F1 Score** | 0.6804 | $\ge 0.85$ | Substandard |
| **Micro F1 Score** | 0.7076 | $\ge 0.85$ | Substandard |
| **False-Extra Department Case Rate** | **38.00%** (95 / 250) | $< 10.00\%$ | **FAILED** |
| **Missed Department Case Rate** | **24.12%** (59 / 250) | $< 10.00\%$ | **FAILED** |
| **Mean Brier Calibration Score** | 0.0925 | $< 0.05$ | Moderate |

### 2.2 Difficulty Slice Performance

| Curriculum Level | Description | Count | Exact Set Accuracy | False-Extra Rate | Missed Rate |
|---|---|---|---|---|---|
| **Level 1** | Obvious Single Issue (Canonical) | 43 | 44.19% | 41.86% | 39.53% |
| **Level 2** | Informal Single Issue (Noisy / Slang) | 50 | 56.00% | 26.00% | 26.00% |
| **Level 3** | Causal Consequence Decoy | 48 | **83.33%** | 8.33% | 8.33% |
| **Level 4** | Independent Multi-Department Issues | 61 | **16.39%** | **83.61%** | **39.34%** |
| **Level 5** | Negations / Recipient / Spatial / Vague | 48 | 56.25% | 18.75% | 35.42% |

### 2.3 Per-Department Precision & Recall Breakdown

| Department | Support | Precision | Recall | F1 Score | Brier Score | Tuned Threshold |
|---|---|---|---|---|---|---|
| **KMC** | 49 | 0.6613 | 0.8367 | 0.7387 | 0.0831 | 0.48 |
| **KWSC** | 56 | 0.8095 | 0.6071 | 0.6939 | 0.0840 | 0.60 |
| **K-Electric** | 54 | 0.5347 | 1.0000 | 0.6968 | 0.1016 | 0.25 |
| **SSGC** | 54 | 0.5417 | 0.9630 | 0.6933 | 0.1050 | 0.25 |
| **SSWMB** | 49 | 1.0000 | 0.1633 | 0.2807 | 0.1357 | 0.25 |
| **SBCA** | 49 | 1.0000 | 0.9592 | 0.9792 | 0.0457 | 0.28 |

---

## 3. Root Cause Analysis of Core Failures

### 3.1 Failure Mode A: Global Linear Model Concatenation Dilemma (Level 4)

In V11.3, complaints are classified as a single monolithic bag-of-words / character n-gram text vector:
$$\mathbf{x} = \text{FeatureUnion}(\text{TfidfVectorizer}_{\text{word}}, \text{TfidfVectorizer}_{\text{char\_wb}})(\text{text})$$
For each department $d$, the raw logit is:
$$z_d = \mathbf{w}_d^T \mathbf{x} + b_d, \quad p_d = \sigma(z_d)$$

When a citizen submits a compound complaint joining two distinct physical defects (e.g. `sarkari pani ki supply band hai` + `electric pole par spark ho raha hai`), the document length doubles and the relative term frequency of words from each department is halved ($\text{TF} = \frac{count}{total}$).
Simultaneously:
1. Low thresholds tuned during validation (e.g., $0.25$ for K-Electric and SSGC) cause background co-occurrence tokens (such as `gali`, `masla`, `area`, `line`) to push $p_{\text{kelectric}}$ and $p_{\text{ssgc}}$ slightly above $0.25$, creating phantom secondary departments.
2. High thresholds (e.g., $0.60$ for KWSC) mean that the diluted water signal ($p_{\text{kwsc}} \approx 0.52$) drops below the threshold, causing a false negative.
3. As a result, the model predicts either three departments instead of two (false extra), or predicts the wrong combination entirely.

### 3.2 Failure Mode B: Conflation of Connectors (`aur`) with Independence

A simplistic keyword or connector assumption fails because Roman Urdu uses `aur` for both coordination of independent faults and elaboration of symptoms:
- **Independent:** `"sarak mein khadda hai aur alag se public water line phati hui hai"` $\rightarrow$ KMC + KWSC.
- **Consequence:** `"bijli nahi hai aur is wajah se paani ki motor nahi chal rahi"` $\rightarrow$ K-Electric only.
- **Predicate coordination on one asset:** `"road tooti hai aur bohot kharab hai"` $\rightarrow$ KMC only.

Without span segmentation that extracts independent subject-predicate clauses, the classifier treats every coordinated clause as equal bag-of-words fodder.

### 3.3 Failure Mode C: Asymmetric Token Suppression in Post-Processing

In V11.3, `CivicRelationResolver` was introduced to fix causal decoys. While it succeeded at Level 3 (83.33%), its monolithic regex rules had unintended side effects on real text:
1. **False SBCA Suppression:** A rule required affirmative tokens like `"illegal building"`, `"noc"`, `"chajja"`. When an authentic complaint described structural hazards using real construction terminology (`"cracks in main load-bearing pillars of apartment complex"` or `"compulsory open space COS par illegal dukan"`), the rule failed to match, suppressing SBCA probability down to 0.05 and missing the issue.
2. **Water Pressure Misattribution:** High water pressure issues were mistakenly parsed by the classifier as gas pressure due to the shared token `"pressure"`, and when suppressed, left KWSC below its $0.60$ threshold.

---

## 4. Detailed Audit of the 33 Historical Developer Fixtures

The 33 fixtures in `data/v11/human_gold/locked_gold.jsonl` were re-evaluated with full trace inspection.

### 4.1 Ground-Truth Schema Rectification
- Previous score in `run_report.json`: Exact Set = 27.27%, False Extra = 72.73%.
- **Corrected score:** Exact Set = 66.67% (22 / 33), False Extra = 6.06% (2 / 33), Missed = 30.30% (10 / 33).
- **Explanation:** The evaluation harness queried `r.get("department_labels", [])` instead of `[iss["department_key"] for iss in r.get("issues", [])]`. This scored every correct single prediction as a false extra and rewarded empty predictions.

### 4.2 Analysis of the 10 Missed Fixtures

| Record ID | Text Excerpt | Expected | Predicted | Root Cause |
|---|---|---|---|---|
| `gold_aea_ml_00268` | `water pressure intihai kam hai motor chalany par...` | `['kwsc']` | `[]` | $p_{\text{kwsc}} = 0.407$, but KWSC threshold was tuned to $0.60$. Missed due to overly conservative threshold. |
| `gold_aea_ml_00293` | `open manhole in dark corner covers missing KW&SC...` | `['kwsc']` | `[]` | $p_{\text{kwsc}} = 0.246$. English mixed phrasing diluted Roman Urdu features. |
| `gold_aea_ml_00689` | `fourth floor constructed on weak single-story foundations...` | `['sbca']` | `[]` | $p_{\text{sbca}} = 0.111 < 0.28$. Foundation defect phrased in English. |
| `gold_aea_ml_00008` | `street light ka khamba toota hua hai andhera...` | `['kmc']` | `['kelectric']` | Street light pole damaged; model classified as K-Electric rather than KMC municipal lighting. |
| `gold_aea_ml_00699` | `dilapidated building wall bowing outward collapse...` | `['sbca']` | `['kmc', 'sbca']` | False extra: KMC triggered ($p = 0.520 \ge 0.48$) due to `"street"` token. |
| `gold_aea_ml_00542` | `sswmb complaints cell not responding to trash...` | `['sswmb']` | `[]` | SSWMB raw prob was 0.057. English ticket reference not in vocabulary. |
| `gold_aea_ml_00659` | `residential bungalow ko commercial school aur hospital...` | `['sbca']` | `[]` | Commercial conversion; SBCA probability 0.068. |
| `gold_aea_ml_00672` | `cracks in main load-bearing pillars of apartment...` | `['sbca']` | `[]` | Suppressed by `CivicRelationResolver`: lacked specific Urdu SBCA keyword. |
| `gold_aea_ml_00664` | `basement excavation without shoring neighboring house...` | `['sbca']` | `[]` | $p_{\text{sbca}} = 0.224 < 0.28$. |
| `gold_aea_ml_00550` | `garbage bin missing stolen provide new heavy plastic...` | `['sswmb']` | `[]` | $p_{\text{sswmb}} = 0.147 < 0.25$. |
| `gold_aea_ml_00655` | `compulsory open space COS par illegal dukan bana...` | `['sbca']` | `[]` | Suppressed by `CivicRelationResolver`: lacked specific Urdu SBCA keyword. |

---

## 5. Architectural Remedies Required for V11.4

To address these empirical failures, Phase V11.4 must transition from monolithic text classification to an **Issue-Centric, Span-Grounded, Relation-Aware Architecture**:

1. **Clause & Candidate Span Segmentation (P1):**
   - Segment incoming text into candidate clause spans while preserving exact character offsets.
   - Do not assume every `"aur"` is an independent issue; classify whether `"aur"` coordinates verbs, predicates, or separate physical incident clauses.
2. **Typed IssueCandidate Contract & Relation Resolution (P2):**
   - Extract `IssueCandidate` objects with asset, defect predicate, actionable status, and negation scope.
   - Construct a typed pairwise relation graph (`SINGLE`, `CAUSES`, `INDEPENDENT`, `SAME_INCIDENT_DIFFERENT_REPAIRS`, `MENTION_ONLY`, `RECIPIENT_ONLY`, `SPATIAL_PROXIMITY_ONLY`, `NEGATED`, `UNCERTAIN`).
3. **Per-Actionable-Issue Department Assignment with Affirmative Evidence Gating (P3):**
   - Classify each actionable issue span independently using domain evidence.
   - Enforce positive defect evidence: never assign SSGC without affirmative gas evidence; never assign SBCA without affirmative building/structural evidence.
   - Distinguish `INCOMPLETE_PUBLIC_LOCATION` from model uncertainty (`UNCERTAIN_DEFECT`).
4. **Python & TypeScript Parity (P4):**
   - Implement matching span extraction, relation logic, and evidence gating in both Python and TypeScript with unit tests verifying identical results.

---

## 6. Audit Sign-off

- **Status:** V11.3 model rejected as candidate for promotion.
- **Action:** Retain V11.3 artifacts as read-only diagnostic baseline. Proceed with V11.4 relation-aware pipeline implementation.
