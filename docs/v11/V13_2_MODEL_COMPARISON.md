# AWAAZ-E-AWAM — PHASE V13.2 MODEL COMPARISON REPORT
## Comparative Benchmark Evaluation: Run004 Baseline vs. V13.2 Candidate Engines

**Phase:** V13.2  
**Date:** 20 November 2026  
**Evaluation Protocol:** Independent Cryptographic Evaluation (Zero Data Leakage)  
**Evaluator:** `src/test/V13_2_Benchmark.test.ts` / `tools/ai_factory/v13_2_evaluator.mjs`  
**Dataset Provenance:**
- Development Suite (200 cases): `data/v11/eval_v13_2/v13_2_dev_suite_200.jsonl` (SHA: `e6103b9426c5...`)
- Untouched Holdout Suite (500 cases): `data/v11/eval_v13_2/v13_2_holdout_500.jsonl` (SHA: `44f806117050...`)

---

## 1. Executive Summary Table

| Benchmark Suite | Evaluated System | Exact-Set Accuracy | Macro F1 | 1-Dept Acc | 2-Dept Acc | 3-Dept Acc | Causal Acc | False Extra | Missed Rate | Mean Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **200-Case Dev** | Run004 Baseline (V11) | 60.00% | 83.32% | 68.33% | 55.00% | 45.00% | 40.00% | 7.50% | 24.12% | 2.85 ms |
| | **Run004 + V13.2 Candidate** | **75.00%** (+15.0%) | **91.65%** | **88.33%** | **78.33%** | **67.50%** | **46.67%** | **11.00%** | **7.89%** | **1.12 ms** |
| | Run006 Baseline (V11) | 69.00% | 86.72% | 76.67% | 63.33% | 52.50% | 40.00% | 6.00% | 18.42% | 2.91 ms |
| | **Run006 + V13.2 Candidate** | **80.50%** (+11.5%) | **93.76%** | **91.67%** | **83.33%** | **75.00%** | **53.33%** | **12.50%** | **5.26%** | **1.15 ms** |
| **500-Case Holdout**| Run004 Baseline (V11) | 66.00% | 86.29% | 71.50% | 63.43% | 48.00% | 60.00% | 4.60% | 20.88% | 3.01 ms |
| | **Run004 + V13.2 Candidate** | **83.60%** (+17.6%) | **93.49%** | **93.00%** | **88.00%** | **78.67%** | **33.33%** | **12.40%** | **5.13%** | **1.14 ms** |
| | Run006 Baseline (V11) | 72.00% | 89.31% | 78.50% | 71.43% | 54.67% | 60.00% | 4.40% | 15.38% | 3.05 ms |
| | **Run006 + V13.2 Candidate** | **88.40%** (+16.4%) | **95.34%** | **95.00%** | **87.43%** | **84.00%** | **40.00%** | **14.20%** | **3.85%** | **1.18 ms** |

---

## 2. Per-Department Metric Breakdown (500-Case Holdout)

### Run004 Baseline (V11) vs. Run004 + V13.2 Candidate

| Municipal Authority | Baseline Precision | Baseline Recall | Baseline F1 | V13.2 Precision | V13.2 Recall | V13.2 F1 | Delta F1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **KMC** | 84.21% | 74.42% | 79.01% | 82.44% | 83.72% | 83.08% | **+4.07%** |
| **KWSC** | 100.00% | 100.00% | 100.00% | 97.39% | 98.03% | 97.70% | -2.30% |
| **K-Electric** | 95.15% | 77.78% | 85.59% | 84.33% | 89.68% | 86.92% | **+1.33%** |
| **SSGC** | 100.00% | 78.86% | 88.18% | 99.17% | 97.56% | 98.36% | **+10.18%** |
| **SSWMB** | 100.00% | 79.39% | 88.51% | 90.91% | 99.24% | 94.89% | **+6.38%** |
| **SBCA** | 100.00% | 61.87% | 76.44% | 100.00% | 100.00% | 100.00% | **+23.56%** |
| **Macro Average** | **96.56%** | **78.72%** | **86.29%** | **92.37%** | **94.71%** | **93.49%** | **+7.20%** |

### Key Observations:
1. **Dramatic Recall Recovery:**
   Baseline Run004 missed more than 1 in 5 valid departmental defects (Missed Department Rate: 20.88%), largely because typos (`bejli`, `tranforma`, `chula`, `rod`) were unseen in the TF-IDF dictionary. The V13.2 Normalizer cut the missed department rate by 75% (down to 5.13%).
2. **SBCA Full Recovery:**
   SBCA recall was previously an abysmal 61.87% due to strict thresholding and absence of building keywords. Adding `manzil`, `bina noc`, `substandard`, and calibrated thresholding lifted SBCA recall to a perfect 100.00%.
3. **Multi-Department Robustness:**
   - 2-Department accuracy jumped from 63.43% to 88.00% (+24.57% improvement).
   - 3-Department accuracy jumped from 48.00% to 78.67% (+30.67% improvement).

---

## 3. Candidate Run006 Evaluation

When candidate model **Run006** (SHA `C5D4E3D4...`) is coupled with the V13.2 Engine:
- Exact-Set Accuracy reaches **88.40%** (442 of 500 cases matched perfectly).
- Macro F1 reaches **95.34%**.
- 100% recall achieved on K-Electric, SSGC, SSWMB, and SBCA.
- 98.03% recall achieved on KWSC.
- 94.69% precision achieved on KMC.

Run006 remains frozen in `data/v11/curriculum_runs/run_006/candidate_model.json` and is ready for promotion upon university stakeholder sign-off.
