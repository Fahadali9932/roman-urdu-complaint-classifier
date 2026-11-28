# Step 2 — secure authentication integration checkpoint

Remote baseline: 4c7c5922c829f79415bfc7c10d2b63c0876f4c69 (V25).
Staging endpoint: staff-credential-exchange (active version 1).

## Delivered
- src/services/v25StaffSession.ts: role-scoped credential exchange, verified session installation, server-side identity and membership check, MFA state, forced password-change and onboarding state, TOTP enrollment/challenge, real local session sign-out.
- src/test/V25StaffSession.test.ts: 15 regression cases; authored but not executed from this connector environment.
- Live catalog verification: 5 Auth users, zero main-admin profiles, zero active head/officer memberships, 4 verified MFA factors (aggregate only). Legacy resolver is not executable by anon/authenticated, and the exchange preparation RPC is executable by service_role. No new accounts or credentials were created.

## Local cutover (required)
The tracked remote UI remains older than the current local staff-auth work. Do not overwrite the local implementations or treat this module as already wired. Integrate the new module at the actual staff sign-in screen/controller after reviewing local worktree and remote changes:
1. Call beginDepartmentSignIn exactly once with explicit department and expected head/officer role. Remove direct client email resolver, local demo fallback in live mode and duplicate auth calls. Call beginAdminSignIn for admin. Do not create a UI session before result.state is ready.
2. For mfa_required, list verified TOTP factors or explicitly enroll via enrollStaffTotp; present QR securely, do not log secrets, and use verifyStaffTotp. Handle cancellation with endLiveStaffSession; never persist QR/secret or treat enrollment alone as verification.
3. For password_change_required, use the existing verified staff password-change workflow. Do not change membership flags from client-side metadata. For onboarding_required, use the existing controlled officer onboarding/approval flow, then call verifyStaffSession again. No portal workspace access in these states.
4. On route entry, token refresh and auth/session changes, reverify using getUser and database role/membership via verifyStaffSession. Clear cached UI role/session state on failure or sign-out. Avoid async Supabase calls inside synchronous onAuthStateChange callback; schedule verification outside callback. A stored UI session is never authoritative. Only state ready admits the intended role.
5. Preserve the citizen flow; verify real email/password, Google OAuth provider/redirect settings, role rejection, password reset and sign-out. Use allowlisted internal redirects. Do not share staff UI session with citizen routes.
6. Provision disposable real staging accounts through supported Auth Admin/approved staff onboarding, never by editing auth.users directly or modifying existing accounts. Test citizen, main admin, department head, assigned/unassigned officer and wrong-department officer. Enroll real TOTP and test AAL1 versus AAL2. Verify revoked/suspended account and forced-password-change handling, onboarding denial and session refresh.
7. Run local build, typecheck, lint, Vitest (including the new test file), and real browser desktop/tablet/390/320. Report failures and verified screenshots. Do not merge into main or release publicly before pass.

## Known blockers and decisions
No local browser/worktree access in this chat; user declined Work handoff. The existing remote legacy auth service and UI were not modified to avoid replacing the substantially changed local staff implementation. No test accounts were provisioned because supported Auth Admin creation and real session verification were not available via connected tools. No real HTTP credential exchange, OAuth, MFA, browser or test runner execution claimed. Backend and production were left unchanged. Step 2 is not complete until local cutover and real tests pass. Budget: zero.
