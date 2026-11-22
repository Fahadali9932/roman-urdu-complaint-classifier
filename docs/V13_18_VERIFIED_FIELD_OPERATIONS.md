# Awaaz-e-Awam V13.18 — Verified Field Operations

## What this branch actually delivers

This is an additive, department-operations feature built on the published V13.17 citizen evidence, location map and archive, base `930f209f84a9258673fc075a75d6b82f065bd14c`. It does **not** replace the frozen citizen classifier models, erase previous changes, or deploy to production.

| Person | Workspace | Allowed actions |
|---|---|---|
| Main administrator | `/admin/access` | Invite staff by individual email, choose department, designate head/officer, review roster, change role and revoke memberships (requires AAL2 for mutations) |
| Department head | `/department?view=dispatch` | Search real incident cases, assign an officer with deadline and instructions, inspect backlog, approve extensions, review private photo/GPS proof, return/reject work, approve verified work, and close eligible citizen records |
| Field officer | `/department?view=field` | See **only assigned orders**, start work, view deadline/overdue indicators, request extensions, capture location and photo, submit proof for supervisor review |
| Citizen | Own complaint detail | See **approved** department photo in private My Complaints, confirm completion or report that the issue persists |

Navigation includes **Dispatch**, **My Field Work**, **Officer Team**, **Evidence Review**, and **Verified Archive**, with role-specific visibility and mobile styling. Completed/verified orders leave active work lists and remain in their archive. The officer roster shows verified, open, overdue, and on-time counts; a simple encouraging 1–5 rating appears only after 5 verified cases. Ratings are indicative and must never be used as a disciplinary assessment without human review.

## End-to-end state transitions

1. Main administrator invites an approved unique officer work email, assigns a department and role. Users set their passwords and complete TOTP authenticator enrollment/verification. A stored browser username or knowing the URL is never proof of access.
2. A department head sees real cases, chooses one officer, enters a deadline and written instructions. Assignment uses real individual complaint UUIDs as durable linked records instead of temporary case grouping IDs.
3. Officer starts work, and the dashboard shows normal / due-soon / overdue deadline indicators. Extensions require head approval and leave an event trail.
4. Officer visits the site, provides explicit GPS permission (ideally high accuracy), takes a photo and submits both. Edge Function checks the access token, staff role, 1 MiB image limit, real image file signature, and plausible Karachi coordinate bounds, then stores the photo **privately**.
5. Server compares current coordinates with the original citizen-submitted pin, records distance/accuracy and hashes the image to warn on duplicate uploads. Head sees the actual private photo and approves or returns it. Suspicious/missing original location requires a written justification before approval.
6. Only approved evidence appears in the citizen's authenticated My Complaints. The citizen can confirm or dispute the work once; dispute count contributes to roster quality feedback.
7. In **Verified Archive**, head may explicitly close the linked citizen reports using the existing audited status transition/notification RPC. Only `in_progress` reports with verified proof from **every** assigned department may be closed, and only from the primary department. Reports still in `assigned` or `accepted` first need to be advanced through the existing authorized department lifecycle.

## Security boundaries

- Head/officer grants come from active **database memberships**, not editable profile metadata. Sensitive RPCs require verified Supabase JWT **AAL2**. A department route is publicly discoverable; authorization is enforced by the backend, rather than trying to hide the URL.
- New work tables use RLS. Direct client mutations are revoked; audited SECURITY DEFINER operations check actor, role, department, target and status. Officer complaint reads are limited to linked assignments; heads retain the authorized department inbox.
- Existing status updates are guarded by a database trigger so the legacy path cannot bypass the new approved-evidence requirement for resolving a complaint. Multi-agency completion requires proof from all assigned departments.
- Evidence bucket `department-work-proof-private` is non-public. Only assigned staff/head or an authenticated citizen who owns an approved linked complaint can obtain temporary signed downloads. The Edge Function uses the service-role key **only on the server**.
- GPS proximity is *not* reliable cryptographic proof of on-site work; photo hashes only identify exact duplicates. Neither method can guarantee the image is camera-original or not AI-generated. Human supervisor review, audit logs, consent and explicit flags are the practical safeguards. A dedicated forensic provenance service would require further design, privacy assessment and potentially paid tooling.
- Existing V13.17 public map remains anonymized/coarse. Private proof images and precise work GPS are never published there.
- Local seeded demo data can be used only in unconfigured development/test. Production requests fail closed without Supabase. Temporary local passwords are generated per browser session (or provided through ignored local environment configuration); no shared demonstration password is embedded in the local adapter.

## New files and changes

- `supabase/migrations/20261203000000_v13_18_verified_department_work_orders.sql` — schema, 2FA role authority, data access, assignment, evidence, citizen feedback, guarded closure, audit events.
- `supabase/functions/upload-department-work-proof/index.ts` — bounded, authenticated image uploader.
- `supabase/functions/provision-department-staff/index.ts` — individual account invitations and server-verified role selection.
- `src/features/department/services/fieldOperations.ts`, `src/features/department/components/FieldOperationsDesk.tsx`, `src/features/department/field-operations-v18.css` — role-aware service and responsive workspace.
- Existing department auth/login/dashboard/sidebar/topbar and admin access page — unique email login, TOTP, invitations, roster, navigation.
- `src/components/citizen/CitizenProofPanel.tsx` — private proof and feedback in existing My Complaints detail.
- New Vitest and static Edge security regression checks.

## Installation and staging-only release gates

1. Review the feature-branch diff against V13.17. Keep your primary worktree and other branches unchanged.
2. Run `npm ci`, `npm run build`, `npx vitest run`, `npm run lint`, `node --test tests/edge/v13_18_work_orders_security_gate.mjs`, and your existing Python/Edge security tests.
3. On a **disposable Supabase staging project only**, inspect the SQL, then apply the migration **after all V13.17 migrations**. Deploy `upload-department-work-proof` and updated `provision-department-staff` Edge Functions. Configure real SMTP/invite email and service-role environment **on the Edge server only**. Never put service-role values in any `VITE_` variable.
4. Create 1 staging main admin, 1 head, 2 officers and 2 independent citizen users; enroll and verify MFA. Test forbidden cross-department/cross-officer access, signed photo permissions, missing/inaccurate GPS, duplicate photo warning, approved/rejected proof, citizen disputes, closure and rollback/idempotency.
5. Run *actual* Chrome/Safari mobile and desktop QA and keyboard/screen-reader checks. In this code workspace Chromium was unable to launch because the sandbox denied its Unix process socket; the in-repo static/unit suites do not replace live visual testing.
6. Conduct a reviewer-approved pull request and a migration rollback rehearsal before any production deployment. No production database, Netlify release or GitHub main branch was changed as part of writing this feature.

### Read-only staging checkpoint (22 November 2026)

The verified staging project is `jvbulmmdwovtgaxojxhn` (separate from production `akbwiedtmxjxcjscgitw`). It currently has **zero Auth users** and **does not contain the V13.17 incident-geo table** or the V13.18 work-order tables. Its migration ledger includes V13.16.2 atomic acceptance but not V13.17 evidence/geo. Do not deploy V13.18 directly over that incomplete schema or run a blind database push across the historical ledger mismatch. Reconcile and verify prerequisites on staging, then test with real AAL2 identities.

**Important limitations:** No live staging accounts, SMTP, database credentials or Edge deployment were provided in this execution workspace. Therefore real JWT/RLS/stored-procedure execution and uploaded-photo validation against a live Supabase project remain mandatory release gates; automated static tests alone cannot certify them. A screenshot-based UI claim or a declaration that AI-generation detection is solved would be false.
