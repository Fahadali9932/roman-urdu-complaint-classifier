# Copy/paste into Antigravity — Awaaz-e-Awam Phase V13.18

You are working on `Fahadali9932/roman-urdu-complaint-classifier` and MUST preserve all V13.17 citizen fixes, public Karachi map, responsive motion, frozen Run004/Run006 models, protected main and any local dirty work.

## Authoritative source

Use the **already implemented and reviewed** feature branch `feature/v13-18-verified-field-operations`, based on `930f209f84a9258673fc075a75d6b82f065bd14c` (`feature/v13-17-evidence-geo-archive-map`). Do not write the same feature again with another AI. Apply the supplied `Awaaz_e_Awam_V13_18_Field_Operations.patch` **only if the branch was not fetched and only on that exact base commit**. Never apply both; it would duplicate commits.

Read `docs/V13_18_VERIFIED_FIELD_OPERATIONS.md` fully before doing anything. First run `git status --short`, `git branch -vv`, `git remote -v`, `git log -1 --oneline`, `git worktree list`. If there are existing changes, preserve them and use a new isolated worktree; never reset, force-push, wipe files, delete the user's changed work, or merge straight into main.

## Mission — evaluate the full implemented workflow

1. Confirm **individual invited work email/password plus TOTP MFA** for every approved head and officer. Legacy username/access key is allowed only in explicit local development, never production. Department route visibility is not secrecy: server JWT, department membership and RLS are mandatory.
2. Central admin can invite unique approved accounts, set `head`/`officer` roles, revoke membership, and view workforce status. Verify only AAL2 main administrators may change staff privileges.
3. Department head sees real incoming case groups, assigns one responsible officer and deadline/instructions, reviews extensions, observes on-time/late/active counts and transparent encouraging **officer rating** (new officers not rated under five verified cases).
4. Officer sees only own assignments, can begin work, request extra time, and take a current **on-site photo + explicit GPS** to submit. Camera photo is bounded and validated, stored privately and audited. Head reviews actual proof with original location distance, GPS accuracy and exact-duplicate flag; can approve or return. Do not claim any free AI detector can scientifically prove image authenticity.
5. Approved proof is visible only in the authenticated complaint owner's **My Complaints** details; citizen can confirm or dispute. Public map must never reveal original high-resolution photo, owner identity or precise GPS.
6. Active assignments, due-soon, overdue, pending-proof and verified **archive** are clear, compact, mobile responsive, and consistent with the citizen portal's serious civic design—not a generic SaaS analytics template. Verified work never disappears from the record. Head must explicitly close eligible in-progress citizen records through the existing status timeline/outbox; all relevant departments must verify proof first.
7. Review optional improvements without shifting the existing feature's architecture. Keep the UI understandable at 320px, 393px, 768px, 1024px and 1440px and do browser testing on a host that permits Chrome.

Local-only demonstration authentication now uses per-session generated passwords; reveal them through the collapsed local-demo section of each login form. Do not assume the old fixed demonstration password works. For scripted local browser QA, set `VITE_AWAAZ_LOCAL_STAFF_PASSWORD` in a private, ignored `.env.local` and pass the same value as `AWAAZ_QA_STAFF_ACCESS_KEY` to the QA process. Never commit or screenshot these values.

## Run these gates on a clean isolated checkout

```powershell
git fetch origin
git switch --track origin/feature/v13-18-verified-field-operations
npm ci
npm run build
npx vitest run
npm run lint
node --test tests/edge/v13_18_work_orders_security_gate.mjs
node --test tests/edge/v13_17_geo_evidence_security_gate.mjs
node --test tests/edge/v13_16_2_atomic_batch_gate.mjs
node tests/edge/complaint-boundaries.mjs
node tools/ai_factory/v13_8_2_verify_production_bundle.mjs
python -m unittest discover -s tests/v11 -q
git diff --check
```

If the branch does not exist on origin yet, use **exactly one** isolated worktree based on V13.17, verify the base SHA and apply the downloaded patch:

```powershell
git fetch origin
git worktree add -b feature/v13-18-verified-field-operations "D:\RomanUrdu_V13_18_Field" 930f209f84a9258673fc075a75d6b82f065bd14c
Set-Location "D:\RomanUrdu_V13_18_Field"
git am "$env:USERPROFILE\Downloads\Awaaz_e_Awam_V13_18_Field_Operations.patch"
```

**Staging deployment requires an explicit real-staging project and safe administrator access.** On a disposable staging Supabase project, inspect and then apply migration `20261203000000_v13_18_verified_department_work_orders.sql` only after V13.17, and deploy `upload-department-work-proof` and `provision-department-staff`. Configure actual SMTP, service-role secret in Edge Function environment only, and bootstrap approved head/officer email accounts and TOTP. Test multiple identities, RLS access denial, cross-department isolation, full evidence lifecycle, status closure and no citizen-image leakage. Do NOT use development passwords as proof that staging auth works. Rehearse rollback and obtain human approval before applying SQL to production or publishing.

### Verified staging prerequisite (22 November 2026)

The intended staging project `jvbulmmdwovtgaxojxhn` currently has zero Auth users and no V13.17 incident-geo table. Its migration ledger ends with V13.16.2 atomic acceptance. Do not apply the V13.18 migration or deploy its functions until the missing V13.17 prerequisite and migration provenance are reconciled. The production project `akbwiedtmxjxcjscgitw` is not a substitute. Existing credentials must never be repurposed across those environments.

## Finish and report

- Report build, Vitest totals, Python results, lint, Edge, bundle audit, real browser results, untested release gates and any legitimate issues discovered. Do not invent passed browser or live-Supabase tests.
- If changes needed, use a new follow-up commit on this feature branch and retest. Show the exact commit SHA and remote URL, and open a **PR** into main; do **not** merge or deploy without the user's approval.
- Supply an updated `git format-patch` and concise summary with what changed, how to run `npm run dev -- --host 127.0.0.1 --port 5173` to inspect `/department`, `/admin/access` and `/my-complaints`.
- Keep the private citizen photos, precise GPS, 2FA secrets, and Supabase keys out of screenshots, build artifacts and Git history.
