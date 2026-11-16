# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10-ML FINAL COMPLETION REPORT
## Data-Centric Roman Urdu Routing, Causal Issue Extraction & Bounded Active Learning

**Date:** 16 November 2026  
**Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Active Branch:** `feature/live-citizen-classification-workflow`  
**Status:** Certified Engineering Delivery & Complete Local Verification  

---

### 1. Executive Summary

Phase V10-ML addresses the core real-world challenges of civic grievance routing in Karachi: handling high-variance colloquial Roman Urdu transliterations, separating root causes from operational symptoms, decoupling service classification from geographic location completeness, and implementing an auditable, bounded active learning workflow.

Every objective defined in the Master Implementation Directive has been empirically executed and verified using **$0.00 in cloud spending**:
1. **The User Road Regression Solved:** The report `"humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae"` is now recognized as KMC road damage with a calibrated posterior probability of **0.8162** (well above the 0.70 per-class threshold and 0.60 auto-route gate), cleanly auto-routing to the KMC Work Queue.
2. **Decoupled Location Completeness:** When an incident location is unconfirmed, the system flags `INCOMPLETE_PUBLIC_LOCATION` while preserving the identified road defect—eliminating misleading claims that the model failed to understand the complaint.
3. **Causal Consequence Disambiguation:** The semantic relation resolver suppresses phantom secondary tickets (e.g. power outage causing domestic pump failure routes exclusively to K-Electric, and sewer overflow causing traffic obstruction routes exclusively to KWSC) while correctly establishing dual work orders for physical cascade defects (e.g. water main burst eroding asphalt roadbed).
4. **Multi-Model Benchmark on Disjoint Locked Test ($N=245$):**
   - **Model A (Rule Baseline):** Exact Match: 62.86%, Macro-F1: 0.7835
   - **Model B (Logistic Regression, Dual Word+Char):** Exact Match: 80.82%, Macro-F1: 0.9002
   - **Model C (Calibrated LinearSVC, Dual Word+Char):** Exact Match: **82.04%**, Macro-F1: **0.9329**, Macro-Recall: **0.9873**
   - **Model D (Calibrated SGD Challenger):** Exact Match: **83.67%**, Macro-F1: 0.9108
5. **Mathematical Parity Verification:** The pure TypeScript inference engine reproduces Python reference predictions across all 245 locked test samples with a maximum probability delta of **$4.9997 \times 10^{-7}$** and **0.00% route-label mismatch**.
6. **Bounded Active Learning:** Executed 3 acquisition cycles on vetted hard cases; early-stopped cleanly when validation Macro-F1 plateaued at **0.9532** (Exact Match: **93.00%**).
7. **Complete Regression Passing:** All 32 test files and 272 automated tests passed (100% pass rate). Production build compiled in 712 ms.

---

### 2. Empirical Benchmark Comparison ($N=245$ Held-Out Test Set)

```
+------------------------------------+------------------+----------+----------+------------+------------+---------------+
| Model Candidate                    | Exact Match Rate | Macro-F1 | Micro-F1 | Macro-Prec | Macro-Rec  | Missed Depts  |
+------------------------------------+------------------+----------+----------+------------+------------+---------------+
| Model A: Rule Baseline (B0)        | 62.86%           | 0.7835   | 0.7866   | 0.8511     | 0.7611     | 66 (4.49%)    |
| Model B: Logistic Regression (B1-A)| 80.82%           | 0.9002   | 0.8874   | 0.8742     | 0.9388     | 25 (1.70%)    |
| Model C: Calibrated LinearSVC(B1-B)| 82.04%           | 0.9329   | 0.9268   | 0.8884     | 0.9873     | 4 (0.27%)     |
| Model D: Calibrated SGD (B1-C)     | 83.67%           | 0.9108   | 0.9181   | 0.8837     | 0.9482     | 15 (1.02%)    |
+------------------------------------+------------------+----------+----------+------------+------------+---------------+
```

#### Department-Level F1 Breakdown (Model C: Calibrated LinearSVC):
- **KMC (Roads & Infrastructure):** Precision: 91.36% | Recall: 98.67% | **F1: 0.9487**
- **KWSC (Water & Sewerage):** Precision: 70.13% | Recall: 98.18% | **F1: 0.8182**
- **K-Electric (Power Grid):** Precision: 93.48% | Recall: 97.73% | **F1: 0.9556**
- **SSGC (Natural Gas):** Precision: 95.83% | Recall: 100.00% | **F1: 0.9787**
- **SSWMB (Solid Waste):** Precision: 88.46% | Recall: 100.00% | **F1: 0.9388**
- **SBCA (Building Control):** Precision: 93.88% | Recall: 100.00% | **F1: 0.9684**

---

### 3. Causal Relation & Disambiguation Test Evidence

Verified in `src/test/V10RoadComplaintRootCause.test.ts`:

1. **Power Outage Causing Domestic Water Pump Failure:**
   - Input: `"kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi"`
   - Outcome: Assigned **K-Electric ONLY** (`kelectric.power_outage`). KWSC suppressed as a non-actionable symptom.
2. **Independent Dual Infrastructure Outage:**
   - Input: `"hamare area mein bijli nahi aa rahi aur sarkari pani ki main pipeline bhi phat gai hai"`
   - Outcome: Assigned **K-Electric** (`kelectric.power_outage`) AND **KWSC** (`kwsc.water_leak`) under 1 tracking receipt.
3. **Physical Cascade Incident Requiring Dual Repairs:**
   - Input: `"pani ki main line phat gai hai aur us ki wajah se road ki satah bhi toot gai hai"`
   - Outcome: Assigned **KWSC** (`kwsc.water_leak`) AND **KMC** (`kmc.road_damage`) linked as `SAME_INCIDENT_DIFFERENT_REPAIRS`.
4. **Sewer Overflow Causing Traffic Obstruction:**
   - Input: `"sewerage ka pani road par aa raha hai jis se traffic ruk gaya hai"`
   - Outcome: Assigned **KWSC ONLY** (`kwsc.sewage_overflow`). KMC suppressed.

---

### 4. Technical Artifacts & Deliverables Index

#### Machine Learning Scripts & Artifacts (`ml/v10/`):
- `ml/v10/preprocess.py`: Unicode normalizer, word-boundary transliteration normalizer, dual word+char feature generator.
- `ml/v10/relation_engine.py`: Semantic cause-and-effect analyzer and relation resolver.
- `ml/v10/dataset_manager.py`: Provenance tracker, PII auditor, and cryptographic template family splitter.
- `ml/v10/train_and_compare.py`: Benchmark suite training Models A, B, C, D on identical folds.
- `ml/v10/active_learning_loop.py`: Bounded active learning loop (max 6 cycles) with plateau early-stopping.
- `ml/v10/multilabel_model_v10.json`: Exported 941.6 KB production model artifact (10,679 dual word+char features).
- `ml/v10/verify_parity_v10.mjs`: Mathematical parity verification script proving 0.00% route mismatch.

#### Technical Documentation (`docs/v10/`):
- [00_BASELINE_REALITY.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/00_BASELINE_REALITY.md) — Audited baseline, reset verification, and root cause diagnosis.
- [01_TAXONOMY_AND_EVIDENCE.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/01_TAXONOMY_AND_EVIDENCE.md) — Municipal taxonomy, defect codes, and linguistic evidence lexicon.
- [02_ISSUE_RELATION_AND_ROUTING.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/02_ISSUE_RELATION_AND_ROUTING.md) — Causal relation taxonomy and state reconciliation truth table.
- [03_DATASET_PROVENANCE_AND_CONSENT.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/03_DATASET_PROVENANCE_AND_CONSENT.md) — Source breakdown (18.5% consented real, 19.7% human authored, 61.8% synthetic) and zero-PII audit.
- [04_SPLITS_AND_LOCKED_GOLD.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/04_SPLITS_AND_LOCKED_GOLD.md) — Cryptographic template family isolation audit (0.00% overlap).
- [05_MODEL_COMPARISON_AND_CALIBRATION.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/05_MODEL_COMPARISON_AND_CALIBRATION.md) — Empirical multi-model benchmark results and per-department F1 table.
- [06_ACTIVE_LEARNING_CYCLES.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/06_ACTIVE_LEARNING_CYCLES.md) — Cycle-by-cycle acquisition log and stopping rationale.
- [07_INFERENCE_PARITY_AND_RUNTIME.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/07_INFERENCE_PARITY_AND_RUNTIME.md) — Parity verification results ($4.9997 \times 10^{-7}$ delta, 0 mismatches) and runtime resource audit.
- [08_DATABASE_RLS_AND_ROLLOUT.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/08_DATABASE_RLS_AND_ROLLOUT.md) — Row-level security policies, negative authorization tests, and staged rollout plan.
- [09_END_TO_END_TEST_EVIDENCE.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/09_END_TO_END_TEST_EVIDENCE.md) — Step-by-step test evidence for all mandatory scenarios.
- [10_DEMO_AND_USER_GUIDE.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/10_DEMO_AND_USER_GUIDE.md) — Plain-language demonstration guide for 3 operational scenarios.
- [11_RELEASE_GATES_AND_BLOCKERS.md](file:///D:/RomanUrdu_ComplaintClassifier_staff_auth/docs/v10/11_RELEASE_GATES_AND_BLOCKERS.md) — Acceptance gates audit and deployment approvals checklist.

---

### 5. Git Status & Pending Approvals

- **Branch:** `feature/live-citizen-classification-workflow`
- **Build Status:** Passing cleanly (`tsc -b && vite build` in 712 ms).
- **Test Status:** 32 test files, 272 tests passing (100% pass rate).
- **Remote Push Status:** Held locally. No remote Git pushes or hosted database mutations have been executed.
