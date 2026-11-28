# V23 live staging integration — verified checkpoint

Target: awaaz-e-awam-staging (jvbulmmdwovtgaxojxhn). Production untouched. No paid services enabled.

## Applied staging migrations (in actual application order)

| Remote version | Repository SQL |
|---|---|
| 20261128071733 | docs/staging/v23_safe_additive_foundation.sql |
| 20261128072027 | docs/staging/v23_operational_bridge.sql |
| 20261128072057 | docs/staging/v23_operational_guard_null_safety.sql |
| 20261128072256 | docs/staging/v23_verified_evidence_workflow.sql |
| 20261128072601 | docs/staging/v23_atomic_citizen_intake.sql |
| 20261128072714 | docs/staging/v23_officer_onboarding_guards.sql |

Do not blindly run db push or the original pending V19/V23 SQL. Historical migration tracking diverges; the above are actual staging migrations, not a clean-install migration sequence. Reconcile local/remote history with verified object definitions before any further deployment.

## Deployed Edge Functions
- submit-classified-complaint v3: atomic intake + location, max two automatic departments. Existing V11/Run004 inference retained; Run006 parity and deployment pending.
- upload-department-work-proof v3: server-issued expiring location verification, actual private file upload, transactional proof metadata. 
- manage-department-officers v4: mandatory deliverable email, provider-backed HMAC OTP, atomic verification, onboarding guards.

## Live PostgreSQL verification
Four rollback-only fixture suites passed: assignment/commencement/idempotency/extension/warnings/notifications; GPS and missing evidence denial + DB-only supervisory review/two-department non-closure; atomic citizen intake, private contact, two-department and three-department review; OTP cooldown, undispatched challenge denial, failed attempt count, replay, approval and suspension guards.
No real provider email or physical photo was uploaded during these tests. No test complaints, memberships, work orders, verification records or OTP challenges remained after rollback.

## Source changes
Updated the existing fieldOperations service to use server GPS, evidence upload, heartbeat, private profile photo and review endpoints. Added officer authenticator MFA enrollment/challenge to the existing login card. No approved page redesign. GitHub commits exist on this branch; full TypeScript/lint/Vitest and real browser verification NOT run in this environment.

## Remaining acceptance blockers
- Configure verified Brevo sender and BREVO_API_KEY / BREVO_SENDER_EMAIL as staging Edge Function secrets. Optionally set dedicated OFFICER_OTP_HMAC_SECRET. Configure Supabase Auth custom SMTP separately. No secret values in chat/Git.
- Provision authorized real test HOD/Officer/Citizen accounts, verify MFA/email/password/onboarding and profile photo signed URL rendering. No staff memberships currently exist in staging.
- Actual citizen image upload is still separate from complaint creation; require atomic/gated photo intake. Authoritative Karachi boundary needs verification. Existing manual-review administrative workflow needs an authorized operator despite deferred Central Admin UI.
- Run006 Python/TypeScript decision parity, bundle/resource test and actual deployment remain pending.
- Validate legacy role checks, RLS, staff access advisor findings, route/bundle isolation, real multi-device complaint-to-resolution workflow, notifications/realtime and error handling. Existing citizen confirmation/72-hour closure guard preserved; reconcile with intended HOD-final closure before changing it. GPS proximity does not establish physical presence or prevent spoofing.
- Complete repository migration reconciliation, local build/test/browser gates and secure production readiness review. Do not merge or deploy public websites yet.
