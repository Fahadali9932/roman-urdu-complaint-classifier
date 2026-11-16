# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 BASELINE REALITY & AUDIT
**Document ID:** `docs/v10/00_BASELINE_REALITY.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Certified Read-Only Baseline Audit & Root-Cause Trace  

---

## 1. Environment & Workspace Verification

- **Repository Root:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`
- **Active Git Branch:** `feature/live-citizen-classification-workflow`
- **Current HEAD Commit:** `1c2721c` (`feat(v9): multi-department multi-label civic classification, linked routing, and zero-leakage ML pipeline`)
- **Remote Branch Tracking:** Branch is ahead of `origin/feature/live-citizen-classification-workflow` by 5 commits. No remote push performed.
- **Configured Supabase Project:**
  - Project Reference in `.env.local`: `akbwiedtmxjxcjscgitw` (`https://akbwiedtmxjxcjscgitw.supabase.co`)
  - Target Project Name: `awaaz-e-awam-db`
  - Region: `ap-south-1` (Mumbai)
- **Database Reset Status (Audited):**
  - An authorized, verified historical database reset was executed on 16 November 2026.
  - Re-query confirmed 0 records in: `public.complaints`, `public.complaint_citizen_private`, `public.complaint_timeline_events`, `public.complaint_notification_outbox`, `public.complaint_audit_logs`.
  - Preserved metadata tables: 6 departments (`kmc`, `kwsc`, `kelectric`, `ssgc`, `sbca`, `sswmb`), 12 profiles, 8 department memberships.
  - **Constraint:** Zero further destructive remote SQL or live data truncation permitted.

---

## 2. Local-to-Hosted Schema & Deployment Drift

| Component | Local Worktree State | Hosted Supabase Production State | Drift Assessment |
| :--- | :--- | :--- | :--- |
| **Migrations** | 19 migration files up to `20261125000000_multi_department_schema.sql` | Hosted migration history ends at `20261124000000_guest_numeric_tracking_v6.sql` (or `20261122000000`) | **Unapplied Migration:** `20261125000000_multi_department_schema.sql` has NOT been deployed remotely. Tables `complaint_issues` do not exist on remote. |
| **Edge Function** | `supabase/functions/submit-classified-complaint/index.ts` updated with multi-label logic and bundled `multilabel_model.json` (327 KB) | Hosted Edge Function remains on pre-V9 version; not redeployed | **Stale Hosted Function:** Remote Edge Function does not have the V9 model artifact. |
| **Data Adapter** | `LocalSupabaseAdapter.ts` serializes multi-department routing into `redaction_flags` JSONB for zero-downtime backwards compatibility | Remote database stores empty complaints table | Safe compatibility active; no breaking schema dependency. |
| **Model Serving** | Pure TypeScript isomorphic engine in `src/services/multiLabelClassifier.ts` | Local client imports model; Edge function embeds model | Identical mathematical execution locally; hosted function pending deployment approval. |

---

## 3. Root-Cause Analysis: The User's Road Complaint Failure

### Problem Statement
The user submitted an authentic, ordinary Roman Urdu complaint:
> `"humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae"`

**Observed Behavior:** The complaint was sent to the manual review queue (`under_review`) rather than auto-routing to KMC (Roads & Infrastructure), even though it describes a clear road defect.

### Mathematical & Empirical Trace

1. **Tokenization & Normalization Deficits:**
   The V9 normalizer in `normalizeRomanUrdu` only handled 6 fixed token replacements (`bijlee`, `paani`, `sadak`, `kachraa`, `gutters`, `sewerage`).
   For the user's sentence:
   - `zada` was NOT normalized to `zyada` / `ziada`.
   - `hoi` was NOT normalized to `hui`.
   - `v` (colloquial `hoi v hai` $\rightarrow$ `hui hui hai`) was unmapped.
   - `jae` was NOT normalized to `jaye`.
   - `pass` was NOT normalized to `paas`.
   - `bohot` was NOT normalized.

2. **Absence of Character N-Grams in Exported Model:**
   While the V9 training script experimented with character n-grams in `build_feature_extractor`, the exported production model artifact `multilabel_model.json` was fitted exclusively on word n-grams (`ngram_range: (1, 2)`, `analyzer: "word"`).
   As a result, all spelling variations that missed the exact word vocabulary were dropped completely.

3. **Feature Dilution by Context Words:**
   Only 9 terms matched the vocabulary:
   - `ghar`: weight = 0.3573
   - `ke`: weight = 0.2521
   - `pass`: weight = 0.4404
   - `wali`: weight = 0.4220
   - `road`: weight = **0.1890** (diluted)
   - `kharab`: weight = 0.3334
   - `hai`: weight = 0.1706
   - `theek`: weight = 0.3074
   - `kiya`: weight = 0.4077
   Because `ghar` appeared, and `road` had only one token with diluted weight, the model scored:
   - $P(\text{kmc}) = 0.5888$
   - $P(\text{kelectric}) = 0.3641$
   - $P(\text{sbca}) = 0.2239$

4. **Rigid Global Auto-Route Confidence Gate:**
   - KMC's calibrated threshold was $\tau_{\text{kmc}} = 0.57$.
   - The model predicted $P(\text{kmc}) = 0.5888 \ge 0.57$, so KMC was selected (`selectedDepartments = ['kmc']`).
   - However, the code enforced a blanket `auto_route_confidence_gate = 0.65`:
     ```typescript
     if (maxProb < autoRouteGate) {
       needsReview = true;
       reviewReason = 'PREDICTION_BELOW_AUTO_ROUTE_GATE';
     }
     ```
   - Because $0.5888 < 0.65$, the complaint was flagged as needing review and forced into `under_review`.

5. **Conflation of Issue Classification and Location Validation:**
   The system lacked a decoupled `location_validity` gate. If a citizen reports a confident road problem, but the public incident location is missing or imprecise, the system must report `INCOMPLETE_PUBLIC_LOCATION`, rather than falsely claiming the model was uncertain about the service defect.

---

## 4. Model B1-A vs. B1-B Discrepancy

In Phase V9:
- **B1-A (Logistic Regression):** Macro-F1 = 0.9238, Exact Match = 86.27%
- **B1-B (Calibrated LinearSVC):** Macro-F1 = 0.9380, Exact Match = 88.41%

**Finding:** B1-B surpassed B1-A by +1.42% in Macro-F1 and +2.14% in Exact Match. However, V9 chose B1-A solely because Logistic Regression produces direct sigmoid log-odds that can be serialized as a single vector of weights without storing scikit-learn's isotonic/sigmoid calibration regression tables. In V10, we will benchmark Platt calibration tables and evaluate whether B1-B's higher accuracy can be deployed within Deno Edge runtime limits without extra complexity.

---

## 5. Dataset Provenance & Privacy Audit

- **V9 Dataset Inventory:** 1,545 records (1,081 Train, 231 Val, 233 Test) generated from 871 template families.
- **Provenance Breakdown:** 90.2% synthetic templates, 9.8% historical seeds.
- **Privacy Compliance:**
  - Automated regex scanning confirmed 0 phone numbers, 0 CNICs, 0 email addresses, and 0 API secrets in the dataset.
  - In strict compliance with the 16 Nov 2026 database reset, **zero deleted citizen complaint records** will be harvested or backfilled into V10 training sets without explicit provenance consent.
  - All new V10 training records will be tracked with immutable provenance flags (`human_authored`, `consented_real`, `synthetic_agent`, etc.).

---

## 6. Top Three Architectural Risks

1. **Auto-Route Precision vs. False Review Tradeoff:** Lowering confidence gates to accept colloquial phrasing risks misallocating ambiguous or out-of-jurisdiction complaints. The classifier must combine robust token normalization, character n-gram tolerance, and per-department thresholding rather than arbitrary global gate cuts.
2. **Phantom Multi-Department Routing from Causal Consequence:** When citizens describe consequences (e.g. `bijli band hai is liye motor nahi chal raha` or `gutter leak se traffic jam hai`), the system must not assign KWSC or KMC unless a separate, independently actionable defect in that infrastructure is explicitly described.
3. **Local-to-Hosted Deployment Disconnect:** The local environment features an updated multi-label adapter, but the remote Supabase database and hosted Edge Function remain unmigrated. Clear release gating and owner checkpoints must be observed before attempting any live deployment.
