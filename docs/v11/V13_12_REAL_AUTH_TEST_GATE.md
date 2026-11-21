# V13.12 — Real Auth / Multi-Account Staging Security Gate

**Date:** 21 November 2026 (Pakistan time)  
**Scope:** `awaaz-e-awam-staging` (`jvbulmmdwovtgaxojxhn`) only.  
**Public deployment:** NOT APPROVED. No model training, model changes, or
production mutations are part of this phase.

## Findings and current honest status

- The actual staging Supabase Auth settings endpoint reports
  `mailer_autoconfirm: false` and `disable_signup: false`. New password signups
  require confirmation. The connected read-only/SQL project tools do not
  provide an Auth Admin user-management method or access to a service-role
  secret. There were **zero Auth users** in staging at last inspection.
- Do **not** create `auth.users` rows using SQL to claim this is a genuine login.
  Simulated JWT claims, direct Auth table inserts, and SQL role tests cannot
  substitute for real Auth-issued JWT sessions.
- The V13.11 Edge Function remains `ACTIVE` on staging with anonymous guest
  access intentionally enabled. The V13.11 guest receipt and tracking round
  trip was already performed, and its disposable record was deleted.
- Actual hosted anonymous HTTP calls to both
  `get_ai_classification_review_queue` and `admin_reassign_complaint` returned
  **401 / PostgreSQL `42501`** authorization denials; no records changed.
- Current security advisor warnings: private rate-limit table has deliberate
  service-role-only RLS/no policies (informational); public guest tracking RPC
  is intentionally callable by `anon` (warned); 15 authenticated-callable
  `SECURITY DEFINER` RPCs need real-role abuse validation.

## Safely prepare authentic disposable users

**Preferred one-command path (when an already-authorized staging-only secret is
available in the local environment):**

```text
V1312_STAGING_URL=https://jvbulmmdwovtgaxojxhn.supabase.co
V1312_STAGING_ANON_KEY=<staging public key>
V1312_STAGING_SERVICE_ROLE_KEY=<staging secret; local protected environment only>
```

```powershell
node tests/edge/v13_12_one_pass_staging.mjs
```

This runner provisions **five disposable, confirmed accounts using the official
Supabase Auth Admin API**, sets their staging-only roles/memberships, submits
two fully fictional complaints through hosted Edge intake, normalizes the
fictional assignment fields solely to produce deterministic RLS sentinels,
executes the real-JWT matrix, then deletes exactly its own complaints and Auth
users in a `finally` cleanup. It verifies cleanup; if deletion fails it exits
nonzero and reports only synthetic record UUIDs for manual remediation. It
never prints passwords, tokens, or keys and refuses any non-staging URL. This
requires a **server-only staging service role key**, which was **not** available
in this ChatGPT execution environment. Never expose that key to React/Vite,
commit it, or paste it into chat.

If this approved secret is unavailable, use the manual preparation steps below.

1. Use **the staging project**, never the production project. Through the
   official Supabase Auth Admin dashboard or an approved staging-only admin
   client, create five **distinct disposable, confirmed** Auth users:
   `citizenA`, `citizenB`, `staffKmc`, `staffElectric`, and `admin`.
   Creation must go through Supabase Auth so the password grant can issue
   genuine tokens. Do not use someone's personal email without permission.
2. Set the corresponding `public.profiles.role` values on staging only:
   `citizen`, `citizen`, `department_staff`, `department_staff`, `main_admin`.
   Grant the two staff users *active* `public.department_memberships` in `kmc`
   and `kelectric` respectively through the approved admin workflow.
3. Submit two clearly fictional complaints through the **hosted staging Edge
   function** using the real citizen A/B sessions. The first must be assigned
   solely to **KMC** and the second solely to **K-Electric**. Both must have
   status `assigned` and corresponding `complaint_citizen_private` records.
   Record the two UUIDs for the test runner. Do not collect real PII.
4. Store email/password pairs and the public anon API key **only as transient
   local environment variables or a secure secret manager**. Never put them in
   Git, patches, console logs, screenshots, this report, or ChatGPT messages.

## Run the real-session gate

The runner is `tests/edge/v13_12_real_auth_staging.mjs` and requires these
environment variables (values are intentionally absent):

```text
V1312_STAGING_URL=https://jvbulmmdwovtgaxojxhn.supabase.co
V1312_ANON_KEY=<staging publishable/legacy anon key>
V1312_KMC_COMPLAINT_ID=<UUID of citizen A's KMC complaint>
V1312_KELECTRIC_COMPLAINT_ID=<UUID of citizen B's K-Electric complaint>
V1312_CITIZEN_A_EMAIL=<...>
V1312_CITIZEN_A_PASSWORD=<...>
V1312_CITIZEN_B_EMAIL=<...>
V1312_CITIZEN_B_PASSWORD=<...>
V1312_STAFF_KMC_EMAIL=<...>
V1312_STAFF_KMC_PASSWORD=<...>
V1312_STAFF_KELECTRIC_EMAIL=<...>
V1312_STAFF_KELECTRIC_PASSWORD=<...>
V1312_ADMIN_EMAIL=<...>
V1312_ADMIN_PASSWORD=<...>
```

```powershell
node tests/edge/v13_12_real_auth_staging.mjs
node --test tests/edge/v13_12_real_auth_gate.mjs
```

The script enforces the exact staging host, requires all five separate genuine
Auth sessions, confirms each session with `/auth/v1/user`, and asserts:

- A citizen can read their own complaint and private record, but not another's.
- KMC staff see the KMC fixture only; K-Electric staff see the electrical
  fixture only, and neither may see citizen-private records.
- Profiles are isolated, staff have the expected active department memberships,
  and only the verified admin can retrieve the privileged review queue.
- Nonadmins receive actual authorization denials for the review queue and
  administrative reassignment RPC. A nonexistent UUID is used in denial probes
  so those calls cannot mutate an actual complaint.

The script is deliberately non-mutating. It prints neither passwords, tokens,
private complaint fields, nor tracking/claim secrets. A missing credential,
incorrect role, non-staging host, or unavailable fixture **fails closed**.

## Evidence already collected and still required

| Check | Current evidence | Status |
| --- | --- | --- |
| Staging Auth settings | Signup enabled, email auto-confirm off | VERIFIED |
| Staging Edge deployment | `submit-classified-complaint` active, v1 | VERIFIED |
| Hosted anonymous privileged-RPC requests | Two `401` / `42501` denials | VERIFIED |
| One-command Auth provisioning | Implemented but lacks staging service role credential | BLOCKED |
| Real multi-user sessions | No confirmed disposable Auth users available | BLOCKED |
| Cross-citizen HTTP/RLS | Automated real-session assertions ready | NOT RUN |
| Cross-department HTTP/RLS | Automated real-session assertions ready | NOT RUN |
| Admin/staff privileged RPCs | Automated denial assertions ready | NOT RUN |
| Script safety/unit gates | 7/7 Node tests passed, including no-project-swap and secret-key rejection | VERIFIED |

## Wider regression checks, same isolated branch

- Production TypeScript/Vite build: **PASS**; existing large-chunk advisory.
- Full Vitest: **603 passed / 1 skipped** after excluding the separate
  Node-native `.mjs` gate from Vitest's `.test.*` file discovery.
- Python V11 discovery: **exit 0** with frozen artifacts present.
- Edge boundary tests: **16/16 PASS**.
- Node staging-gate safety unit tests: **7/7 PASS**.
- Production dependency `npm audit --omit=dev --audit-level=high`:
  **0 reported vulnerabilities** at execution time.
- `npm run lint`: exit **0** with existing advisory text. These automated
  checks do not prove that the pending real-JWT matrix has passed.

## Cleanup and release conditions

After a successful run, delete only the two precisely identified fictional
staging complaints via an approved staging administrator workflow, then remove
the five disposable Auth users using the **Auth Admin API or dashboard** and
revoke their sessions. Verify no fixture records or test accounts remain.
Do not delete broad groups of records and do not touch production. Only after
real Auth, RLS, role-abuse, and retention checks pass may this gate be marked
verified. Staging migration history reconciliation and other security-advisor
review still remain separate launch gates.
