# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.4.4
## COMPREHENSIVE TRAINING AND EVALUATION DATASET AUDIT

**Audit Date:** November 18, 2026  
**Auditor:** Principal Applied ML & Roman Urdu NLP Lead  
**Scope:** `data/v11/curriculum_runs/run_003/` and V11 Training Factory Partitions  
**Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Base Commit:** `45095a0`  

---

### 1. Executive Summary

As part of Phase V11.4.4, an exhaustive audit of the existing training and evaluation datasets in `data/v11/curriculum_runs/run_003/` was conducted. The goal was to audit record volumes, department balance, scenario families, structural relations, and empirically verify the word-length distribution of synthetic complaints.

#### Key Audit Takeaways:
1. **Total Records Audited:** 3,600 training complaints across 3 cycles (1,200/cycle), 250 frozen validation records, and 250 frozen prospective test records.
2. **Empirical Word Length Distribution (18–64 words):**
   - In `run_003`, all 3,600 training samples had word counts strictly between **18 and 64 words** (Overall Train Mean: 32.1 words).
   - Exactly **0 training records** had fewer than 18 words (short citizen alerts such as *"light nahi aa rahi"*, *"sadak tooti hui hai"* were absent).
   - Exactly **0 training records** had greater than 64 words (long-form citizen letters, multi-paragraph neighborhood petitions between 65 and 200 words were absent).
3. **Department Balance:** All 6 municipal departments are robustly represented in training (KMC: 737, KWSC: 755, K-Electric: 709, SSGC: 652, SSWMB: 612, SBCA: 602).
4. **Relational Diversity:** Multi-department and causal relations were trained, but lacked short colloquial variations and long-form sentence complexity, contributing to model failure on un-templated colloquial inputs.

---

### 2. Dataset Partition and Record Counts

| Partition File | Record Count | Source Kind | Scenario Families | Hash (SHA-256 Prefix) |
| :--- | :--- | :--- | :--- | :--- |
| `cycle_01_new_train.jsonl` | 1,200 | `synthetic_agent` | 46 Authorized Train Families | `672e8732...` |
| `cycle_02_new_train.jsonl` | 1,200 | `synthetic_agent` | 46 Authorized Train Families | `e685f8f5...` |
| `cycle_03_new_train.jsonl` | 1,200 | `synthetic_agent` | 309 Composed Pair Families | `55f05391...` |
| **Cumulative Training Total** | **3,600** | `synthetic_agent` | **Train Pool Only** | — |
| `frozen_validation.jsonl` | 250 | `synthetic_agent` | 11 Val Scenario Families | `9d554a99...` |
| `frozen_test.jsonl` | 250 | `synthetic_agent` | 12 Test Scenario Families | `97d549f2...` |
| `regression_cases.jsonl` | 31 | `developer_fixture` | 31 Fixed Regression Assertions | `99bc9006...` |

> [!NOTE]
> Group isolation between Train, Validation, and Test scenario families remains 100% strict with zero leakage. However, structural and length distribution gaps existed in `run_003`.

---

### 3. Word Length Distribution Analysis

An analysis of text length across all records revealed an unintended truncation window resulting from fixed sentence templates:

```
Run_003 Word Count Distribution:
  [0 - 17 words]:    0 records  (0.00%)  <-- Critical Gap: Short citizen alerts
  [18 - 30 words]: 1,675 records (46.53%)
  [31 - 45 words]: 1,518 records (42.17%)
  [46 - 64 words]:   407 records (11.31%)
  [65 - 100 words]:   0 records  (0.00%)  <-- Critical Gap: Detailed narratives
  [101 - 150 words]:  0 records  (0.00%)  <-- Critical Gap: Neighborhood petitions
  [151 - 200 words]:  0 records  (0.00%)  <-- Critical Gap: Formal multi-clause letters
```

#### Detailed Breakdown by Partition:
- **Cycle 1 (Foundational L1 & L2):**
  - Minimum: 18 words
  - Maximum: 41 words
  - Mean: 27.0 words
- **Cycle 2 (Contextual Consequences L3):**
  - Minimum: 18 words
  - Maximum: 48 words
  - Mean: 33.0 words
- **Cycle 3 (Independent Multi-Department L4):**
  - Minimum: 18 words
  - Maximum: 64 words
  - Mean: 36.3 words
- **Frozen Test Set:**
  - Minimum: 15 words
  - Maximum: 64 words
  - Mean: 36.1 words

#### Operational Impact of Length Truncation:
1. **Short-Form Vulnerability (L1: 5–20 words):** Citizens texting alerts like *"light nahi aa rahi"*, *"transformer blast ho gaya"*, or *"sadak toot gayi"* have few contextual tokens. When models are trained only on 18–64 word inputs containing extensive filler preambles (*"Janab aali hamare ilaqay..."*), the TF-IDF feature weights over-index on boilerplates, leaving short alerts under-confident.
2. **Long-Form Vulnerability (L4/L5: 100–200 words):** In longer citizen letters (e.g. 150 words), incidental vocabulary (e.g., mentioning drinking water shortage during power blackouts, traffic delays due to waste) causes term dilution, lowering primary defect class probabilities below calibrated thresholds.

---

### 4. Department Label Distribution in Training

The cumulative 3,600 training records contain 4,067 departmental assignments:

| Department | Label Count | Share of Total | Single-Issue Count | Multi-Issue Count |
| :--- | :--- | :--- | :--- | :--- |
| **KMC** (Roads, Drainage, Lights) | 737 | 18.12% | 524 | 213 |
| **KWSC** (Water Supply, Sewerage) | 755 | 18.56% | 511 | 244 |
| **K-Electric** (Power, Voltage, Transformers) | 709 | 17.43% | 522 | 187 |
| **SSGC** (Gas Pressure, Leaks) | 652 | 16.03% | 517 | 135 |
| **SSWMB** (Solid Waste, Garbage Dumps) | 612 | 15.05% | 529 | 83 |
| **SBCA** (Illegal Construction, Cracks) | 602 | 14.80% | 530 | 72 |
| **Total Assignments** | **4,067** | **100.0%** | **3,133** | **934** (in 467 dual pairs) |

---

### 5. Issue Complexity and Relation Types in Training

| Relation Edge Type | Count | Percentage | Description |
| :--- | :--- | :--- | :--- |
| **SINGLE_INFORMAL** | 1,174 | 32.61% | Informal Roman Urdu colloquial single issue |
| **SINGLE** | 1,114 | 30.94% | Standard grammatical single civic issue |
| **CAUSES_CONTEXT_ONLY** | 845 | 23.47% | Causal consequence (e.g. power out causes pump stop) |
| **INDEPENDENT** | 332 | 9.22% | Two independent defects in different locations |
| **SAME_INCIDENT_DIFFERENT_REPAIRS** | 135 | 3.75% | Single physical excavation requiring dual repairs |
| **Total** | **3,600** | **100.0%** | |

#### Single vs. Multi-Issue Distribution:
- **Single-Department Records:** 3,133 (87.03%)
- **Dual-Department Records:** 467 (12.97%)
- **Zero-Department Records in Train:** 0 (0.00%) — *Review triage cases were reserved for validation/test partitions.*

---

### 6. Identified Weaknesses and Synthesis Plan for V11.4.4

1. **Implement 5 Explicit Length Tiers (L1 to L5):**
   - **Tier L1 (5–20 words):** Direct, terse alerts (*"light nahi aa rahi"*, *"gutter ubal raha hai"*, *"road toota hua hai"*).
   - **Tier L2 (21–50 words):** Standard complaints with street/location preambles.
   - **Tier L3 (51–100 words):** Multi-sentence explanations detailing duration and local impact.
   - **Tier L4 (101–150 words):** Community complaints with civic history, failed prior calls, and background context.
   - **Tier L5 (151–200 words):** Formal citizen petitions with salutations, historical grievances, multiple clauses, and explicit calls to action.
2. **Expand Roman Urdu Colloquial Lexicon & Normalizer:**
   - Add informal phonetic variations: `nhi` $\to$ `nahi`, `aarhi`/`arhi` $\to$ `aa rahi`, `aarha`/`arha` $\to$ `aa raha`, `waja` $\to$ `wajah`, `h` $\to$ `hai`, `khrab` $\to$ `kharab`, `gy` $\to$ `gayi`.
3. **Address Causal Electric/Water Consequence Mismatch:**
   - Enhance the relation engine affirmative defect grounding so that electricity outage expressions (`light nahi aa rahi`, `current nahi hai`, `voltage kam hai`) ground K-Electric as primary actionable defect, preventing score suppression to 13%.
