# Awaaz-e-Awam V13.18 — Staging Verification Handoff

Verified: 22 November 2026. Scope: existing **staging** project
`jvbulmmdwovtgaxojxhn` only. Production `akbwiedtmxjxcjscgitw`
and `main` were not modified.

## Completed on hosted staging

1. Confirmed staging is `ACTIVE_HEALTHY`, contains zero Auth users, and
   initially lacked both V13.17 evidence/map tables and V13.18 orders.
2. Applied existing repository migrations in dependency order:
   - `v13_13_hide_guest_claim_credentials`
   - `v13_17_private_issue_evidence_and_public_map`
   - `v13_18_verified_department_work_orders`
3. Deployed and confirmed ACTIVE three staging Edge Functions:
   - `upload-complaint-photo` (`verify_jwt=false`: guest tracking-hash or
     owner-authentication is performed inside the handler);
   - `upload-department-work-proof` (`verify_jwt=true`);
   - `provision-department-staff` (`verify_jwt=true`).
4. Found an actual evidence-version bug using a multi-role transaction:
   `now()` gave both old and new proof versions the same `submitted_at`
   value. An approved older proof could then be chosen after citizen dispute
   and rework. Applied the **new forward migration**
   `20261204000000_v13_18_monotonic_evidence_timestamps.sql` on staging.
   It uses per-insert `clock_timestamp()` and a unique `(order_id,
   submitted_at)` index; a rare collision fails rather than silently
   selecting the wrong evidence version. The migration is also checked into
   source for reproducible fresh deployments.
5. Executed `supabase/tests/v13_18_staging_field_operations_transaction.sql`
   successfully on the hosted database. Its fake `example.invalid` actors and
   storage objects ran within `BEGIN`/`ROLLBACK` and were not retained.

## Real PostgreSQL test coverage

- Department isolation and `aal2` enforcement for Head and Officer reads.
- Assignment by a department head to a real complaint UUID.
- Assigned officer start, documented extension, Head extension approval.
- Private proof-object existence check, service-only proof recording.
- Supervisor proof approval; rejection of pre-72-hour closure.
- Citizen ownership of approved proof, dispute, return for rework.
- Second proof submission, approval, citizen confirmation, historical feedback.
- Normal closure with timeline event; legacy status-RPC closure bypass denied.
- After a simulated 73-hour nonresponse, closure without a documented reason
  rejected; Head closure with a reason succeeded and wrote an audit row.

The signed-token/login path, actual browser permissions, and email delivery
were **not** tested by this SQL transaction: it simulates authenticated
roles/JWT claims while exercising real PostgreSQL RLS and database functions.

## Source quality gates after the correction

| Gate | Result |
| --- | --- |
| Frontend Vitest | **646 passed, 1 skipped** across 64 files |
| TypeScript + Vite production build | PASS, 0 compilation errors |
| Python backend unittest | **106 passed** |
| V13.16.2 / V13.17 / V13.18 Edge gates | **20 passed** |
| Complaint security boundaries | **16 passed** |
| Production bundle demonstration-auth hygiene | PASS |
| Oxlint | 0 errors, existing warnings remain |
| `git diff --check` | PASS |

The Python suite re-generated an unrelated checked-in V13.2 evaluation
report in the isolated QA worktree. That test-generated drift was discarded
after verification; no Run004/Run006 model or frozen report changes remain.

## Post-deployment read-only checks

| Check | Verified result |
| --- | --- |
| `auth.users` | 0; no real staff accounts yet |
| `department_work_orders` | 0 after rollback |
| `department_work_feedback` | 0 after rollback |
| Private work-proof storage objects | 0 after rollback |
| Anonymous direct geo-table read | Denied |
| Anonymous direct work-order read | Denied |
| Authenticated read of guest claim/tracking hash | Denied |
| Authenticated read of safe complaint reference | Allowed |
| Browser EXECUTE of service proof RPC | Denied |
| Service role EXECUTE of service proof RPC | Allowed |
| Anonymous public map on empty staging | 0 cells; expected |

The Supabase security advisor still reports two `rls_enabled_no_policy`
informational findings, two anonymous SECURITY DEFINER execution warnings
(guest status lookup and public coarse-cell map), and 31 authenticated
SECURITY DEFINER execution warnings. These require the existing RPC grants
and internal authorization checks to be reviewed before release; advisory
warnings alone do not demonstrate an exploit.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Local Head and Officer demo

Run `npm run dev -- --host 127.0.0.1 --port 5173` in the updated worktree.
When Supabase is **not** configured and this is a development build, open
`http://localhost:5173/department?dept=kmc`.

- **Department Head:** `roads-01`.
- **Field Officer:** `roads-02` (a separate local account mapped to the first
  officer in the local team roster).
- Both use the generated, session-scoped *local demonstration* key shown
  behind **Show temporary local access key** on the login page. No static
  password is checked into source.
- Sign out of Head, then sign into Officer in the **same tab** to inspect
  assigned local work orders. Local demo state is volatile and is not a real
  persisted multi-user backend. GPS/photo proof submission remains explicitly
  staging-only, so a demo cannot fraudulently mark evidence as verified.

## Remaining hosted end-to-end release gate

The administrator must supply or authorize real **staging-only** accounts:
one Main Admin, one department Head, one Field Officer, and one Citizen,
with reachable email inboxes and individual TOTP authenticators. Do not invent
real email addresses, extract credentials, send invitations, or insert Auth
users directly in SQL. Use Supabase Auth plus the supported invitation flow.

With those accounts, execute the complete real JWT/browser workflow on the
staging frontend: invitation, login/MFA, assignment, officer-only view,
upload, supervisor review, citizen confirmation/dispute, closure, revoked
membership behavior, private signed URL access and cross-account denials.
Record screenshots at 320, 393, 768, 1024, and 1440 px, light/dark where
supported. No production write or merge until explicit owner approval.

**Release statement:** Source implementation and transactional staging
database verification are complete; live signed-Auth/browser acceptance is
blocked by missing approved staging identities. Do not label production-ready.
