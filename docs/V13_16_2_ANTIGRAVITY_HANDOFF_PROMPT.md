# V13.16.2 — Copy-paste Antigravity integration and final staging QA prompt

You are implementing **Awaaz-e-Awam V13.16.2 — atomic department acceptance and staging hardening**. Do the remaining work in one carefully verified pass. Work on the repository `Fahadali9932/roman-urdu-complaint-classifier`. Preserve the dirty primary Windows workspace, frozen models, all datasets and existing development work.

## First: choose exactly one safe integration route

1. Run `git status --short`, `git worktree list`, `git branch -a`, and `git fetch origin`. Never reset, clean, discard or overwrite someone else's changes.
2. **Preferred when the branch exists on GitHub:** create an independent review worktree from `origin/feature/v13-16-2-department-staging-final`. This branch **already contains the patch**. Do **not** apply the downloadable patch again.
3. **Offline patch alternative only when the branch is not available:** start a new clean branch from `origin/feature/v13-16-1-department-operations-refinements` (base `71b7ece28199e67f8444aec2c71a2bf6f0407602`) in an isolated worktree, then `git am` the attached `Awaaz_e_Awam_V13_16_2_Atomic_Staging.patch`. Stop on any conflict rather than dropping or force-applying changes.
4. Confirm only these V13.16.2 changes are integrated: two staging migrations, their SQL security test, one Edge gate, department case-service/page acceptance wiring, portable Chrome QA script, and the two docs. The existing citizen portal and UI design should remain intact.

## Validate the integrated branch

Run from the new clean worktree (install dependencies if needed):

```powershell
npm ci
npm run build
npx vitest run
node --test tests/edge/v13_16_2_atomic_batch_gate.mjs
node tests/edge/complaint-boundaries.mjs
node tools/ai_factory/v13_8_2_verify_production_bundle.mjs
python -m unittest discover -s tests/v11
npm run lint
node tools/ai_factory/v13_16_department_browser_qa.mjs
```

Before launching browser QA, privately set `AWAAZ_QA_STAFF_USERNAME` and `AWAAZ_QA_STAFF_ACCESS_KEY` to a dedicated, authorized **non-production** department test account. Do not paste the password into chat, commit it to any file, or let command output echo it. The script intentionally stops when these variables are absent.

The Python tests can regenerate a tracked evaluation report; inspect before restoring only the generated report. The browser script dynamically chooses free localhost ports; it captures department portal pages in 1440/1024/768/393/320px and fails for overflow or clipped headings. Review resulting screenshots as well as Chrome console/network logs. Manually exercise case tabs, search, filters, queue pagination, mobile drawer and save/edit interactions. Fix *actual* functional/mobile defects and re-run tests before committing.

## Required live staging checks (not yet completed)

Use only staging project `jvbulmmdwovtgaxojxhn`. **Do not touch the production project `akbwiedtmxjxcjscgitw` or deploy publicly.**

The two V13.16.2 migrations were already applied to staging, so inspect the migration ledger and function definitions **before** applying anything. Check `supabase/tests/v13_16_2_atomic_staff_batch_security.sql`. Existing static checks passed but staging previously had zero Auth users, memberships and complaints.

1. With an authorized owner/admin, create disposable **real Auth users through Supabase Auth**, not direct writes to `auth.users`, fake JWTs or hardcoded bypasses. Include citizen A, citizen B, staff KMC, staff in another department, and main admin. Grant each role using existing authorized department-provisioning paths; never fabricate staff sessions or share credentials in logs, screenshots or commits.
2. Seed staging-only representative complaint reports through real intake and secure assignment workflows. For a valid KMC batch prove all reports transition to accepted together, a single consistent timeline/outbox update per report is recorded, and public tracking reflects the outcome.
3. Reissue the same key/payload: expect `idempotentReplay: true` with no new timeline/outbox records. Reuse the key with different IDs: expect rejection. Attempt a mixed valid+wrong-department batch and a mixed valid+wrong-status batch: verify **every** update rolls back.
4. Prove a staff JWT from one department cannot read or alter another department's private reports or accept that department's batch; a citizen JWT cannot access another citizen's complaint; anon cannot call the atomic staff function. Verify guest tracking returns only its intentionally scoped public response.
5. Re-check Supabase security/performance advisors and document all remaining warnings. Confirm that none represents unintended direct access or cross-tenant leakage; use reviewed additive migrations if fixes are actually needed.

## Release discipline

- No ML training, model substitutions or model-weight edits. Compare both frozen model files to the checked-out Git base; older handoff reports cite different SHA256 values, so explicitly report any provenance mismatch.
- No paid Supabase upgrade, external paid API, force-push, unreviewed schema change in production or direct push/merge to `main`.
- Commit legitimate fixes on a **new feature/review branch**, push to `origin` using the user's configured GitHub auth, and verify local/remote SHA. Open a PR for review; do not claim production approval without real multi-account test evidence.
- Prepare a final handoff with changes, passed/blocked tests, browser screenshots, migration ledger, remaining warnings, model integrity, branch, remote SHA and clear production release gates. If credentials or account provisioning permissions are missing, stop only the blocked live-test step, report the exact blocker, and **never claim completion of that test**.

Work in a single focused integration pass, preserving the original Windows worktree. No need to generate a second patch if the published feature branch is available.
