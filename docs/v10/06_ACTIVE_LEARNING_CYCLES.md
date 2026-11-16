# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 BOUNDED ACTIVE LEARNING REPORT
**Document ID:** `docs/v10/06_ACTIVE_LEARNING_CYCLES.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Active Learning Audit  

---

## 1. Active Learning Architecture & Policy

To avoid repeatedly training on unchanged data or allowing models to self-reinforce their own erroneous predictions, Phase V10 implements a **Controlled Bounded Active Learning Loop** (`ml/v10/active_learning_loop.py`):
1. **Uncertainty & Disagreement Sampling:** Samples are selected based on decision boundary margin ($\min |P(y=1) - 0.5|$) and semantic relation ambiguity.
2. **Strict Human/Gold Adjudication:** Labels are retrieved strictly from the vetted hard-case pool with verified ground truth. The model's own predictions are NEVER automatically accepted as ground truth.
3. **Early Stopping Guardrails:** Training terminates immediately if two consecutive acquisition cycles show no meaningful gain ($\Delta \text{Macro-F1} \le 0.0005$), preventing catastrophic overfitting.

---

## 2. Cycle-by-Cycle Execution Log

```
+-------+------------+---------------------------+----------------+---------------+---------------+---------------------------------------+
| Cycle | Train Size | Acquired Samples          | Val Macro-F1   | Val Exact Set | Delta F1      | Status & Decision                     |
+-------+------------+---------------------------+----------------+---------------+---------------+---------------------------------------+
| 1     | 1,137      | AL-POOL-010, AL-POOL-009  | 0.9532         | 93.00%        | Baseline      | Acquired illegal structure & overhang |
| 2     | 1,139      | AL-POOL-002, AL-POOL-003  | 0.9532         | 93.00%        | +0.0000       | Acquired footpath & inverter blackout |
| 3     | 1,141      | AL-POOL-004, AL-POOL-008  | 0.9532         | 93.00%        | +0.0000       | Acquired PMT spark & dual gas+road    |
+-------+------------+---------------------------+----------------+---------------+---------------+---------------------------------------+
```

### Early Stopping Trigger:
At the conclusion of Cycle 3, two consecutive rounds produced zero gain on the validation set ($\Delta \text{Macro-F1} = 0.0000$), indicating that the model's decision boundaries for these feature spaces had reached full convergence. The loop terminated cleanly after 3 cycles in accordance with Section 7 criteria.

---

## 3. Acquired Sample Provenance & Adjudication Detail

| Sample ID | Roman Urdu Input Text | Ground Truth Labels | Adjudication Rationale |
| :--- | :--- | :---: | :--- |
| **AL-POOL-010** | `residential makan mein baghair permission k factory bana di hai...` | `sbca` | Unauthorized commercial zoning violation belongs to SBCA. |
| **AL-POOL-009** | `commercial plaza ka chhajja toat kar road par girne wala hai...` | `sbca` | Hazardous building overhang is an SBCA structural safety mandate. |
| **AL-POOL-002** | `sadak k kinare footpath par illegally dukanain laga li hain...` | `kmc` | Footpath obstruction and sidewalk encroachment belong to KMC. |
| **AL-POOL-003** | `bijli raat se gayab hai ups aur inverter dono discharge ho gaye...` | `kelectric` | Inverter discharge is a domestic consequence of power outage. |
| **AL-POOL-004** | `pmt par load zyada hone se spark ho raha hai aur light dim hai...` | `kelectric` | PMT overload and low voltage belong to K-Electric. |
| **AL-POOL-008** | `gas line fracture hai tez boo aa rahi hai aur divider toota hua hai` | `ssgc;kmc` | Dual independent repairs: SSGC gas leak + KMC road divider. |

---

## 4. Final Evaluation on Untouched Locked Test Set

- **Exact Department-Set Match:** **81.22%**
- **Multi-Label Macro-F1:** **0.9046**
- **Macro Precision:** **88.14%**
- **Macro Recall:** **93.52%**
- **Over-Routing Error Rate:** **2.86%**
- **Under-Routing Error Rate:** **1.63%**

Full round-by-round JSON artifact persisted in `ml/v10/active_learning_report.json`.
