# V25 Step 1 staging security verification

Status: database hardening applied and verified on staging only. Step 1's unrestricted production release gate is not fully cleared.

## Applied migrations
- 20261128082430 v25_mfa_and_evidence_access_boundary
- 20261128082436 v25_admin_mfa_null_fail_closed
- 20261128082526 v25_staff_login_alias_quota

Seven pre-change function definitions and the original quota function are preserved in the V25 rollback files. Actual migration SQL is preserved in V25_STAGING_SECURITY_MIGRATIONS.sql. These are staging records; the canonical local migration directory has not been confirmed.

## Evidence
- 37/37 application tables in public and app_private have RLS enabled.
- 2/2 application views have security_invoker=true.
- 3/3 storage buckets are private.
- 39 access-control assertions passed: nine synthetic role contexts each checked evidence table visibility, storage-object visibility, admin predicate and evidence authorization predicate (36); plus denied unassigned-officer priority mutation, allowed MFA-head priority mutation, and denied legacy direct resolution (3).
- Five quota checks passed: ten attempts shared across username/employee ID, eleventh attempt via email denied, no email returned on denial, stale quota cleanup, and reset after the fifteen-minute window. Fixtures were rolled back.
- Post-test counts: 5 pre-existing Auth users, 0 complaints, 0 department memberships, 0 quota rows; synthetic storage metadata was rolled back.
- Privileged functions: reviewed guard excerpts for all 48 authenticated-callable definer functions; reviewed full definitions of the targeted legacy RPCs and evidence helpers. This is not an exhaustive adversarial proof of all function paths.
- The only two anonymous-callable definer functions are guest tracking and public aggregate issue cells. Tracking edge code uses a 24-digit cryptographic guest tracking number; lookup returns limited status metadata; aggregate cells suppress counts below eight. Retain those intended functions pending full HTTP abuse/differencing tests.
- Remaining advisors: 2 anonymous definer warnings, 48 authenticated definer warnings, 6 RLS-without-policy INFO findings for service-only tables, 1 leaked-password protection warning. No blanket privilege revocation or paid service enabled.

## Outstanding release gates
Real authenticated browser/MFA sessions, secure staff endpoint frontend cutover, edge/HTTP abuse tests and concurrency, comprehensive negative tests of remaining RPCs, guest/aggregate abuse and actual binary storage upload/download must still pass. Local full frontend and dirty files were not available; no browser or local test suite was run. Verify MFA-enforced administrator entry and legacy head-only actions during integration. The citizen's access to officer proof remains governed by the existing separate approved-proof path; the citizen intake evidence policy is staff-only. Password breach protection is a paid Supabase feature, not enabled. No production modification, deployment, account provisioning, model modification or expenditure.

Remote pre-step checkpoint 33840b0c8dd885e12fa39e341d10445c0f52fcaf.
