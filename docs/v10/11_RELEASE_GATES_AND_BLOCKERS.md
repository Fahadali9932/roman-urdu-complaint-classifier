# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 ACCEPTANCE GATES & RELEASE BLOCKERS
**Document ID:** `docs/v10/11_RELEASE_GATES_AND_BLOCKERS.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Release Audit  

---

## 1. Acceptance Gates Verification Matrix

| # | Acceptance Gate Requirement | Verification Evidence | Operational Status |
| :-: | :--- | :--- | :---: |
| **1** | Model version in citizen submission path verified; no stale or mock route | `multiLabelClassifier.ts` loads `multilabel_model_v10.json` (dual word+char TF-IDF, 10,679 terms). | **LOCAL VERIFIED** |
| **2** | Short Roman Urdu road complaint routes to KMC when location is valid | `"humare ghar ke pass wali road..."` scores KMC at 0.8162; auto-routes (`needsReview: false`). Tested in `V10RoadComplaintRootCause.test.ts`. | **LOCAL VERIFIED** |
| **3** | Electricity outage causing domestic water pump stoppage routes to KE only | Causal rule suppresses KWSC; assigns K-Electric exclusively. Tested in `V10RoadComplaintRootCause.test.ts`. | **LOCAL VERIFIED** |
| **4** | Independent power failure + public water main creates two issues, one reference | Multi-label decomposition yields K-Electric and KWSC. Tested in `MultiDepartmentRoutingAndSecurity.test.ts` (T03). | **LOCAL VERIFIED** |
| **5** | Water main burst breaking road pavement creates two repairs | Dual repair detector creates KWSC water leak + KMC road surface tasks. Tested in `V10RoadComplaintRootCause.test.ts`. | **LOCAL VERIFIED** |
| **6** | Negations and locality mentions do not generate false assignments | Clause-scoped defect negation suppresses false alarms; `gali` treated as location. Tested in `V10RoadComplaintRootCause.test.ts`. | **LOCAL VERIFIED** |
| **7** | Python and TypeScript inference parity proven on unseen test set | Tested across 245 locked test samples: max delta $4.9997 \times 10^{-7}$, 0 route mismatches (0.00%). | **LOCAL VERIFIED** |
| **8** | Honest holdout measured with synthetic vs real provenance disclosed | 1,625 records (18.5% consented real, 19.7% human authored, 61.8% synthetic). Evaluated on disjoint locked test ($N=245$). | **LOCAL VERIFIED** |
| **9** | Status propagation, account/guest isolation, strict RLS, zero PII leak | 32 test files, 272 tests passed (100% pass rate). 0 PII matches in dataset scan. | **LOCAL VERIFIED** |
| **10**| Zero paid service, unauthorized remote mutation, or remote push | $0.00 spent. Zero remote DDL migrations executed. Zero remote git pushes. Working tree local only. | **LOCAL VERIFIED** |

---

## 2. Release Classification & Pending Approvals

In strict adherence to project guidelines:
- **Phase V10 Status:** **`LOCAL-VERIFIED — HOSTED DEPLOYMENT AWAITING OWNER AUTHORIZATION`**
- The local codebase is completely implemented, verified, and production-ready.
- No remote changes have been made without explicit authorization.

### Staged Items Awaiting Operator Sign-Off:
1. **Remote Database Migration:** `supabase/migrations/20261125000000_multi_department_schema.sql` (adds `complaint_issues` table and RLS policies to remote Supabase `akbwiedtmxjxcjscgitw`).
2. **Hosted Edge Function Deployment:** Deploying `submit-classified-complaint` containing `multilabel_model_v10.json` to Supabase Edge infrastructure.
3. **Remote Git Push:** Pushing local branch `feature/live-citizen-classification-workflow` to GitHub origin.
