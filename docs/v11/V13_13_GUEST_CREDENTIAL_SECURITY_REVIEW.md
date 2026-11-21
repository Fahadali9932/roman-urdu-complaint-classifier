# V13.13 — Guest Claim Credential Isolation (Staging Security Gate)

**Date:** 21 November 2026 (Pakistan time)  
**Scope:** staging and release candidate only; no production database access, no model training.

## Confirmed security problem

On staging, `public.complaints` granted `authenticated` a table-wide `SELECT`.
Department staff have RLS visibility for their assigned complaints and the
KMC clearinghouse has visibility into the review queue. Rows include
`claim_code_hash` and `guest_tracking_hash`, both SHA-256 credential digests.
The existing `claim_guest_complaint` RPC compares the caller-provided
`p_claim_code_hash` **directly** with the stored hash; possession of the digest
is therefore enough to claim an unowned guest complaint. A person with staff
access and a separate citizen account could exploit the combination. This
was established from live staging ACLs, policies, and function definitions,
not from a simulated attack on a real person's case.

## Repair

1. Migration `20261201000000_v13_13_hide_guest_claim_credentials.sql`
   revokes table-wide authenticated `SELECT`, then grants column-level `SELECT`
   for every noncredential field. `service_role` access remains intact.
2. Client complaint reads and department case syncing use explicit fields.
   No browser client query needs the stored claim or tracking digest.
3. `supabase/tests/v13_13_guest_credentials_are_private.sql` asserts the
   database privilege boundary. The V13.12 five-user hosted test now verifies
   *actual HTTP authorization failures* for both hash fields with each role.
4. Static tests in `tests/edge/v13_13_guest_claim_gate.mjs` protect the code
   from accidentally restoring wildcard complaint reads.

**Database rehearsal:** The exact migration body was executed against
staging inside `BEGIN` / `ROLLBACK`. Its internal privilege assertions
passed, and a separate follow-up query confirmed the original grants were
restored after rollback. This was a reversible rehearsal, **not deployment**.

## Deployment order and release policy

Apply the migration to **staging only**, run the SQL check, then verify the
website with the updated client on staging. Finally run V13.12's one-pass
genuine Auth/JWT matrix with an authorized staging-only server secret.

This correction does **not** constitute proof of full multi-account security.
The real authenticated matrix remains a separate release blocker until it is
executed and its test fixtures are safely removed. Do not deploy publicly or
merge to `main` based on a static ACL check alone.
