# V24 staging security checkpoint

- Applied migration: 20261128082107 `v24_private_staff_login_boundary`.
- Deployed staging Edge Function: `staff-credential-exchange`, version 1; JWT verification intentionally disabled at the gateway for password sign-in; the function verifies credentials before returning tokens.
- Former username-to-email RPC is service-role only. The new prepare RPC is service-role only; it checks active membership and canonical Auth email; 10 attempts per normalized department/identifier per 15-minute window.
- SQL checks passed: public RPC privileges revoked, canonical Auth email, cross-department lookup denied, 11th attempt denied, quota window reset, suspended membership denied. Fixture rolled back.
- Single-department DB workflow checks passed: cross-department assignment denied, assignment, start, GPS validation, evidence recording (synthetic storage metadata only), head approval, citizen confirmation, closure. Fixtures rolled back; no records persisted.

## Required integration
In the current local staff auth implementation, replace client-side email resolver RPC with `supabase.functions.invoke('staff-credential-exchange', { body: { identifier, department, password } })`. Validate the returned access_token and refresh_token and call `supabase.auth.setSession({ access_token, refresh_token })`. Continue existing membership, role, forced password change and MFA checks; never route around them. Do not fall back to offline auth when Supabase is configured. For new clients, send department scope explicitly. No password or token logging.

## Release blockers
Real browser sign-in, invalid-login HTTP response, MFA, rate-limit behavior under live concurrent requests, rate-limit retention cleanup, alias/IP abuse testing and storage binary uploads remain unverified. The SQL fixtures simulated claims, not real sessions. The connected Git branch does not include all current local dirty staff portal work; do not overwrite it. The public lookup is now intentionally unavailable on staging; older clients calling it will fail until wired to the replacement. Do not apply to production until the coordinated frontend/edge migration is tested. Remaining advisor warnings: two intentional public definer RPCs, 48 authenticated definer RPCs, six no-policy INFO findings (including the new deliberately service-only quota table), leaked-password protection unavailable under the existing free plan. No Vercel or Cloudflare project was created. No model or production change.

The SQL and deployed Edge source are preserved here as a staging record; move into canonical migrations/functions paths once the local layout is verified.
