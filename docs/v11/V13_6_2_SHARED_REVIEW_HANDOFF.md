# V13.6.2 — Secure shared classification-review handoff

## Scope

Built on clean V13.6.1 (`3f7a07e`) in a separate worktree. No frozen model,
classifier thresholds, production Supabase instance, or live website changed.

### What the code now does

1. **Assigned staff flags a misclassified complaint.** When Supabase is configured,
   the client calls `staff_flag_ai_classification_review` exactly once. The database
   verifies the JWT subject and active membership in one of the case's assigned
   departments, locks the complaint, inserts a unique pending flag, marks the
   complaint `under_review`, and writes a timeline entry in the same transaction.
   Client-supplied staff names/roles/original labels are not trusted by the RPC.
2. **Admin sees the shared queue.** `get_ai_classification_review_queue` permits
   the main administrator only. The control center polls every 15 seconds, shows
   a visible error if loading fails, and does not fall back to local browser data
   when the project is configured for Supabase.
3. **Admin adjudicates.** `admin_decide_ai_classification_review` verifies main-admin
   access, locks the pending flag, and atomically restores the previous assignment
   on dismissal or assigns **one or two** verified active departments on approval.
   It updates the complaint and issue rows and records an audit timeline event.
4. **Human corrections are exportable, not self-training.** Only resolved reviews
   enter the JSONL export. Staff suggestions, rejected flags and pending cases
   cannot silently become training labels. No model is automatically retrained
   or promoted by approval.
5. **Offline fallback is clearly labeled.** Without configured Supabase, the
   old local demonstration remains available and is marked browser-local.

### Security and implementation boundaries

- New ledger table has RLS enabled; only main admins have SELECT. There are no
  direct authenticated INSERT/UPDATE/DELETE grants: mutations are restricted to
  authenticated SECURITY DEFINER functions with explicit server-side role checks.
- Anonymous, unassigned, revoked or other-department users must be rejected.
- The review read RPC returns `sanitized_description`, not the raw complaint
  intake or `complaint_citizen_private`. The browser additionally removes common
  phone/CNIC/email patterns, which is **not full PII de-identification**.
- One pending review per complaint is enforced by a partial unique index.
- Triple-department **automatic** routing is still blocked; this admin correction
  action also accepts at most two departments. A separate triage procedure is
  required for cases with three or more independently verified issues.
- The classifier-uncertain (`under_review`) clearinghouse flow is still distinct
  from staff-flagged corrections; this change does not combine those two queues.

## Local verification on 20 November 2026

| Check | Result |
| --- | --- |
| V13.6.2 authenticated RPC gateway tests | 5/5 passed |
| V13.6 + V11.5 focused tests | 27/27 passed (earlier targeted run) |
| Complete Vitest frontend suite | 574 passed, 1 skipped (52 files) |
| Production TypeScript typecheck | passed |
| Vite production build | passed (large-chunk warning only) |
| Python V11.4 relation regression | 11/11 passed |
| Oxlint | exit 0, existing warnings elsewhere |
| Full Python suite | **not verified**: `pytest` not installed; broad `unittest discover` did not terminate promptly and was interrupted |
| Actual PostgreSQL/RLS integration | **not verified**: Supabase CLI and staging DB unavailable here |

The frontend test suite regenerated `data/v11/eval_v13_2/v13_2_evaluation_report.json`;
that unrelated generated change was restored in this isolated worktree. No
benchmark or model data was included in this change.

## Required staging verification before activation

The migration is **authored but not applied** to any remote Supabase database:
`supabase/migrations/20261126000001_shared_ai_classification_reviews.sql`.
It intentionally follows the existing `20261126000000` privacy migration.

Supabase CLI was unavailable in the execution environment, so the migration
file was created for later review; SQL was not executed against PostgreSQL.
Do **not** point the updated frontend at live Supabase until migration ordering,
policies and RPC behavior have been checked in a disposable local/staging database.

Perform these checks with **real** Supabase Auth accounts and a staging complaint:

1. Confirm migrations through `20261126000000` are present. Back up staging DB,
   review and apply the new migration, and verify RPC signatures/grants.
2. **Anonymous:** all three RPCs must deny access; table cannot be selected.
3. **Staff in other department / revoked staff / citizen:** cannot flag the case.
4. **Assigned active staff:** can flag exactly one pending review; retry does not
   duplicate it; status and timeline update together; concurrent flags are safe.
5. **Non-admin staff:** cannot fetch shared queue or decide an admin review.
6. **Admin:** can view sanitized queue, reject a flag and restore the original
   department, or approve one/two distinct active departments and update issues.
7. **Three labels / invalid label:** decision must fail with no status or label
   change. Decisions on already-resolved flags must fail (no second mutation).
8. **Privacy:** no private contact, CNIC, raw email or home address from the
   private contact table is returned in the queue or stored in exported JSONL.
   Review all free-text fields manually before adding examples to a dataset.
9. **Citizen + staff workflow:** after approval, the complaint appears in the
   receiving department's queue and citizen status/timeline reflect assignment.

Only after staging tests pass should a separate, explicitly reviewed deployment
be considered. The active Run004 model remains unchanged throughout.
