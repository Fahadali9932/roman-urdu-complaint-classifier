# V13.20 — distinct staff entry points and inline work deadline

This focused follow-up responds to the two screenshots provided on 22 November 2026: both browser tabs resolved to the existing Head session at `/department`, and the Chrome `datetime-local` popup covered the instructions field.

## What changed

1. **Separate sign-in URLs** that visibly identify the intended responsibility:
   - Department Head: `/department/head/login?dept=kmc`
   - Field Officer: `/department/officer/login?dept=kmc`
   - Central Administrator (already separate): `/admin/login`
2. **Distinct authenticated landing URLs**, protected by a role lookup:
   - Head: `/department/head`
   - Officer: `/department/officer`
   - Existing `/department` and `/department/login` remain compatible with earlier bookmarks and tests.
3. Role-specific login forms identify the correct local demo account and reject an identity whose verified role does not match the chosen portal. Directly changing the URL also displays a restricted-workspace message instead of the wrong role's dashboard. Backend JWT, MFA, membership and RLS still enforce actual authorization in live mode; the URL is not a security substitute.
4. The assignment deadline and officer extension date controls now use a compact **in-flow calendar with separate hour/minute/AM–PM fields and quick presets**. The picker expands the form instead of opening Chrome's large overlapping native popup. The existing local datetime value format and server RPC contract are unchanged. Both actions now reject dates in the past.
5. The sidebar identity changes between “Department Head console” and “Field Officer workspace.” The role-specific login offers a clear way to switch to the other sign-in form without granting privileges.

## Manual inspection on a Windows development machine

From a clean isolated worktree with the V13.20 patch applied:

```powershell
npm ci
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Open one ordinary browser window for the Head and one **separate private/incognito session** for the Officer:

| Responsibility | Login URL | Local demo username | Landing URL |
| --- | --- | --- | --- |
| Department Head | `http://localhost:5173/department/head/login?dept=kmc` | `roads-01` | `/department/head` |
| Field Officer | `http://localhost:5173/department/officer/login?dept=kmc` | `roads-02` | `/department/officer` |
| Central admin | `http://localhost:5173/admin/login` | `admin@example.org` in disconnected demo mode | `/admin/requests` |

For local demos without Supabase configured, each login screen offers **Show temporary local access key**. Read the key in the intended browser session; do not share, log or commit it. If Supabase is configured, real invited individual credentials and TOTP are required instead. Do not turn off Auth to fake a successful test.

**Verify the new deadline:** Sign in as Head, select a case, open Work deadline, choose a date and time, close the panel, and inspect the following Instructions field. The calendar should never float over the textarea or hide assignment controls. Check the Officer extension form similarly. Try 320, 393, 768, 1024 and 1440px.

**Verify role separation:** On the Officer login, deliberately use the Head local demo account and confirm the mismatch is denied. Sign in as Officer; navigate directly to `/department/head` and verify the restricted-workspace message. Do not confuse different addresses with separate production hosting or separately deployed applications: both roles intentionally share the same secure codebase and auth system, with different role-gated workspaces.

## Scope and release limits

- No live staging identities, database policy or production endpoints were changed.
- This repairs specific UX defects and separate role entry. It is **not** a complete ground-up central-admin redesign.
- Local demo assigns work orders, but cannot truthfully complete real photo/evidence verification without signed staging identities.
- Browser screenshot verification on the user's Windows/Antigravity host is still required before declaring the new picker visually accepted.
