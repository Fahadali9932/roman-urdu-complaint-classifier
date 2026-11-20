# V13.8.2 — Demonstration Isolation, Narrow Viewport and Staging Security Audit

Date: 20 November 2026

## Scope and safeguards

- Changes made on an isolated feature worktree based on V13.8.1 (`9e50a446`); no frozen AI models changed.
- No paid services, production deployment, database schema changes, or data writes.
- The authenticated `/dashboard` route and existing guest routes retain their original security boundaries.

## Demonstration-only data boundary

The development-only `/dev/harness/citizen-dashboard` route now loads two compiled-in,
fictional complaint fixtures from `src/features/citizen/dev/DevCitizenDashboard.tsx`.
Its dashboard explicitly does **not** call `complaintService`, subscribe to Supabase
Realtime, read localStorage complaints, or poll live records. Only records marked
`isDemonstration: true` are rendered; the public guest-claim action is hidden.

`AppRoutes.tsx` lazy-loads the fixture component only behind
`import.meta.env.DEV`. The production build should contain neither the fixture
reference numbers (`DEMO-KHI-0001`, `DEMO-KHI-0002`) nor the development route.
This must be verified after every production build.

```powershell
npm run build
node tools/ai_factory/v13_8_2_verify_production_bundle.mjs
```

## 320px responsiveness

The previous report gave contradictory measurements: `scrollWidth = 357px` for a
320px viewport while claiming no overflow. Likely contributors were the four
non-wrapping complaint filter pills and complaint reference/department metadata.

The filter controls now use a two-column small-screen grid, with the original
horizontal treatment restored above the `sm` breakpoint. Card metadata can wrap
and long reference numbers break safely. `v13_8_2_browser_verification.mjs`
compares both document and body scroll widths to the **requested device width**,
reports offending elements, and exits with failure if either exceeds it.

**Verification boundary:** The container browser could not start because
Chromium's process singleton requires Unix sockets denied by this environment
(`socket() failed: Operation not permitted`). Desktop/tablet/390px/320px visual
verification must therefore be rerun on the user's Windows Antigravity machine:

```powershell
cd D:\RomanUrdu_V13_6_Review
npm run dev -- --port 5180
# In another terminal, from the same checkout containing V13.8.2:
$env:AWAAZ_DEV_URL = "http://localhost:5180"
node tools/ai_factory/v13_8_2_browser_verification.mjs
```

The browser script tests the secure redirect, fictional-only demo records, and
all four device widths and saves screenshots under `docs/v11/screenshots/`.
Do not report this gate green until it exits zero and screenshots have been
visually reviewed.

## Read-only Supabase staging inspection

Connected project: `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`). No user
records were queried; only PostgreSQL schema/policy metadata and Supabase
security advisor findings were read.

- Staging currently contains the staff-access schema (e.g. `profiles`,
  `departments`, `department_memberships`) and a single migration version
  `20261120121507`. It does **not** contain the complaint tables needed to test
  citizen A versus citizen B complaint access.
- Supabase security advisors report five `SECURITY DEFINER` functions currently
  executable by `anon`, and five functions with mutable `search_path`. Notably,
  `get_active_staff_department(p_user_id uuid)` can return active membership
  information for a user-supplied UUID without a caller authorization predicate
  in its function body. The functions are flagged for review; we have not
  established successful exploitation.
- Applying pending complaint migrations, changing RPC permissions, and testing
  two genuine citizen sessions require a separately reviewed staging-security
  change. Do **not** apply pending migrations to production as a shortcut.

The existing hosted project `awaaz-e-awam-db` was also inspected using
**read-only metadata queries only**. Its `complaints`,
`complaint_citizen_private`, `complaint_timeline_events`, and `profiles` tables
have RLS enabled. The citizen SELECT policy on `complaints` uses
`citizen_id = auth.uid()`, and the private-details SELECT policy tests that
the parent complaint belongs to `auth.uid()`. The `authenticated` role's
UPDATE column grants on `profiles` cover `email`, `full_name` and `updated_at`,
but **not** `role`.

These are positive **static** findings. They do not replace an actual
two-account API test, and no live citizen records were accessed. The staging
schema remains the appropriate place to conduct that test after its migrations
are reviewed and applied.

Security advisor reference:
https://supabase.com/docs/guides/database/database-linter

## Release decision

Frontend demonstration isolation is implemented and unit-tested. The mobile
browser gate and live multi-tenant RLS testing remain **unverified**. The
staging privilege warnings require remediation before public deployment.
