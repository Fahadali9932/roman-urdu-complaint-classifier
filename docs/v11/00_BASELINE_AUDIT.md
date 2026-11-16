# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11 BASELINE AUDIT & REPOSITORY REALITY
**Document ID:** `docs/v11/00_BASELINE_AUDIT.md`  
**Version:** 11.0  
**Date:** 16 November 2026  
**Status:** Certified P0 Diagnostic Baseline Audit  

---

## 1. Environment & Git Repository State

- **Local Repository Path:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`
- **Active Git Branch:** `feature/live-citizen-classification-workflow`
- **Current HEAD Commit:** `85c1ef4` (`feat(v10): advanced Roman Urdu dual word-char classifier, causal relation extraction, and active learning`)
- **Remote Tracking Status:** Ahead of `origin/feature/live-citizen-classification-workflow` by 6 commits. All work is strictly local; zero remote `git push` has occurred.
- **Working Tree Cleanliness:** Clean (verified 0 uncommitted changes prior to V11 commencement).
- **Configured Supabase URL / Ref:** Verified in `.env.local` to point to `akbwiedtmxjxcjscgitw.supabase.co` (`awaaz-e-awam-db`, region `ap-south-1`). Zero credential printing or secret leakage.

---

## 2. Production vs. Local Deployment Divergence

| Architectural Layer | Local Repository Status | Hosted Remote Supabase (`akbwiedtmxjxcjscgitw`) | Production Divergence Risk |
| :--- | :--- | :--- | :--- |
| **Complaints Database** | Clean mock/staging test fixtures | Audited reset on 16 Nov 2026: **0 complaints, 0 private rows, 0 timeline events** | **Zero Data Risk:** No complaints on live DB. Live DB must NOT be mutated or truncated again. |
| **Schema Migrations** | Staged migration `20261125000000_multi_department_schema.sql` (defining `complaint_issues`, `department_assignments`, RLS) | Hosted migration history ends at `20261124000000_guest_numeric_tracking_v6.sql` | **Unapplied DDL:** Staged migration NOT applied remotely. Backwards-compatible JSON fallback in `redaction_flags` prevents runtime failure. |
| **Edge Function** | Edge function code updated with multi-label engine and bundled `multilabel_model.json` | Remote hosted Edge function is stale (pre-V9 single-label) | **Stale Hosted Function:** Live citizen submissions through hosted Edge function would run old model until deployment authorized. |
| **Client Application** | Vite/React application bundle builds cleanly in 712 ms; imports pure TS inference engine | Static build ready in `dist/` | Local frontend operates with 100% fidelity via LocalSupabaseAdapter. |

---

## 3. Exported Model Artifact & Feature Pipeline Audit

- **Active Model Version:** `v10.0-dual-word-char-calibrated`
- **Model Files:** `ml/v10/multilabel_model_v10.json` (941.6 KB), copied to active paths `ml/multilabel_model.json` and `supabase/functions/submit-classified-complaint/multilabel_model.json`.
- **Feature Extractor Architecture:**
  - Token Normalization: Word-boundary regex transliteration standardizer (handling `sarak/sadak`, `bohot/bohat`, `zyada/zada`, `hui hai/hoi v hai`, `theek kiya jaye/kiya jae`, `nahi/nhi`, `hai/hy`, etc.).
  - Feature Union: Dual Word n-grams ($1\text{--}2$, prefix `w:`) + Character n-grams ($3\text{--}5$ within word boundaries `char_wb`, prefix `c:`).
  - Vocabulary Size: $10,679$ unique features.
  - Term Frequency: Sublinear TF ($1 + \ln(\text{count})$).
  - Weighting: Euclidean L2 normalization across all matched vocabulary terms.
- **Inference Parity (Verified):**
  - Tested across 245 locked test samples via `node ml/v10/verify_parity_v10.mjs`.
  - Maximum probability absolute delta: **$4.9997 \times 10^{-7}$**.
  - Route-label mismatches: **0 out of 245 (0.00%)**.

---

## 4. Dataset Inventory & Provenance Audit

From `ml/v10/data/v10_dataset_metadata.json`:
- **Total Samples:** 1,625
- **Total Template Families:** 895
- **Partitions:**
  - `v10_train.csv`: 1,137 samples (660 families, 70.0%)
  - `v10_val.csv`: 243 samples (120 families, 15.0%)
  - `v10_test.csv`: 245 samples (115 families, 15.0%)
- **Source Breakdown:**
  - `consented_real`: 300 (18.46%)
  - `human_authored`: 320 (19.69%)
  - `synthetic_agent`: 376 (23.14%)
  - `synthetic_paraphrase`: 629 (38.71%)
- **Audit Checks:**
  - PII Scan: **PASSED (0 phone numbers, 0 CNICs, 0 email addresses, 0 tokens)**.
  - Family Split Isolation: **PASSED (0.00% template family overlap between Train, Val, Test)**.

---

## 5. Earlier Quantitative Metrics & Identified Gaps

### V10 Benchmark on Synthetic-Dominant Held-Out Test ($N=245$):
- **Model A (Rule Baseline):** Exact Match: 62.86%, Macro-F1: 0.7835
- **Model B (Logistic Regression):** Exact Match: 80.82%, Macro-F1: 0.9002
- **Model C (Calibrated LinearSVC):** Exact Match: **82.04%**, Macro-F1: **0.9329**, Macro-Recall: **0.9873**
- **Model D (Calibrated SGD):** Exact Match: **83.67%**, Macro-F1: 0.9108

### Critical Caveats & Identified Gaps:
1. **Macro-F1 0.93 is NOT 93% Exact Routing Accuracy:**
   While Macro-F1 reached 0.9329 on Model C, exact department-set match was 82.04% (or 83.67% on Model D). In a multi-label environment with 6 departments, single-label errors on secondary tasks lower exact-set match.
2. **KWSC Precision (70.13% on Model C):**
   KWSC had a lower precision (70.13%) because water words (`pani`, `sewerage`, `gutter`) frequently appear as incidental consequence descriptions (e.g., stagnant water on roads, domestic pumps failing during blackouts).
3. **Synthetic Dominance vs. Human Gold:**
   The test set ($N=245$) is predominantly synthetic variants (61.8% synthetic, 19.7% human-authored, 18.5% historical seeds). It does not represent an independent, un-anchored citizen gold standard. A true, separate human-gold holdout is necessary before claiming 90% real-world accuracy.
4. **Starter Factory Limitations:**
   The starter factory (`starter/factory.py`) contains only 31 scenario families with basic string interpolation. It must be expanded into a comprehensive offline factory with dozens of distinct fault types, diversified text renderers, and adversarial edge cases.

---

## 6. Local Compute & Hardware Environment

- **Python Version:** 3.14.5 (64-bit on Windows)
- **Installed ML Packages:** `scikit-learn` 1.7.2, `numpy` 2.5.2, `scipy` 1.18.1.
- **Node.js Version:** 24.15.0
- **Hardware / Accelerators:** Local CPU execution only. No local CUDA / PyTorch / HuggingFace libraries installed.
- **Constraint Compliance:** In strict accordance with the Zero-Spending Mandate, all training and evaluation in Phase V11 will execute via local, CPU-friendly statistical models (Track A). Heavy transformer models (`google/muril-base-cased` or `FacebookAI/xlm-roberta-base`) are evaluated as research feasibility blueprints without downloading multi-gigabyte models or requiring paid cloud GPUs.

---

## 7. What Cannot Be Verified Autonomously (Blocker Ledger)

1. **Remote Supabase DDL:** Cannot apply `20261125000000_multi_department_schema.sql` to `akbwiedtmxjxcjscgitw` without explicit user sign-off.
2. **Remote Edge Function Deployment:** Cannot deploy `submit-classified-complaint` to remote Supabase without explicit user sign-off.
3. **Remote Git Push:** Cannot push local commits to GitHub remote without explicit user sign-off.
4. **Large-Scale Genuine Citizen Corpus:** In the absence of an external pool of human annotators, the human-gold benchmark must be honestly designated as a de-identified, human-authored pilot benchmark ($N=150\text{--}300$), and real-world accuracy on general citizen populations cannot be claimed as universally verified.
