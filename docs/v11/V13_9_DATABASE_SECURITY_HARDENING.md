# V13.9 — Database security hardening and release gates

## Scope and change control

- Changes are isolated to database privileges/RPC authorization, an idempotent migration pair, and a read-only verification query.
- No model artifacts, training data, citizen records, or user accounts were changed.
- Both Supabase projects are already on the free tier; no paid feature was purchased.
- The review worktree is based on `7fde891` and the original Windows workspace was not touched.

## Applied changes (2026-11-20)

### Staging (`awaaz-e-awam-staging`)

Applied `v13_9_harden_staff_access_rpc_permissions` successfully:

- All five security-definer functions reject `anon` execution and have fixed empty search paths.
- `is_main_admin(p_user_id)` can check only the signed-in caller, preventing arbitrary account-role probing.
- `get_active_staff_department(p_user_id)` can only return the signed-in caller's own active membership.
- Public department directory and authenticated staff/admin RPC workflows retain their intended grants.
- A citizen cannot directly modify `profiles.role`, and an access requester cannot forge reviewer fields.

Supabase security advisors afterward: **zero anonymous-definer warnings and zero mutable-function-search-path warnings**. Five authenticated-definer advisories remain for workflows that intentionally require signed-in RPCs; these are not automatically safe merely because they require login. They need adversarial role tests before launch.

### Existing (`awaaz-e-awam-db`)

Applied `v13_9_close_public_complaint_rpc_access` successfully:

- Anonymous and authenticated calls to `submit_citizen_complaint` were revoked; `service_role` retains its required call path from `submit-classified-complaint` Edge Function.
- Anonymous calls to `staff_review_and_assign_complaint` were revoked; `authenticated` and `service_role` retain necessary execution rights, with authorization enforced inside the function.

Verified via `pg_catalog` privilege checks and a fresh Supabase security advisor scan: **zero anonymous-definer warnings**. Ten authenticated-definer advisories remain, plus `auth_leaked_password_protection`.

Attempted to apply the staff-access hardening migration to the existing database too, but Supabase required confirmation and the confirmation expired. **It was not applied there.** Do not misrepresent the production identity-lookup and profile-authorization hardening as complete.

## Required pre-launch security gates

1. Run `supabase/tests/v13_9_rpc_security_invariants.sql` on both projects. All rows must be PASS.
2. Complete the existing database's staff-access hardening after the protected confirmation is approved; verify `is_main_admin` and `get_active_staff_department` cannot be used to inspect another user.
3. Install the missing complaint schema in staging in the correct migration order, then rerun hardening: many schema migrations were historically applied in differing sequences and may replace functions or grants.
4. Perform real two-account tests for citizen complaint ownership, guest tracking secrecy, staff department isolation, rejected/revoked staff denial, administrator decisions, PII scrubbing, and non-admin RPC escalation. Use only test identities and rollback/cleanup in an isolated staging database.
5. Verify the protected Edge Function from guest submission through tracking before deployment; never call the privileged intake RPC directly from a browser.
6. Review all authenticated-executable definer functions. Function-level authorization matters more than suppressing an advisor warning; don't blindly revoke the RPCs that staff requires.
7. Supabase leaked-password protection is a **Pro-plan** feature. The free-plan constraint prohibits enabling it by upgrading. Set the strongest free minimum password requirements, require email confirmation, protect login with rate limiting, and recommend MFA where supported. Do not claim the paid protection warning can be cleared for $0.
8. Do not merge this feature into `main` or deploy publicly until these checks and regression tests pass.

## Verified test results

- New read-only SQL security invariants: **6/6 PASS** on staging and **6/6 PASS** on the existing database.
- `npm run build`: **PASS** (TypeScript + Vite); bundle-size warning remains unrelated to security.
- Full Vitest: **603 passed, 1 skipped** across 57 test files.
- Python V11.4 behavioral regression: **11/11 PASS**.
- Python V13.5 policy test: **blocked by absent** `data/v11/curriculum_runs/run_004/candidate_model.json` in this isolated clone; zero cases executed. Do not fabricate a passing result.
- Broad Python discovery: **stopped after prolonged lack of progress**; this is not a pass and must be diagnosed separately. Some benchmark tests also rewrite `data/v11/eval_v13_2/v13_2_evaluation_report.json`; that generated change is excluded from the commit.

## Key references

- [Supabase privileged functions](https://supabase.com/docs/guides/database/functions)
- [Anonymous `SECURITY DEFINER` function advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated `SECURITY DEFINER` function advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase password security and plan availability](https://supabase.com/docs/guides/auth/password-security)
