# AWAAZ-E-AWAM (آوازِ عوام) — MODEL EXPERIMENTS AND EMPIRICAL EVALUATION
**Document ID:** `docs/ml/05_MODEL_EXPERIMENTS_AND_METRICS.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Empirical Benchmark on Locked Test Partition  
**Test Set Size:** 233 independent samples (95 template families, 0% leakage)  

---

## 1. Experimental Setup & Model Archetypes

To establish an auditable hierarchy of performance and operational feasibility, three distinct model archetypes were evaluated under identical, leak-free conditions:

```
[ Baseline B0: Rule / Keyword Engine ]
        │  (Fast, interpretable, vulnerable to Roman Urdu spelling variants & synonyms)
        ▼
[ Candidate B1: Word & Char TF-IDF + Calibrated One-Vs-Rest Linear Heads ]
        │  ├── B1-A: Logistic Regression with calibrated sigmoid probability thresholds
        │  └── B1-B: LinearSVC with Platt scaling calibration
        ▼
[ Challenger B2: XLM-RoBERTa-base Deep Multilingual Transformer ]
           (Evaluated for research comparison; assessed against zero-cost serving constraints)
```

### 1.1 Invariant Training Protocol
* **Training Data:** `ml/data/multilabel_train.csv` (1,081 samples, 649 families).
* **Validation Data:** `ml/data/multilabel_val.csv` (231 samples, 127 families) — Used **exclusively** for threshold calibration and hyperparameter selection.
* **Locked Test Data:** `ml/data/multilabel_test.csv` (233 samples, 95 families) — Evaluated **once** to prevent test set overfitting.
* **Feature Scope:** Sublinear Word Unigram/Bigram TF-IDF capped at 2,117 features, combining lexical semantics and character n-gram transliteration robustness.

---

## 2. Empirical Benchmark on Locked Test Set (N=233)

### 2.1 Overall Performance Summary

| Model Metric | Baseline B0 (Keywords) | Candidate B1-A (OVR Logistic) | Candidate B1-B (Calibrated SVC) | Improvement (B1-A vs B0) |
|:---|:---:|:---:|:---:|:---:|
| **Exact Set Match Accuracy** | 63.52% | **86.27%** | **88.41%** | **+22.75%** |
| **Jaccard Set Overlap** | 76.39% | **91.70%** | **92.56%** | **+15.31%** |
| **Hamming Loss (lower is better)** | 0.0916 | **0.0358** | **0.0308** | **-60.9%** |
| **Micro-F1 Score** | 0.7985 | **0.9336** | **0.9439** | **+0.1351** |
| **Macro-F1 Score** | 0.8036 | **0.9238** | **0.9380** | **+0.1202** |
| **Macro-Precision** | 0.7711 | **0.9238** | **0.9398** | **+0.1527** |
| **Macro-Recall** | 0.8779 | **0.9271** | **0.9468** | **+0.0492** |
| **Life-Safety Hazard F1** | N/A (unsupported) | **0.9524** | **0.9524** | **New Capability** |

---

## 3. Per-Department Breakdown on Locked Test Set

### 3.1 Candidate B1-A: One-Vs-Rest Logistic Regression (Winning Production Model)

Thresholds tuned on Validation Fold:
* $\tau_{\text{kmc}} = 0.57$
* $\tau_{\text{kwsc}} = 0.49$
* $\tau_{\text{kelectric}} = 0.40$
* $\tau_{\text{ssgc}} = 0.31$
* $\tau_{\text{sswmb}} = 0.51$
* $\tau_{\text{sbca}} = 0.35$

| Department | Support | Precision | Recall | F1-Score | B0 Baseline F1 | Absolute Gain |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `kmc` (Roads, Infrastructure, Drains) | 44 | 87.18% | 77.27% | **0.8193** | 0.5688 | **+0.2505** |
| `kwsc` (Water Supply, Sewerage) | 26 | 84.00% | 80.77% | **0.8235** | 0.6582 | **+0.1653** |
| `kelectric` (Power Grid, Distribution) | 56 | 94.83% | 98.21% | **0.9649** | 0.7835 | **+0.1814** |
| `ssgc` (Natural Gas Supply, Leaks) | 46 | 95.83% | 100.00% | **0.9787** | 0.9485 | **+0.0302** |
| `sswmb` (Solid Waste Management) | 31 | 96.88% | 100.00% | **0.9841** | 0.9180 | **+0.0661** |
| `sbca` (Building Control Authority) | 52 | 94.55% | 100.00% | **0.9720** | 0.9444 | **+0.0276** |
| **Macro Average** | **255** | **92.38%** | **92.71%** | **0.9238** | **0.8036** | **+0.1202** |

---

## 4. Selective Auto-Routing: Precision vs. Coverage Tradeoff

A core requirement of Phase V9 is that **uncertain or low-confidence complaints must never be silently misrouted**. Instead, the platform routes a case automatically only when the maximum sigmoid probability exceeds an operational gate $\gamma_{\text{auto}}$. Cases falling below $\gamma_{\text{auto}}$ are forwarded to the KMC Municipal Clearinghouse Review Queue with an explicit review reason.

Empirical evaluation on the 233-sample locked test partition demonstrates the trade-off:

| Confidence Gate $\gamma_{\text{auto}}$ | Coverage (% Auto-Routed) | Micro Precision | Exact Set Match Precision | Auto-Routed Cases | Forwarded to Review Queue |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **$\ge 0.50$** | 96.1% | 93.3% | 88.4% | 224 / 233 | 9 (3.9%) |
| **$\ge 0.60$** | 91.4% | 93.0% | 87.8% | 213 / 233 | 20 (8.6%) |
| **$\ge 0.65$ (Balanced Default)** | **87.1%** | **93.1%** | **87.7%** | **203 / 233** | **30 (12.9%)** |
| **$\ge 0.70$** | 84.1% | 94.1% | 89.3% | 196 / 233 | 37 (15.9%) |
| **$\ge 0.75$** | 78.5% | 94.6% | 90.7% | 183 / 233 | 50 (21.5%) |
| **$\ge 0.80$ (High Precision)** | **64.4%** | **94.5%** | **92.0%** | **150 / 233** | **83 (35.6%)** |

### Policy Recommendation:
The system deploys $\gamma_{\text{auto}} = 0.65$ as the default operating threshold. This achieves **87.1% automated coverage** with a micro precision of **93.1%**, while safely forwarding the most difficult 12.9% of complaints to human review.

---

## 5. Life-Safety Hazard Detection Performance

The decoupled hazard detector inspects for affirmative life-safety perils while respecting syntactic negations:
* **Precision:** **93.8%** (60 / 64 flagged hazards were authentic physical threats)
* **Recall:** **96.8%** (60 / 62 true hazards identified)
* **F1-Score:** **0.9524**
* **Negation Resilience:** 100% of tested negated hazard phrases (e.g., *"pole tedha ho gaya hai lekin koi taar nahi tooti aur current nahi hai"*) were successfully identified as non-hazardous, avoiding false panic alarms.

---

## 6. Model B2: Transformer Challenger Feasibility Analysis

### 6.1 Architectural Review
* **Base Model:** `xlm-roberta-base` (125 million parameters, multilingual vocabulary covering Urdu script and Latin Roman transliterations).
* **Head:** Multi-label binary cross-entropy head with 6 output logits.
* **Fine-Tuning Script:** Provided in `ml/train_xlm_roberta_challenger.py`.

### 6.2 Serving & Operational Feasibility Matrix

| Evaluation Dimension | Lightweight Linear B1-A (Chosen) | Deep Transformer B2 (XLM-RoBERTa) | Supabase Deno Edge Constraint |
|:---|:---:|:---:|:---:|
| **Artifact Weight Size** | **327 KB** | ~500 MB (PyTorch FP32) | Strict file and bundle size limits |
| **Runtime Memory (RAM)** | **~8 MB** | ~1,200 MB (PyTorch + CUDA/CPU graph) | **256 MB Max per Request** |
| **Inference Latency (CPU)** | **3 – 8 ms** | 120 – 350 ms | **Tight CPU Budget (<50ms recommended)** |
| **External Dependencies** | **None** (Pure TypeScript) | Python, Torch, Transformers, ONNX | **Deno TS only; No Python host** |
| **Operational Monthly Cost** | **\$0.00** (Included in existing tier) | \$40 – \$150/mo (Dedicated GPU container) | **Zero Spending Mandate** |
| **Production Feasibility Gate** | **PASSED** | **FAILED (Resource Constraint)** | **Must fit within 256 MB RAM** |

### 6.3 Decision:
In accordance with Section 0 and Section 11 of the Master Directive, **Candidate B1-A is selected for production deployment**. Candidate B2 is preserved in `ml/train_xlm_roberta_challenger.py` as an audited research benchmark.

---
*End of Model Experiments and Metrics Report.*
