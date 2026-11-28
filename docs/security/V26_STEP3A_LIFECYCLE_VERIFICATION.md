# V26 Step 3A — single-department complaint lifecycle

Staging only: jvbulmmdwovtgaxojxhn. Baseline remote 6b7b6e727a7d66221ec2c4d600922838cc3fb666. Existing 10 QA users retained; no production changes or expenses.

## Regression discovered and fixed
V25 blocked direct `resolved` status updates to prevent bypasses, but the canonical `v1318_close_verified_order` also called the blocked RPC. Initial regression test reached verified closure after citizen confirmation and failed (SQLSTATE 42501). Migration 20261128111124 introduces one private status implementation, retains a public wrapper prohibiting direct closure, routes verified closure through the private implementation, and independently rechecks resolution readiness. EXECUTE on the helper is denied to anon, authenticated, and service_role. The prior two function definitions are preserved in V26_STEP3A_CLOSURE_ROLLBACK.sql. Reverting would restore the known closure regression.

## Verification results
20/20 lifecycle assertions passed on the live staging database:
- Intake with supplied KMC classification and GPS coordinates; work order assignment; assignment replay idempotency.
- Wrong-department assignment denied; department access to citizen private contact data denied.
- Wrong officer start denied; assigned officer start; GPS calculation verified.
- Synthetic before/after proof metadata recorded; head approved; early closure denied.
- Wrong citizen proof access and feedback denied; owner can see approved proof; owner confirmed.
- Legacy direct closure denied even after confirmation; canonical verified closure succeeded.
- Admin sees resolved complaint; resolved timeline entry present; resolved notification queued.

Three additional privilege checks confirmed the helper cannot be executed directly by anon, authenticated or service_role. Security advisor warning counts unchanged (2 anon definer, 48 authenticated definer, 6 no-policy INFO, 1 paid password-protection warning).

## Scope and remaining gates
Tests used real pre-provisioned QA identities with simulated JWT claims in SQL, not real browser sessions. Intake used supplied classifier output, not an actual inference invocation. GPS was supplied synthetic coordinates; proof used synthetic database storage metadata, not real binary uploads. Notification was queued, not sent. All fixture complaints, work orders, notification outbox and storage metadata rolled back; zero remain. QA accounts retained. Deadline-duration behavior, actual notification delivery, dispute/rework, dual-department workflow, browser integration, actual storage/GPS and previously documented release gates remain open. In particular inspect whether assigned_duration_hours tracks chosen due_at when work starts (default 72h may override selected due_at); no unverified fix was made. Local lint/browser tests not run. No deployment or model changes.

Verdict: PASS for scoped staging database lifecycle; not a production release or full portal integration pass.
