# V13.10.1 — Edge Intake Security Review and Staging Handoff

## Boundaries

Staging only: `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`). No live
deployment, production database migration, model retraining, or model artifact
change was authorized or performed in this phase. This document separates
verified checks from work still required for an honest launch decision.

## Intake defects repaired in source

1. **Caller-forged demonstration cases:** The public JSON property
   `isDemonstration` previously controlled the privileged
   `submit_citizen_complaint(p_is_demonstration)` parameter. Public submissions
   now always persist with `p_is_demonstration=false`; development demonstration
   fixtures remain a separate, local-only feature.
2. **Unbounded JSON request:** The server now reads the request stream with a
   hard **16 KiB byte ceiling**, returning HTTP 413 for oversized bodies even
   when the complaint contains fewer than 200 words. Malformed JSON returns
   HTTP 400, and an additional complaint character cap (6,000) and required
   field limits (240 chars, optional email 254) prevent unusual single-token or
   metadata attacks. The original 200-word limit remains in effect.
3. **Public guest submission rate limiting:** Edge intake now enforces an
   in-memory sliding window rate limiter per client IP (30 requests/minute
   per IP for unauthenticated guest complaints), returning HTTP 429 `RATE_LIMITED`
   with `Retry-After: 60`.
4. **Bot and spam honeypot defense:** Hidden bot-trap fields (`hp_bot_field`,
   `website`) trigger immediate HTTP 400 `BOT_DETECTED` without invoking
   the classifier or writing to the database.
5. **Department reassignment reconciliation:** Added migration
   `supabase/migrations/20261129000000_v13_10_reconcile_reassignment_consistency.sql`
   to atomically reconcile `assigned_department_id`, `assigned_department_ids`,
   and `complaint_issues` across `admin_reassign_complaint` and
   `staff_review_and_assign_complaint`, while pinning `search_path = ''`.

## Verified checks

| Check | Result |
| --- | --- |
| Real local HTTP/socket integration (guest and citizen flows, spoofed demo, oversized and malformed requests) | **9/9 PASS** |
| Edge authorization/classifier boundary tests | **16/16 PASS** |
| 10 specific complaint scenarios test suite (`tests/edge/v13_10_ten_scenarios.mjs`) | **17/17 PASS** |
| Full Vitest suite | **603 passed | 1 skipped** (57 files) |
| Python V11 regression suite (`tests/v11`) | **106/106 PASS** |
| `npx tsc -b` | **PASS** |
| `npm run build` | **PASS**, existing large-bundle advisory |
| Staging privileged RPC inventory (read-only) | 20 `SECURITY DEFINER` functions; 1 anonymous-callable guest-status function; others restricted to `authenticated` or `service_role` |
| Frozen Run004/Run006 model files | **Unmodified** |

These HTTP tests run locally against a **mock database**. They do **not** prove
that staging Edge Functions can connect to Supabase Auth or execute an actual
hosted insert. Staging remains at **zero deployed Edge Functions**.

## Risk-based privileged function review

Read-only inspection of the staging `pg_proc` catalogue found:

- The anonymous-callable `get_guest_complaint_status` is intentional. It accepts
  only a digest of a 24-digit guest tracking secret and returns allowlisted
  public status. It still needs automated abuse/rate-limit protection.
- Citizen/public complaint mutation RPCs are **not** anonymously executable;
  `submit_citizen_complaint` is `service_role` only.
- Admin and staff mutation functions examined use authenticated identity and
  membership/admin checks, including status updates, priority overrides, and
  KMC clearinghouse review. A 20-function inventory is **not** a complete
  adversarial review or real JWT proof.
- **Consistency finding:** Legacy `admin_reassign_complaint` and
  `staff_review_and_assign_complaint` update the primary
  `assigned_department_id` but do not atomically reconcile
  `assigned_department_ids` and `complaint_issues`. This can leave a
  multi-department record inconsistent. Repair and test this in a dedicated
  staging migration before public workflow verification.

## Hard blockers to an honest public/staging end-to-end verdict

1. **Abuse controls:** Anonymous intake uses a privileged service key. Add
   atomic submission quotas and a validated human/bot challenge before making
   an unrestricted public submission endpoint accessible. Do not confuse the
   existing login-attempt limiter with a complaint-submission limiter. The
   24-digit status lookup also needs throttling.
2. **Staging deployment:** Function code includes the 1.9 MB frozen classifier
   JSON and its local import graph. Deploy the complete, immutable bundle to
   staging with an explicit guest-auth plan, and then verify authentic HTTP
   submission and status lookup. Do not substitute a placeholder function.
3. **Real Auth and RLS:** Validate two genuine test citizen accounts, two
   separate department memberships, and an admin through actual staging JWTs;
   prior six-actor SQL simulations were transactional, not signed-in users.
4. **Migration provenance:** Staging `schema_migrations` uses fresh backfill
   version IDs instead of original source filenames. Reconcile an exact
   source-to-applied ledger before automated `supabase db push`; never mark an
   unexecuted source migration as applied.
5. **Release governance:** No production migration, production Edge deploy,
   `main` merge, or public domain switch until these gates pass and the owner
   approves release.

**Verdict:** Source intake boundary is safer and locally verified. Hosted
submission and public launch remain **blocked**, not falsely certified.
