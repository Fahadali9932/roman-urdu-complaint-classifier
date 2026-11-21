# V13.15.6 — Department staff sign-in diagnostics

## Why `roads-01` can show "Invalid username or access key"

`roads-01` identifies the KMC department login screen. In a connected
environment it maps to a Supabase Auth account; the username alone does not
create that account. The submitted access key must be the **password of that
account in the configured Supabase project**, and the user must have an active
KMC row in `public.department_memberships`.

The UI intentionally does not disclose whether a specific staff account
exists. An invalid password or an absent account therefore produces the same
generic rejection. Do not bypass it or embed credentials in the frontend.

## Changes

- Authenticate known department usernames once per click; the context now
  both validates and stores the departmental session.
- Do not allow the legacy email fallback to override a wrong-department denial.
- Block browser-only demo-account fallback when Supabase is connected, and
  disable it in production builds without Supabase configuration.
- Show a clear local-demo notice when no Supabase environment is configured.
- Distinguish temporary network/authentication-server errors from invalid keys.
- Invalidate an authenticated Supabase session when staff membership is missing,
  revoked, or cannot be verified.

## Required safe verification in Antigravity (local machine)

1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present in the
   local environment **without displaying their values**. A URL and public
   publishable/anon key must point to the same intended staging project.
   Never add a `service_role` key or a staff password to frontend variables.
2. Confirm in the **staging** Supabase Auth dashboard that the intended KMC
   staff account has actually been created/verified and the password is known
   to the legitimate staff user. Only authorized administrators should create
   or reset that account.
3. Confirm the same Auth user ID has an `active` membership for the correct
   `department_id` in `public.department_memberships`. Do not grant access by
   modifying client/browser storage.
4. Restart the Vite dev server after environment changes. Test correct key,
   incorrect key, wrong department, revoked account, and disconnected network.
5. If a live Supabase account or staging credentials are absent, **stop** and
   request administrator provisioning. A code patch cannot invent a secure
   password or approve membership.

No database migration, model retraining, live deployment, account creation,
credential reset, or production database update is part of this change.
