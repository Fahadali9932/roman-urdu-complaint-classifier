# V28 Step 3C — deadline, notification, ranking and oversight

Staging only: jvbulmmdwovtgaxojxhn. Prior checkpoint 9ea4aec846b7e9228148a8e7ce9095e98c960bc6. Existing ten QA identities retained.

## Confirmed defect and fix
The assignment-duration trigger correctly captured a 24-hour deadline and work start correctly used 24 hours. The previous legacy officer-extension approval changed due_at but not effective_deadline_at and recorded no history (reproduced on staging). V28 synchronizes both deadlines, records the original and extended deadlines, officer request reason and approving head, and notifies the officer of the decision. It notifies heads of new requests, validates scope, bounds extensions, and preserves dates on rejection. Requests now require in-progress/returned work, not pre-start assignment, and are limited to an additional 720 hours consistent with the direct extension API. The team statistics now evaluate submitted_at against the effective deadline rather than head review time, aligning with the ranking calculation. Migration 20261128111604; rollback function definitions preserved.

## Executed tests
- V28_STEP3C_ROLLBACK_QA.sql: 22/22 assertions.
- V28_STEP3C_CORRECTION_QA.sql: 24/24 assertions, 17 shared setup/flow assertions repeated, 7 additional correction/overdue/dispute assertions.
- Total 46 assertion executions, 29 distinct named checks, no failures in final runs.
- Verified 24-hour assignment/start, idempotent start, request/approve and decline, direct extension, audit history, head/foreign authorization, warning delivery and persistence, notification visibility and mark-read restrictions, +10 on-time approved submission, delayed review does not penalize, -10 correction, -15 overdue submission, correction deadline preserved on restart and fresh GPS required, citizen dispute reopens work and issue, administrator reads rankings/warnings/deadline history.
- Synthetic timing was used for late review/submission and the retry throttle. Synthetic before/after storage metadata, supplied classifier output and simulated JWT claims were used. In-app notification records were verified; no email/push delivery or browser rendering was verified.
- All records rolled back. Ten QA accounts remain; zero complaints, orders, notifications, warnings, ranking events, deadline history or storage objects remain. Advisor warning counts unchanged.

## Remaining gates
Legacy public v1318_start_work and v1318_review_proof are still callable by authenticated users with their own authorization checks; they may bypass newer start/approval/correction side effects, so their compatibility and canonicalization must be audited before production. No runtime negative tests of these paths in this step. Citizen dispute reopens work, but automatic dispute ranking penalty not tested or added. Full nonresponse closure, resubmission after a citizen dispute, actual file/GPS evidence, real authenticated browser flows, ranking presentation, delivery and remaining security/intake gates remain unverified. No deployment, production changes, classifier retraining, or spending.

Verdict: PASS for tested canonical staging database workflow; not full release approval. Proceed to Step 3D browser QA with noted legacy-path gate retained.
