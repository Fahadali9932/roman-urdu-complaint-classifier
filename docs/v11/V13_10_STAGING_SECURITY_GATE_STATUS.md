# V13.10 — Staging Schema Backfill and Security Gate (BLOCKED)

## Scope and safeguards

- **Only** Supabase staging `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`) was modified.
- No writes to the existing production database, model artifacts, training data, or `main`.
- Work began from remote commit `8fd938b` in an isolated V13.10 Git worktree.
- At preflight, staging had six department rows, and zero profile, department membership, or access-request rows.

## Confirmed migrations applied to staging

| Staging migration name | Source SQL | Status |
| --- | --- | --- |
| `v13_10_backfill_20261114_core_complaints_privacy` | `20261114000000_core_complaints_and_privacy.sql` | Applied |
| `v13_10_backfill_20261114000003_controlled_demonstration_submissions` | `20261114000003_controlled_demonstration_submissions.sql` | Applied |
| `v13_10_backfill_20261115000000_security_hardening` | `20261115000000_security_hardening.sql` | **Not applied**; Supabase confirmation expired |

All later complaint migrations, Edge deployment, and real-account role tests remain pending.
The legacy numbered migrations were applied through the Supabase migration API under
new V13.10 names; staging migration history must be reconciled before any future
CLI-driven rollout. Do not mark absent historical versions as applied without
comparing schema and function definitions.

## Critical temporary staging exposure

The original core schema exposes **five anonymous-callable `SECURITY DEFINER`
functions**: `admin_provision_department_staff`, `admin_reassign_complaint`,
`check_auth_rate_limit`, `record_auth_attempt`, and
`staff_update_complaint_status`. The security advisor also reports one
`SECURITY DEFINER` view, `department_complaints_view`.

These are staging exposures introduced by incomplete legacy migration replay,
not evidence of an attack or proof that any record was accessed. At inspection,
staging had no citizen/staff profiles. The privileged function bodies have their
own authorization checks, but grants are overly broad and **must be closed**.

**Security gate: FAIL. Do not publish staging, create users, or conduct real-user
tests until the V13.10 migration sequence is completed and re-audited.**

## Required recovery once Supabase confirms the migration

1. Obtain fresh approval for the blocked `20261115000000_security_hardening.sql`
   migration through Supabase's confirmation flow. Do not route around this
   approval by executing the same DDL through an unrestricted SQL endpoint.
2. Apply remaining existing migrations in filename order, through
   `20261126000001_shared_ai_classification_reviews.sql`, verifying each result.
3. **Reassert V13.9 security at the end:** the backfilled 20261114 functions
   replace the already-applied staging `is_main_admin` and
   `get_active_staff_department` definitions. Re-run the hardened definitions,
   grants and policies from `20261127000000_harden_staff_access_rpc_permissions.sql`
   in a new forward migration after complaint schema replay, then apply the
   guarded closure from `20261127000001_close_public_complaint_rpc_access.sql`.
   Never rely on historical migration records alone to prove effective grants.
4. Run `supabase/tests/v13_9_rpc_security_invariants.sql` and the new
   `supabase/tests/v13_10_staging_security_readiness.sql`. Investigate every
   `FAIL`; check the staging Security Advisor again. Revisit guest-tracking
   function exposure separately before inviting public traffic.
5. Only then run two-user and two-department authenticated RLS and Edge
   workflow tests using disposable staging identities, with a documented
   cleanup. These tests **have not run**.

No live launch or security certification is claimed at this checkpoint.
