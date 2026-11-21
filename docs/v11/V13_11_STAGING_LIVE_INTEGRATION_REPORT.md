# V13.11 — Hosted Staging Intake, Quotas, and Reassignment Verification

**Date:** 21 November 2026 (Pakistan time)  
**Repository:** `Fahadali9932/roman-urdu-complaint-classifier`  
**Isolated branch:** `feature/v13-11-staging-intake-security`  
**Supabase target:** `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`) **only**

## Outcome

The actual `submit-classified-complaint` Edge Function, including its local V11
classifier asset, is now deployed on **staging**. One wholly fictional guest
submission traversed hosted HTTP intake, classification, database persistence,
and the anonymous tracking RPC. It routed to **SSGC** and returned a receipt;
tracking returned `found: true`, `public_status: assigned` with no private
phone field. The test request tried to set `isDemonstration: true`, but the
stored complaint correctly had `is_demonstration: false`. The precisely
identified QA record was deleted afterward. Final checks showed **0 complaints,
0 complaint issues, 0 private complaint records, and 0 Auth users** in staging.

The Edge endpoint also returned **405** for GET, **200** for OPTIONS, **400**
for invalid JSON and **401** for an invalid bearer session. These are hosted
observations, not merely test mocks. **No production system was deployed or
modified, and the site is not approved for public launch.**

## Security fixes

1. Corrected the V13.10 administrative and KMC-review reassignment migration:
   audit writes now use the actual `previous_state`, `new_state`, and `details`
   JSONB columns; a target `complaint_issues` row is created even if none
   existed; and KMC reviewer membership is selected explicitly.
2. Replaced volatile per-Edge-instance JavaScript rate-limit state with a
   service-role-only, transactional PostgreSQL quota reservation. Current
   **staging** limits: 10 guest requests per client/minute, 30 authenticated
   requests per client/minute, 120 total/minute, and 600 total/day. Persistent
   counters are keyed by a SHA-256 pseudonym derived from the server secret and
   client-IP header, never a raw name, phone, or IP. If the quota RPC is down,
   intake returns 503 and does not classify or persist the complaint. A denied
   quota returns 429 with a retry header.
3. Added real staging SQL invariants covering guest/authenticated caps, the
   global cap despite many client hashes, absence of anonymous RPC access,
   administrative reassignment, KMC review, and proper JSONB audit. Fixtures
   used a transaction and were rolled back.

## Staging deployments and validation

- Applied corrected reassignment migration using the staging migration API:
  `v13_11_corrected_v13_10_reassignment_consistency` (remote history version
  `20261121082031`).
- Applied `v13_11_persistent_intake_quotas` (remote history version
  `20261121082042`). Source file name is
  `20261130000000_v13_11_persistent_intake_quotas.sql`.
- Deployed `submit-classified-complaint` Edge Function version **1**, status
  **ACTIVE**, function ID `749169c7-0898-466f-8bdf-c7505fd4e8f2`. JWT gateway
  verification is disabled intentionally for guest submissions; the function
  verifies optional citizen bearer sessions itself and rejects invalid tokens.
- Actual staging SQL suite `supabase/tests/v13_11_quota_and_reassignment.sql`:
  **PASS** (rolled-back test actors and data).
- Local Edge HTTP integration: **11/11 PASS**.
- Edge boundary suite: **16/16 PASS**.
- V13.10 scenarios: **17/17 PASS**.
- Full Vitest suite: **603 passed, 1 skipped** in 57 files.
- Production Vite build: **PASS** (build bundle over 500 KiB warning persists).
- Full Python discovery: **103 tests executed plus one setUpClass error**;
  `test_v13_5_two_department_policy` requires
  `data/v11/curriculum_runs/run_004/candidate_model.json`, which is absent
  from this clean isolated Git checkout. This is an **artifact availability
  blocker**, not a passing Python suite and not a model regression verdict.
- The original frozen Run004/Run006 model weights and runtime selectors were
  not touched, and training was not started.

## Release blockers — do not skip

1. **Real multi-account security tests:** Staging had no registered Auth users.
   Prior SQL simulations do not prove the full real-JWT citizen-vs-citizen,
   staff-vs-staff, and staff-vs-admin HTTP workflows. Create disposable users
   through the supported Auth flow and test these before public release.
2. **Anti-bot abuse:** Forwarded IP headers can be spoofed; global caps contain
   total load but are not a CAPTCHA or a durable individual identity. A shared
   global 600/day quota could reject legitimate visitors under heavy traffic.
   Review production-scale rate policy, upstream IP trust, and bot controls.
3. **Schema history:** The remote migration ledger uses API-generated versions
   differing from source filenames. Reconcile deliberately before a CLI
   `supabase db push`; do not replay overlapping DDL blindly.
4. **Security audit:** Supabase advisors still identify privileged functions
   requiring further role-abuse review. A private quota table with RLS and no
   user policies is deliberate: only the service role should reach it.
5. **Build reproducibility:** Restore the frozen Run004 artifact to the proper
   test location through the approved artifact workflow before asserting a
   full Python pass. Do not retrain or invent a replacement artifact.
6. **No public release:** Production database migrations, production Edge
   deployment, Netlify publication, or merging into `main` remain separately
   gated by human review and a successful staging security matrix.

## Data safety

No real resident identity was used in the hosted smoke test. Do not publish
guest tracking or claim codes in reports, logs, tickets, or commits. The one
fictional staging complaint and its cascading records were removed by exact
ID, reference, and QA locality filter, and zero-row verification followed.
