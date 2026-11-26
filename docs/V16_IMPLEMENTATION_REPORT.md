# Awaaz-e-Awam — Phase V16 Implementation & Verification Report

**Date:** 26 November 2026 (Asia/Karachi, PKT)  
**Target Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Feature Branch:** `feature/v16-incident-assignment-and-staff`  
**V15 Baseline Checkpoint:** `checkpoint/v15-d630dfb` (`d630dfb75cee82fcba3ec5152e94ba7ac9775881`)  
**Protected Worktree (`D:\RomanUrdu_ComplaintClassifier_staff_auth`):** Untouched  
**Budget Spent:** `$0.00` (free OpenStreetMap tiles, Supabase free tier staging, zero paid SDKs)  

---

## 1. Executive Summary

Phase V16 replaces speculative silent multi-report bundling and blind bulk acceptance with **independent complaint intake**, **advisory 30-metre physical duplicate checks under explicit Department Head confirmation**, **transactional append-only work-order attachment**, and **Head-scoped Field Officer account provisioning with mandatory first-login passphrase updates**, alongside the simplified **V16 Department Head Home, Flat Complaints List, and Flat Complaint Detail Reading View**.

**Live Staging vs. Production Status:**
- **Staging (`jvbulmmdwovtgaxojxhn`):** V14 (`20261205000000`) and V16 (`20261206000000`) migrations applied and recorded cleanly; `manage-department-officers` (`ACTIVE`), `upload-department-work-proof` (`ACTIVE`), and `submit-classified-complaint` (`ACTIVE`) deployed and exercised end-to-end against real Supabase Auth (including TOTP AAL2 MFA), RLS policies, private storage buckets, and Postgres transactions. All disposable staging fixtures were cleaned up afterward (`0` users, `0` complaints, `0` work orders remaining).
- **Production (`akbwiedtmxjxcjscgitw`):** Completely untouched. Production migration requires explicit authorization (plan in Section 6).

---

## 2. Implemented Capabilities by Objective

### Objective 1 — Independent Complaint Intake (`CaseOperationsService.ts`, `CaseDetailPage.tsx`, `incidentMatching.ts`)
- **Zero raw-description fallback:** Removed `description` from Department complaint `SELECT` projection in `CaseOperationsService.ts`; staff queues read only `sanitized_description`, `generated_heading`, and `factual_summary`.
- **Stable complaint UUIDs:** Switched live complaint mapping from composite/ephemeral IDs (`corroboration_key` / multi-report synthetic keys) to each row's authoritative `id` (`uuid`).
- **Removed silent bundling & unconfirmed bulk accept:** `generateDepartmentSeed()` creates 100 distinct independent demo complaints (`linkedReportCount: 1`) distributed across Today / Yesterday / This month / This year in PKT (`Asia/Karachi`); `CaseDetailPage.tsx` and `CaseOperationsService.executeBulkAcceptance()` restrict single-report acknowledgment and block unconfirmed multi-report batch execution; server `staff_accept_department_report_batch` (`supabase/migrations/20261206000000_v16_incident_assignment_and_staff.sql`) rejects `cardinality(p_complaint_ids) <> 1`.
- **Citizen intake/tracking preserved:** Citizens submit without cross-user duplicate warnings or merging and track by 24-digit guest receipt or authenticated My Complaints.

### Objective 2 — Safe Duplicate Advisory & Transactional Assignment (`20261206000000_v16_incident_assignment_and_staff.sql`, `incidentMatching.ts`, `fieldOperations.ts`)
- **Server-side advisory matching (`v16_find_candidate_orders`):** Restricts matching to `department_id = p_department`, active status (`assigned`, `in_progress`, `returned`, `pending_review`), citizen-confirmed `complaint_geo_points` pins within `30 m` (Haversine meters), and **exact sorted known `issue_type` set**. Unknown subtypes return `0` candidates unless `p_include_uncertain = true`; mixed unknown + known sets are excluded from automatic candidate matching; verified orders are excluded; `pending_review` orders return `can_direct_attach = false`.
- **Optimistic candidate staleness guard (`v16_create_work_order_with_advisory`):** Acquires per-department transaction advisory lock (`pg_advisory_xact_lock`), re-evaluates within-`30 m` matches pre-commit, and raises fail-fast Postgres user exception `P0001` (`STALE_CANDIDATES`) — avoiding `40001` so PostgREST fails fast in `< 200 ms` instead of retrying internally — when a concurrent nearby order appears. Supports idempotency keys (`v16_assignment_operations`).
- **Append-only attachment (`v16_attach_report_to_work_order`) & correction (`v16_detach_report_from_work_order`):** Links confirmed duplicate complaint to an existing `assigned`/`in_progress`/`returned` order while preserving its `id`, `officer_id`, `due_at`, `instructions`, prior evidence, and existing `department_work_order_reports` rows; updates the newly linked citizen complaint status & bilingual timeline; enforces unique `(department_id, complaint_id)` (`uq_v16_work_report_dept_complaint`) to prevent double-assignment within one department while allowing separate agency orders for multi-department complaints; logs `report_attached` / `report_detached` audit events.
- **Reassignment & legacy protection:** Added `v16_reassign_work_order_officer` (used when an assigned officer is suspended without losing open orders) and updated legacy `v1318_assign_work` to reject overwriting existing orders or wiping links (`23505`).

### Objective 3 — Simplified Staff Account Management & Maintainer Review Route (`manage-department-officers/index.ts`, `staffAuthService.ts`, `DepartmentAuthContext.tsx`, `DepartmentDashboardPage.tsx`, `FieldOperationsDesk.tsx`)
- **Maintainer uncertain/unassigned classification review route:** Unassigned or uncertain AI predictions (`status = 'under_review'`) remain isolated from public citizen forms and route into the protected supervisor clearinghouse (`?view=review`, `ReviewAssignmentModal.tsx`, accessible via the Head workspace menu `Review queue`) and Central Administrator AI governance portal (`/admin/*`, `src/features/admin/ai/`).
- **Head-scoped officer lifecycle (`manage-department-officers` Edge Function):**
  - Verifies caller AAL2 JWT, active `department_memberships` row with `staff_role = 'head'` inside matching `departmentId` only (`403` on cross-department attempts), rate limits (`20/min`), and never allows Heads to create/modify `head` or `main_admin` accounts.
  - `create_officer`: Creates Auth user + `profiles.upsert(..., { onConflict: "id" })` (compatible with `on_auth_user_created_citizen_profile` trigger) + active officer membership (`staff_username = <dept>-<employeeId>`, `must_change_password = true`), returning an 18-char CSPRNG one-time key displayed once in-memory (never persisted to DB, `access_audit_log`, logs, or browser storage).
  - `complete_first_login_password`: Server updates password via GoTrue `PUT /auth/v1/user` preserving the active AAL2 session, clears `must_change_password = false`, and logs audit trail; enforced both at PostgreSQL RLS/RPC helper `v16_staff_operational_access` (`must_change_password = false` required for `v1318_can_view_order`, `v1318_start_work`, `v1318_request_extension`, and `v1318_staff_update_guard`) and UI `forced-password-change-gate` in `DepartmentDashboardPage.tsx`.
  - `reset_credentials` & `suspend_officer` / `reactivate_officer`: Rotates temporary key + re-enforces `must_change_password = true`, or suspends access immediately (denying `v1318_can_view_order` & login via `staffAuthService.ts` while preserving open work orders for inline reassignment to another active officer).
  - Username sign-in resolution: `v16_resolve_staff_login_email` + `DepartmentAuthContext.tsx` routes non-email staff usernames (`!identifier.includes('@')`) cleanly in both live Supabase and local dev modes.

### Objective 4 & 5 — Approved Department Head UI (`HeadHomePage.tsx`, `HeadComplaintsPage.tsx`, `HeadComplaintDetailView.tsx`, `FieldOperationsDesk.tsx`, `v15-head-desktop.css`)
- **Department Head Home (`HeadHomePage.tsx`):** Preserves V15 collapsible left rail (`HeadSidebarNav.tsx`), Light/Dark theme switcher, PKT header & greeting, and `>= 1024px` desktop gate (`HeadDesktopRestrictionScreen.tsx`), while showing strictly **ONE** period overview (`Today` default, `Yesterday`, `This month`, `This year` in strict `Asia/Karachi` `+05:00` boundaries), one large active distinct complaint count, one horizontal segmented bar, and 4 status labels (`New complaints`, `Under review`, `In progress`, `Awaiting verification`), removing Priority Inbox and Overdue blocks.
- **Department Head Complaints (`HeadComplaintsPage.tsx`):** Defaults to `Today` (`All` / `Today` / `Yesterday` / `This month`), locality filter, and search; displays clean flat independent rows (`heading`, location, chevron — zero synthetic bundle counts).
- **Flat Complaint Detail View (`HeadComplaintDetailView.tsx`):** Preserves list filters on `Back`, provides `Previous` / `Next` traversal, shows ref/PKT timestamp/status, sanitized complaint prose, authorized zoomable photo lightbox, free OpenStreetMap Leaflet map for citizen-confirmed pins, and direct `Assign` workflow surfacing any within-`30 m` active candidate orders (same-issue link vs separate assignment + `STALE_CANDIDATES` live recovery).
- **Dark Mode Accessibility Contrast:** Fixed `.v21-case-card h2/h3` and `FieldOperationsDesk.tsx` dark-mode heading color (`var(--v15-ink)`) caught during visual screenshot review.

---

## 3. Live Staging Verification Results (`jvbulmmdwovtgaxojxhn`)

Executed `scratch/v16_staging_live_verify.mjs` against hosted staging `jvbulmmdwovtgaxojxhn` (disposable users & records cleaned up after run):
1. **Guest Complaint Intake:** Submitted 4 real complaints (`A`, `B`, `C` routed to `kmc`; `D` routed to `kwsc`) via `submit-classified-complaint` with Sindh coordinates and privacy redaction. Confirmed server trigger `complaints_reject_contact_identifiers` blocks accidental identity/CNIC patterns cleanly.
2. **Provisioning & First-Login Enforcement:** KMC Head (`AAL2`) rejected from provisioning `kwsc` officer (`403`); successfully created KMC officer with `mustChangePassword = true`. Officer confirmed blocked on `v1318_start_work` until completing `complete_first_login_password`; GoTrue AAL2 token remained valid seamlessly afterward (`v1318_start_work` + `upload-department-work-proof` succeeded immediately).
3. **30m Duplicate Matching, Fail-Fast Concurrency & Links (`< 200 ms`):**
   - `v16_find_candidate_orders` returned 1 match (`distance_m: 11.12`) for same-issue complaint `B` (`178 ms`) and `[]` for different-issue complaint `C` (`179 ms`).
   - Concurrent `STALE_CANDIDATES` check failed fast in `179 ms` (`P0001`).
   - `v16_attach_report_to_work_order` attached `B` without altering existing officer/deadline/instructions; idempotent replay returned `idempotentReplay: true`; `2` links recorded cleanly; legacy `v1318_assign_work` blocked from overwrite (`23505`); `staff_accept_department_report_batch` rejected unconfirmed multi-report input; `v16_detach_report_from_work_order` removed non-anchor link and logged audit event.
4. **Dual Work Proof & Suspension/Reassignment:** Officer uploaded valid minimal PNG before+after photos with Sindh GPS (`upload-department-work-proof` HTTP 200); Head approved (`v1318_review_proof`); Head suspended officer while Order 2 remained open (`v1318_can_view_order` immediately returned `false`), reassigned Order 2 via `v16_reassign_work_order_officer` to backup active officer, then reactivated and reset credentials.
5. **Post-Cleanup & Security Advisors:** Final staging counts verified `{ users: 0, complaints: 0, orders: 0 }`; `supabase db advisors --remote=jvbulmmdwovtgaxojxhn --type security` reported **`0` `ERROR` findings** (`44` expected `WARN` entries for deliberate `SECURITY DEFINER` RPCs and Postgres leaked-password-protection toggle).

---

## 4. Local Quality Gates (Run Post Final Edit `af55f54`)

| Check | Scope | Result |
|---|---|---|
| `npx impeccable detect src/features/department --json` | Department UI & V16 CSS/TSX | `[]` (`0` findings, exit `0`) |
| `npx tsc -b` | Full TypeScript project | Exit `0` |
| `npm run lint` (`oxlint`) | `396` files, `116` rules | `0` errors (`278` pre-existing warnings) |
| `npm run build` | Production Vite bundle (`2,263` modules) | `✓ built in 1.58s` |
| `node tools/ai_factory/v13_8_2_verify_production_bundle.mjs` | Dist hygiene check | `PASS` (`1` clean bundle) |
| `npx vitest run` | All unit & integration suites | `70` passed \| `1` skipped (`71`); `709` passed \| `1` skipped (`710`) in `39.85s` (`V13_6_DevelopmentProbe.test.ts` intentionally skipped) |
| Local Node Edge suites (`tests/edge/*.mjs` non-staging) | `12` suites | `106` passed, `0` failed |
| `python -m unittest discover -s tests/v11` | Classifier & relation engine | `106` tests `OK` (`18.605s`) |
| Frozen Run004 Classifier (`data/v11/curriculum_runs/run_004/candidate_model.json`) | Unchanged SHA-256 | `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` |

---

## 5. Responsive Headless Chrome QA (`20` Captures)

Captured across `1920x1080`, `1440x900`, `1024x768`, `768x1024`, `390x844`, `320x568`, and `844x390` landscape under `C:\Users\Annihilation\.gemini\antigravity\brain\3caaefa1-3615-4655-86f5-c95c17bc0aa2\screenshots\v16_head_qa\`:
- `01_head_home_light_1440.png`, `02_head_home_dark_1440.png`, `03_head_home_light_1920.png`, `04_head_home_light_1024.png`, `05_head_home_collapsed_light_1440.png`
- `06_head_complaints_light_1440.png`, `07_head_complaints_dark_1440.png`, `08_head_complaints_light_1024.png`
- `09_head_detail_light_1440.png`, `10_head_detail_dark_1440.png`, `11_head_detail_assign_light_1440.png`
- `12_head_officers_light_1440.png`, `13_head_officers_tempkey_dark_1440.png`
- `14_head_gate_light_768.png`, `15_head_gate_dark_390.png`, `16_head_gate_light_320.png`, `17_head_gate_landscape_844x390.png`
- `18_officer_mobile_light_390.png`, `19_citizen_home_light_390.png`, `20_citizen_home_light_1440.png`

All `20` captures reported `0px` horizontal overflow, `0` console errors, and `0` uncaught page errors.

---

## 6. Production Migration Plan (DO NOT RUN WITHOUT EXPLICIT APPROVAL)

When authorized for production (`akbwiedtmxjxcjscgitw`):
1. Take a pre-migration database snapshot in Supabase Dashboard.
2. Backfill audit check: inspect any existing historical `department_work_order_reports` rows for `(department_id, complaint_id)` duplicates before adding `uq_v16_work_report_dept_complaint`.
3. Apply migrations in exact dependency order within transactions:
   - `supabase/migrations/20261205000000_v14_sindh_geo_and_dual_work_proof.sql` (if not yet applied on prod)
   - `supabase/migrations/20261206000000_v16_incident_assignment_and_staff.sql`
4. Deploy Edge Functions cleanly:
   - `manage-department-officers` (`--verify-jwt`)
   - `upload-department-work-proof` (`--verify-jwt`)
   - `submit-classified-complaint` (`--no-verify-jwt`)
5. Backfill `department_memberships` for existing Department Heads (`staff_role = 'head'`, `must_change_password = false`) via Main Admin provisioning/audit review, leaving legacy staff access intact until verified.
6. Enable `Leaked Password Protection` in Supabase Auth settings if not enabled.

---

## 7. Rollback Reference

To roll back local workspace changes to the verified V15 baseline:
```powershell
git checkout checkpoint/v15-d630dfb
```
To inspect or revert the V16 delta cleanly without losing work: apply reverse diff from the generated unified patch (`d630dfb..HEAD`).
