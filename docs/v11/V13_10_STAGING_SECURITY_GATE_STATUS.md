# V13.10 — Staging Schema Integration, RLS Tests, and Remaining Release Gates

## Scope and safeguards

- **Only** Supabase staging `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`) was modified.
- No writes to the existing production database, model artifacts, training data, or `main`.
- Work began from remote commit `8fd938b` in an isolated V13.10 Git worktree.
- At preflight, staging had six department rows and no users or complaints.
- After the transactional tests: **0 Auth users, 0 complaints, 0 memberships, 0 issues** remain.

## Staging migrations completed

1. Applied all staged core and complaint migrations, from
   `20261114000000_core_complaints_and_privacy.sql` through
   `20261126000001_shared_ai_classification_reviews.sql`, in source order.
2. Reasserted `20261127000000_harden_staff_access_rpc_permissions.sql` and
   `20261127000001_close_public_complaint_rpc_access.sql` **after** backfill, as
   older migrations replace some existing function definitions and policies.
3. Applied the forward V13.10 incident-case security fix and corrected the
   guest-status lookup. All 17 public tables now have RLS enabled.

**Migration provenance limitation:** The Supabase API assigned fresh V13.10
version IDs to legacy migrations. The database's history therefore differs
from source filenames. Reconcile carefully before any future CLI-driven push;
do not falsely mark unexecuted versions as applied.

## Actual bugs repaired

| Area | Discovered defect | Repair |
| --- | --- | --- |
| Migration ordering | V13.9 had created two policies before the older V11 security migration attempted to create them again | Reconciled policy replacement during the **staging** replay; final V13.9 protections reapplied |
| Multi-department issues | `20261125000000` referenced nonexistent `public.staff_profiles` | Policies now use `department_memberships` and guarded admin lookup |
| Issue status | Original issue constraint omitted `resolved` | Added `resolved` to fresh-install constraint |
| Incident case RPC | Cached idempotency result was returned **before** membership authorization and was indexed by key alone | Authorization runs first; cache lookup is scoped to the authorized case; anon EXECUTE revoked |
| Guest tracking | `get_guest_complaint_status` read missing `complaints.needs_review` column | Removed invalid field; 64-hex digest validation and pinned search path |
| Issue access | `complaint_issues` had SELECT RLS policies but no SELECT grant | Added authenticated SELECT only; direct INSERT/UPDATE/DELETE still denied |
| Trigger lint | Issue-update trigger inherited mutable search path | Pinned `search_path = ''` |

Forward migration: `supabase/migrations/20261128000000_v13_10_case_rpc_hardening.sql`.
The corrected original migrations are also committed so a new environment does
not reproduce the defects.

## Verification results

| Verification | Actual result |
| --- | --- |
| V13.9 SQL invariants | **6/6 PASS** |
| V13.10 staging security gate | **4/4 PASS** |
| Staging actor RLS/privileged RPC simulation | **PASS**, six disposable actor IDs, all changes rolled back |
| Cross-citizen isolation | **PASS**: other citizen sees no case, issues, or private contact |
| Cross-department isolation | **PASS**: KWSC and K-Electric each see their issue; unrelated SSGC staff sees none |
| AI correction queue | **PASS**: assigned staff may flag, others cannot; admin-only retrieval, deduplication, redaction and one-/two-department validation |
| Case acceptance idempotency | **PASS**: authorized KWSC may replay; K-Electric cannot read its cached result |
| Guest status lookup | **PASS**: anonymous digest lookup returns public status and no PII |
| Edge unit boundary suite | **16/16 PASS** |
| Vitest | **603 passed**, 1 skipped |
| Python V11.4 regression | **11/11 PASS** |
| Full Python unit test discovery | **Interrupted after prolonged inactivity**; no pass claim |
| TypeScript / Vite production build | **PASS**, bundle size warning remains |
| Supabase Health Advisor | **No notices** |

The role-isolation test uses `SET LOCAL ROLE` and JWT-claim simulation within a
database transaction. It is a meaningful RLS/RPC test, **not** a real HTTP
sign-in or real Auth token test. Auth.users fixtures were inserted only inside
the transaction and rolled back.

## Open security notices and release blockers

1. Security Advisor still reports **one intentional anonymous definer RPC**,
   `get_guest_complaint_status(text)`, required for guest tracking by a secret
   24-digit receipt. It exposes an allowlisted public status only; verify rate
   limiting and abuse resistance before public launch.
2. Advisor reports **15 authenticated-callable SECURITY DEFINER functions**.
   Several were exercised by simulated authorized/unauthorized identities;
   all still require a systematic function-by-function abuse review before
   public launch. A warning does not establish a leak, but neither does a
   green schema gate certify every privileged operation.
3. Staging currently has **zero Edge Functions deployed**. Therefore browser
   submission through the Edge classifier and actual Auth JWT end-to-end tests
   remain **unverified**. Do not represent SQL mocks as a complete live test.
4. Reconcile staging migration history with the original source sequence
   before `supabase db push` or automated migrations.
5. Existing production database was **not changed** in V13.10. Applying staff
   hardening to production, deploying Edge Functions, connecting a live domain,
   and merging to `main` are separate gated release decisions.

**Verdict: staging schema and SQL isolation gate PASS; public launch NOT YET APPROVED.**
