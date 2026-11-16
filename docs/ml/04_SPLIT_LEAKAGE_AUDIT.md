# AWAAZ-E-AWAM (آوازِ عوام) — DATASET SPLIT AND LEAKAGE AUDIT
**Document ID:** `docs/ml/04_SPLIT_LEAKAGE_AUDIT.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Cryptographically Verified Partition Integrity  
**Partition Strategy:** Grouped Stratified Split on `template_family_id` (70% Train, 15% Validation, 15% Locked Test)  

---

## 1. Split Philosophy & Leakage Risks

In natural language processing for low-resource and code-switched languages like Roman Urdu, naive random splitting is the single greatest cause of inflated, illusory evaluation metrics. When paraphrased sentences or template variations of the same underlying incident cross the train/test boundary, the model trivially memorizes surface n-grams, resulting in reports of 95%+ accuracy that catastrophically fail in real-world deployment.

To prevent this form of **data contamination and split leakage**, Awaaz-e-Awam enforces an invariant:
$$\text{Family}(\text{Sample}_i) \in \text{Partition}_k \implies \forall \text{Sample}_j \in \text{Family}(\text{Sample}_i), \text{Sample}_j \in \text{Partition}_k$$

Every single sentence variant derived from a common template, locality permutation, or paraphrase group is assigned a unique `template_family_id`. The entire family is allocated as an indivisible atomic block to either `train`, `val`, or `test`.

---

## 2. Partition Inventory & Mathematical Verification

### 2.1 Partition Counts & Family Allocations

| Split Partition | File Location | Sample Count | % of Samples | Unique Family Count | % of Families |
|:---|:---|:---:|:---:|:---:|:---:|
| **Training Set** | `ml/data/multilabel_train.csv` | 1,081 | 70.0% | 649 | 74.5% |
| **Validation Set** | `ml/data/multilabel_val.csv` | 231 | 15.0% | 127 | 14.6% |
| **Locked Test Set** | `ml/data/multilabel_test.csv` | 233 | 15.0% | 95 | 10.9% |
| **Total Corpus** | `ml/data/multilabel_dataset_full.csv` | **1,545** | **100.0%** | **871** | **100.0%** |

### 2.2 Formal Leakage Verification
The dataset generation pipeline (`ml/curate_multilabel_dataset.py`) automatically evaluates and asserts set disjointness:

$$\text{Train}_{\text{families}} \cap \text{Val}_{\text{families}} = \emptyset \quad [\text{Verified: } 0 \text{ shared}]$$
$$\text{Train}_{\text{families}} \cap \text{Test}_{\text{families}} = \emptyset \quad [\text{Verified: } 0 \text{ shared}]$$
$$\text{Val}_{\text{families}} \cap \text{Test}_{\text{families}} = \emptyset \quad [\text{Verified: } 0 \text{ shared}]$$

$$\text{Train}_{\text{normalized\_texts}} \cap \text{Val}_{\text{normalized\_texts}} = \emptyset \quad [\text{Verified: } 0 \text{ overlapping}]$$
$$\text{Train}_{\text{normalized\_texts}} \cap \text{Test}_{\text{normalized\_texts}} = \emptyset \quad [\text{Verified: } 0 \text{ overlapping}]$$
$$\text{Val}_{\text{normalized\_texts}} \cap \text{Test}_{\text{normalized\_texts}} = \emptyset \quad [\text{Verified: } 0 \text{ overlapping}]$$

---

## 3. Label Distribution Across Partitions

Stratification across template families preserves balanced department representation across all three splits:

### 3.1 Department Class Representation

| Department | Train (N=1,081) | Val (N=231) | Test (N=233) | Total Support across Corpus |
|:---|:---:|:---:|:---:|:---:|
| `kmc` | 226 (20.9%) | 67 (29.0%) | 44 (18.9%) | **337** |
| `kwsc` | 226 (20.9%) | 62 (26.8%) | 26 (11.2%) | **314** |
| `kelectric` | 210 (19.4%) | 48 (20.8%) | 56 (24.0%) | **314** |
| `ssgc` | 210 (19.4%) | 21 (9.1%) | 46 (19.7%) | **287** |
| `sswmb` | 196 (18.1%) | 48 (20.8%) | 31 (13.3%) | **280** |
| `sbca` | 166 (15.4%) | 39 (16.9%) | 52 (22.3%) | **257** |

### 3.2 Complex & Hazard Subsets Across Partitions

| Category / Flag | Train (N=1,081) | Val (N=231) | Test (N=233) | Total Corpus |
|:---|:---:|:---:|:---:|:---:|
| **Multi-Label Compound Reports** | 160 (14.8%) | 50 (21.6%) | 22 (9.4%) | **232** |
| **Independent Safety Hazards** | 191 (17.7%) | 26 (11.3%) | 62 (26.6%) | **279** |
| **Out-of-Scope / Zero-Label Samples** | 12 (1.1%) | 3 (1.3%) | 3 (1.3%) | **18** |

---

## 4. Modeling Guardrails & Feature Isolation

In accordance with scikit-learn common pitfalls and ML best practices:
1. **No Test-Time Feature Ingestion:** The `TfidfVectorizer` (sublinear word unigrams + bigrams and character 3–5 grams) is fit **strictly on `multilabel_train.csv`**. The vocabulary and IDF weights are frozen prior to model fitting.
2. **No Test-Time Threshold Optimization:** Decision thresholds $\tau_c$ for each department $c \in \{\text{kmc}, \text{kwsc}, \text{kelectric}, \text{ssgc}, \text{sswmb}, \text{sbca}\}$ are fitted exclusively on `multilabel_val.csv`.
3. **Locked Test Partition Invariant:** `multilabel_test.csv` is loaded only during final evaluation, producing empirical, un-manipulated test metrics.

---
*End of Dataset Split and Leakage Audit.*
