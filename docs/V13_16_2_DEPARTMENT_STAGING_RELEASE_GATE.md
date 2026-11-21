# Awaaz-e-Awam — V13.16.2 department staging release gate

Checked: 22 November 2026 (PKT)

Base: `feature/v13-16-1-department-operations-refinements` at `71b7ece28199e67f8444aec2c71a2bf6f0407602`
Target: `feature/v13-16-2-department-staging-final`

## Implemented and verified

1. **Server-atomic grouped acceptance.** `staff_accept_department_report_batch` authorizes the logged-in department member (or main admin), validates 1–100 assigned reports, locks report rows, executes all acceptance/timeline/outbox writes in one PostgreSQL transaction, and uses an actor/department-scoped idempotency ledger. A failing report rolls back the whole batch. A duplicate request with the same fingerprint returns the original result, whereas a different payload cannot reuse the key.
2. **Secure frontend integration.** The department case detail sends exactly one authenticated RPC for a batch, accepts only previously assigned reports, retains its operation key across an uncertain network retry, and never announces a completed batch until the server confirms it.
3. **Security invariants.** `anon` cannot execute the new function, authenticated clients cannot read or write the private request ledger, and the function pins `search_path = ''`. Multi-department complaints are intentionally rejected by the batch endpoint pending independent agency-by-agency workflow support.
4. **Browser QA portability and credential hygiene.** The existing department screenshot script now locates the repository automatically, chooses unused local ports, supports a configurable Chrome binary, cleans up subprocesses, and checks viewport overflow and heading clipping. Hardcoded demo login credentials were removed; QA now requires privately supplied test-account environment variables.

## Database state

- Staging Supabase project: `jvbulmmdwovtgaxojxhn`.
- Applied migrations: `v13_16_2_atomic_department_batch_acceptance` and its audited null-safety reconciliation `v13_16_2_reconcile_atomic_acceptance_guards`.
- Executed SQL security assertions against staging: **pass**.
- Confirmed unauthenticated call rejects with PostgreSQL `28000 Authentication required`.
- At inspection, staging had **0 Auth users, 0 department memberships, 0 complaints**. No actual staff/citizen transition, rollback on a populated batch, or cross-department RLS scenario can be certified without genuine staging accounts and fixtures.
- Existing Supabase Security Advisor flags remain: intentional guest-tracking `anon` SECURITY DEFINER access and authenticated SECURITY DEFINER functions require role-based review; the new private RLS-enabled ledger deliberately has no user policies. Do not equate static assertions to complete security certification.
- **Production database and public website were not modified.**

## Automated test results

| Gate | Result |
| --- | --- |
| `npm run build` / TypeScript | PASS |
| `npx vitest run` | 627 passed, 1 skipped |
| `node --test tests/edge/v13_16_2_atomic_batch_gate.mjs` | 5 passed |
| `node tests/edge/complaint-boundaries.mjs` | 16 passed |
| `python -m unittest discover -s tests/v11` | 106 passed |
| `node tools/ai_factory/v13_8_2_verify_production_bundle.mjs` | PASS |
| `npm run lint` | Exit 0, pre-existing warnings |
| Staging SQL privilege invariants | PASS |
| Real Chrome multi-viewport QA | **BLOCKED** in Linux sandbox: Chromium process singleton permission denied |
| Five-account JWT/RLS integration | **BLOCKED**: staging has no provisioned users or reports |

The tracked candidate-model hashes on this exact base branch are `bd3241e91f80780d72f43911c06be1b4d1f6edd67f3f2f3519e41d1dfcfd556d` (Run004) and `165b7c21b1a05f870116b35f93144f98ccce9ff8c821d15c66eac3e4f62b5c4c` (Run006). Both match the Git baseline exactly, and **neither was edited here**. Older handoff reports cite different hashes; reconcile their provenance separately rather than claiming that the old hashes were verified.

## Remaining mandatory release gates

1. On an authorized staging project, provision disposable test users through **genuine Supabase Auth**, then assign two staff users to distinct departments and an admin through existing authorized membership/provisioning RPCs.
2. Seed representative **staging-only** complaint records through the normal intake workflow. Prove a positive bulk acceptance, idempotent same-key replay, wrong-department rejection, and atomic rollback when a batch includes a wrong-status or wrong-department report. Confirm timeline/outbox counts and citizen tracking updates; repeat all cross-citizen and cross-staff isolation tests.
3. Run the included portable Chrome QA in Antigravity/Windows on 1440, 1024, 768, 393 and 320px; inspect generated screenshots and console errors manually. Correct any real layout regressions before approving the branch.
4. Review Supabase Security Advisor warnings individually; document legitimate execution grants and remove unwanted ones under a separately reviewed migration.
5. Obtain explicit user approval, then open and review the PR. **Do not merge to `main`, deploy publicly, or apply production schema changes until the above live tests pass.**

This branch can be considered **locally tested and staging-migration verified**, not a public-production release.
