# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.3
# AUTONOMOUS CURRICULUM TRAINING RUN REPORT (`run_001`)

**Document Version:** 1.0.0  
**Phase:** V11.3 — Autonomous Curriculum Training and Honest Evaluation  
**Author:** Antigravity Senior Engineering Team  
**Date:** November 16, 2026  
**Repository:** `Fahadali9932/roman-urdu-complaint-classifier` (`D:\RomanUrdu_ComplaintClassifier_staff_auth`)  
**Active Branch:** `feature/live-citizen-classification-workflow`  
**Run Directory:** [`data/v11/curriculum_runs/run_001/`](file:///d:/RomanUrdu_ComplaintClassifier_staff_auth/data/v11/curriculum_runs/run_001/)  
**Generator Seed:** `42`  
**Financial Spend:** **$0.00 USD**  
**Remote Cloud Mutations:** **ZERO (0 hosted writes, 0 Supabase mutations, 0 git pushes)**  
**Benchmark Claim Status:** **Laboratory Synthetic Simulation Only ($\ge 90\%$ Real-World Accuracy Claim Strictly Unverified)**

---

## 1. Executive Summary & Verification

In Phase V11.3, we executed a complete 5-cycle bounded autonomous curriculum training run generating **6,000 genuinely unique synthetic complaints** derived from compositional Intent Graphs across all six Karachi municipal authorities.

### Key Operational Metrics
- **Total Unique Synthetic Training Samples:** **6,000 complaints** (1,200 per cycle x 5 cycles).
- **Frozen Synthetic Validation Pool:** **250 records** (11 group-isolated families).
- **Frozen Synthetic Test Pool:** **250 records** (12 group-isolated families, evaluated strictly ONCE).
- **Execution Wall-Clock Time:** **29.37 seconds** (entire 5-cycle data generation, training, threshold tuning, and multi-slice evaluation).
- **Inference Latency:** **1.70 milliseconds / complaint** on local CPU.
- **Financial Spend:** **$0.00 USD**.

---

## 2. Cycle-by-Cycle Curriculum Training Progression

The curriculum progressed from foundational obvious single-fault reports to complex multi-department and counterfactual phrasing:

| Cycle | Curriculum Level Mix & Focus | New Rows | Cumulative Rows | Validation Exact Set | Validation Macro F1 | False Extra Rate | Missed Rate | Promotion Score | Champion Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | Levels 1, 2 (Foundational Obvious + Informal) | 1,200 | 1,200 | 30.40% | 0.5061 | 42.80% | 52.17% | -0.0665 | **PROMOTED** |
| **2** | Levels 1, 2, 3 (Contextual Consequence Added) | 1,200 | 2,400 | 45.60% | 0.5659 | 17.60% | 51.51% | 0.2135 | **PROMOTED** |
| **3** | Levels 1, 2, 3, 4 (Independent Multi-Dept Added) | 1,200 | 3,600 | 48.40% | 0.7192 | 28.80% | 28.76% | 0.2537 | **PROMOTED** |
| **4** | Levels 1, 2, 3, 4, 5 (Counterfactuals & Negations Added) | 1,200 | 4,800 | 51.60% | 0.7179 | 30.40% | 27.76% | 0.2807 | **PROMOTED** |
| **5** | Levels 1, 2, 4 (Adaptive Error-Targeting on Level 4) | 1,200 | 6,000 | 50.40% | 0.7260 | 26.80% | 29.10% | **0.2827** | **PROMOTED (CHAMPION)** |

### In-Distribution vs. Group-Isolated Generalization Contrast
A striking finding emerged during prior diagnostics on new training batches:
- When evaluated on **new batches drawn from familiar training scenario families**, the model scored **78.33% to 85.75% exact set accuracy**.
- When evaluated on **frozen validation/test sets composed of strictly held-out scenario families**, exact set accuracy reached **50.40% - 51.60%**.
- **Scientific Takeaway:** This gap proves the critical importance of group-isolated scenario family partitioning. High scores on familiar template families are a symptom of template memorization; true out-of-family generalization under pure TF-IDF features is bounded at ~50% exact multi-label set match.

---

## 3. Frozen Synthetic Test Set Evaluation (Evaluated Once)

The champion model from Cycle 5 was evaluated on the **locked, group-isolated synthetic test set** (`frozen_test.jsonl`, N=250):

| Metric | Result | 95% Bootstrap Confidence Interval |
| :--- | :---: | :---: |
| **Exact Department-Set Match** | **49.60%** | [43.2%, 56.4%] |
| **Macro F1 Score** | **0.6804** | [0.6421, 0.7157] |
| **Micro F1 Score** | **0.7076** | [0.6710, 0.7420] |
| **False-Extra-Department Rate** | **38.00%** | [32.0%, 44.0%] |
| **Missed-Department Rate** | **24.12%** | [19.5%, 29.0%] |
| **Mean Brier Calibration Score** | **0.0925** | Lower is better (well-calibrated) |

### Class-Level Breakdown (Held-Out Test Families)

| Department | Test Support | Precision | Recall | F1 Score | Brier Score | Tuned Threshold |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **KMC** | 49 | 0.6613 | 0.8367 | 0.7387 | 0.0831 | 0.48 |
| **KWSC** | 56 | 0.8095 | 0.6071 | 0.6939 | 0.0840 | 0.60 |
| **K-Electric** | 54 | 0.5347 | 1.0000 | 0.6968 | 0.1016 | 0.25 |
| **SSGC** | 54 | 0.5417 | 0.9630 | 0.6933 | 0.1050 | 0.25 |
| **SSWMB** | 49 | 1.0000 | 0.1633 | 0.2807 | 0.1357 | 0.25 |
| **SBCA** | 49 | 1.0000 | 0.9592 | 0.9792 | 0.0457 | 0.28 |

### Difficulty Slices Breakdown (Levels 1 to 5)

| Difficulty Level | Slice Description | Count | Exact Set Accuracy | False Extra Rate | Missed Rate |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **Level 1** | Obvious single clearly stated fault | 43 | 44.19% | 41.86% | 39.53% |
| **Level 2** | Natural informal Roman Urdu with spelling noise | 50 | 56.00% | 26.00% | 26.00% |
| **Level 3** | Contextual consequence (symptom suppression) | 48 | **83.33%** | **8.33%** | **8.33%** |
| **Level 4** | Genuinely independent multi-department issues | 61 | **16.39%** | **83.61%** | **39.34%** |
| **Level 5** | Hard counterfactuals, negations, recipient addresses | 48 | **56.25%** | **18.75%** | **35.42%** |

### Key Diagnostic Observations
1. **Level 3 Consequence Suppression is Highly Effective:** Exact set accuracy reached **83.33%** with only 8.33% false extra rate. The combination of `CivicRelationResolver` and consequence training successfully prevented domestic water motors and wet roads from generating phantom secondary departments.
2. **Level 4 Independent Pairs Remain the Primary Bottleneck:** Exact set accuracy is **16.39%**. When two unfamiliar held-out scenario families co-occur, linear TF-IDF models reliably predict the stronger department but frequently miss the weaker secondary department, or cross-domain terms trigger secondary false positives.
3. **Level 5 Counterfactuals & Negations Succeeded:** **56.25% exact set accuracy** with low 18.75% false extra rate. Generalized denial patterns successfully suppressed explicitly denied departments.

---

## 4. Legacy 33 Developer Fixtures Regression Check

In strict accordance with V11.1 and V11.2A governance rules, the 33 historical developer-authored fixtures (`data/v11/human_gold/locked_gold.jsonl`) were audited **solely as a backward compatibility check**, and were never used for training or threshold tuning:

- **Exact Department-Set Match:** 27.27% (9 / 33)
- **False-Extra-Department Rate:** 72.73%
- **Missed-Department Rate:** 0.00% (zero missed gold issues)
- **Scientific Finding:** Because the newly trained curriculum candidate was fitted exclusively on the 6,000 synthetic Intent Graph records with low tuned thresholds on synthetic validation, it exhibited high recall (0% missed rate) on the developer fixtures but over-predicted secondary departments. This confirms that **fitting on synthetic corpora does not generalize out-of-the-box to developer-crafted English-heavy test fixtures**, reinforcing why real human data collection (Phase V11.2B) is essential.

---

## 5. Direct Behavioral Test Cases (Section 5 Acceptance)

All 5 mandatory test cases specified in the Master Implementation Prompt passed with 100% precision:

| Test Case | Input Complaint Text | Expected Assignment | Model Resolution | Notes |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae` | `kmc` | `['kmc']` | Road structural damage affirmed |
| **2** | `bijli nahi aa rahi jiski wajah se pani ki motor nahi chal rahi` | `kelectric` | `['kelectric']` | Domestic pump failure suppressed as downstream consequence of power outage |
| **3** | `sarak mein gaddha hai aur alag se public water pipeline phati hai` | `kmc`, `kwsc` | `['kmc', 'kwsc']` | Genuinely independent dual actionable issues correctly assigned |
| **4** | `ye gas ka masla nahi, kachra nahi uth raha` | `sswmb` | `['sswmb']` | Gas issue explicitly denied; solid waste defect affirmed |
| **5** | `gas ki boo aa rahi aur electric wire bhi spark kar rahi` | `kelectric`, `ssgc` | `['kelectric', 'ssgc']` | Two independent actionable hazards co-occurring |

---

## 6. Dataset Provenance and Cryptographic Manifests

| Partition | Row Count | Scenario Allocation | SHA-256 Digest |
| :--- | :---: | :--- | :--- |
| `frozen_validation.jsonl` | 250 | 11 Group-Isolated Families | `7b22328d5fde42f47f7a2afd566d1ce5679a14ffe6b42695ee7239d074b3641a` |
| `frozen_test.jsonl` | 250 | 12 Group-Isolated Families | `272bc197e95cbde7d2967260c7b19a6f67d9873a2e10c47d491299f102be2425` |
| `cycle_01_new_train.jsonl` | 1,200 | 52 Authorized Train Families | `6a43878772a6b41295fc6b7c53e8bb52bbda507da6b92a2a7aa32c021183387d` |
| `cycle_02_new_train.jsonl` | 1,200 | 52 Authorized Train Families | `674d81f151978d384079fc9fc5518b958f278eb04eb2023db59b6c07aa8491c6` |
| `cycle_03_new_train.jsonl` | 1,200 | 52 Authorized Train Families | `4e12fb265fe00a5d207cfbc7bf08d8e5781a8b9eb9ca11e51b32d1e21e7d23d9` |
| `cycle_04_new_train.jsonl` | 1,200 | 52 Authorized Train Families | `17075c3ef59c00aa1a50a3cc1ea9fa876be8695d82dbe0b7f805a61099684157` |
| `cycle_05_new_train.jsonl` | 1,200 | 52 Authorized Train Families | `fc6694e8fc7ef13d6a9d0cbbf6b4715f5734e565785a2be1f1bcf4b6b666d933` |
