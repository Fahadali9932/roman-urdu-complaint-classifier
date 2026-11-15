# AWAAZ-E-AWAM (آوازِ عوام)
## PHASE 5: CASE OPERATIONS DESK ARCHITECTURE & DISCOVERY AUDIT
### Baseline Analysis, Domain Model, Information Architecture, and Migration Strategy

**Date of Audit:** 15 November 2026 (Pakistan Standard Time)  
**Target Repository:** `Fahadali9932/roman-urdu-complaint-classifier`  
**Active Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Git Branch:** `feature/live-citizen-classification-workflow`  
**Current HEAD Commit:** `86089b9`  
**Supabase Reference:** `akbwiedtmxjxcjscgitw` (Zero unauthorized remote production modifications)  
**Deliverable Document:** `DISCOVERY_AND_DESIGN_APPROVAL.md`  

---

### 1. Executive Summary & Problem Diagnosis

The current Awaaz-e-Awam Department Portal displays complaints as individual, unaggregated table rows. When 50 citizens in Karachi submit reports about the exact same physical road defect (e.g., deep asphalt collapse at University Road near NED University), the municipal operator currently sees **50 near-identical rows** repeating *"Damaged Road and Potholes"*, the locality, and status badges.

#### The Failure Modes of the Current Paradigm:
1. **Unusable at Scale:** While manageable with 14 rows, at 100 rows the operator is overwhelmed, and at 1,000+ rows the interface breaks down entirely.
2. **Unpaged In-Memory Data Fetch:** `getDepartmentComplaints(departmentId)` executes an unpaged query (`from('complaints').select('*, complaint_timeline_events(*)')`) without pagination, mapping full descriptions and entire timelines into browser memory. Supabase restricts queries to 1,000 rows by default, creating severe silent data truncation risks as volume scales.
3. **Flawed Work Unit:** The operator's unit of work is not an individual complaint form; it is a physical **incident case** that can be resolved on the ground.
4. **Lack of Corroborated Grouping:** Previous attempts either treated all complaints in a broad neighborhood as one mega-issue, or avoided grouping entirely.

#### The Core Non-Negotiable Principle:
> **A citizen submits a REPORT. A municipal department resolves a CASE.**  
> A case links 50 reports about the same verified physical defect.  
> **Grouping is a work abstraction, NEVER data deduplication or deletion.**  
> Every citizen report retains its UUID, reference number, private/raw record, sanitized narrative, citizen ownership, individual status, and timeline history.

---

### 2. Live Baseline Inventory

A read-only inspection of the current live database was conducted using authenticated staff sessions across all six municipal authorities:

| Department ID | Authority Name | Visible Complaints | Status Breakdown | Clearinghouse Review Queue |
| :--- | :--- | :--- | :--- | :--- |
| **KMC** | Karachi Metropolitan Corporation | **34** | 14 Assigned (8 Awaiting, 6 Completed) | **20 Under Review** (Clearinghouse Only) |
| **KWSC** | Karachi Water & Sewerage Corporation | **12** | 12 Assigned (12 Awaiting) | 0 (Hidden / Denied) |
| **K-Electric** | K-Electric (Power & Grid) | **6** | 6 Assigned (6 Awaiting) | 0 (Hidden / Denied) |
| **SSGC** | Sui Southern Gas Company | **7** | 7 Assigned (7 Awaiting) | 0 (Hidden / Denied) |
| **SSWMB** | Sindh Solid Waste Management Board | **8** | 8 Assigned (8 Awaiting) | 0 (Hidden / Denied) |
| **SBCA** | Sindh Building Control Authority | **6** | 6 Assigned (6 Awaiting) | 0 (Hidden / Denied) |
| **Total** | Across System | **73** | 53 Assigned, 20 Under Review | Strictly KMC Scoped |

#### Security & Privacy Architecture:
- `complaints` table stores sanitized fields (`generated_heading`, `factual_summary`, `sanitized_description`, `incident_public_location`).
- `complaint_citizen_private` table stores raw sensitive fields (`raw_description`, `citizen_phone`, `citizen_cnic`, `residential_address`). Staff access is completely denied by Supabase RLS.
- Cross-department RLS policies enforce tenant boundaries: staff authenticated to KWSC cannot select, update, or enumerate KMC or K-Electric rows.
- Status mutations execute through security-definer RPC `staff_update_complaint_status`, validating role and authorized status transitions.

---

### 3. Proposed Information Architecture (V5 Case Operations Desk)

The sidebar and portal navigation are unified across all six departments:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: {Dept} workspace  /  Work queue          {PKT Date}  {Dept}   │
├───────────────┬────────────────────────────────────────────────────────┤
│ SIDEBAR       │ WORK QUEUE (Default View)                              │
│               │                                                        │
│ a. Monogram   │ Header: Work queue                                     │
│               │ Subtitle: One place to manage incidents and reports.   │
│ WORKSPACE     │ Top Counter: [ 104 cases · 1,252 reports ]            │
│ ▢ Overview    │                                                        │
│ ▣ Work queue  │ [Needs action 78] [Unassigned] [My cases] [All cases]  │
│ ▱ Areas       │ Mode Switch: ( Cases | Individual reports )            │
│ ⚠ Priority    │ Filterbar: [Search...] [All areas ▾] [Issue ▾] [Sort ▾]│
│ ▤ Review queue│                                                        │
│   (KMC only)  │ ────────────────────────────────────────────────────── │
│               │ INCIDENT CASE / LOCATION      REPORTS  OLDEST  STATUS  │
│ PREFERENCES   │ ● URGENT Road collapse...     1 report 1 day   Needs...│
│ ⚙ Settings    │ ● URGENT Open manhole...      4 repts  3 days  Needs...│
│               │ Road surface at NED Univ      50 repts 6 days  Needs...│
│ Bottom: Staff │ Road drainage Sector 35       18 repts 5 days  Needs...│
│ User Avatar   │ ────────────────────────────────────────────────────── │
│               │ 1–25 of 1,436 cases                    [Prev] [Next]   │
└───────────────┴────────────────────────────────────────────────────────┘
```

#### The Primary Views:
1. **Overview (`/department?view=overview`):**
   - High-value actionable metrics (open incident cases, reports awaiting acceptance, safety-critical cases).
   - "Start here" list of actionable incidents sorted by risk and age.
   - Area workload and clearinghouse review shortcuts.
2. **Work Queue (`/department?view=queue` - Default Screen):**
   - **Cases Mode (Default):** Clean list of distinct incidents (80–88px rows). Shows human title (`Road surface damaged — University Road near NED`), public place line, report count (`50 reports · 42 residents`), age of oldest unanswered report (`6 days`), compact work status, and assigned staff.
   - **Individual Reports Mode:** Granular list of original citizen references and individual statuses for audit, search, and exceptions.
   - **Saved Views:** `Needs action`, `Unassigned`, `My cases`, `All cases`.
   - **Search & Filters:** Keyset server-paged search across places, issues, and references; area dropdown; issue subtype dropdown; sort selector (`Attention first`, `Oldest waiting`, `Most reports`, `Recently updated`).
3. **Case Detail (`/department/cases/:caseId`):**
   - Breadcrumb navigation (`← Back to work queue / {Locality} / {Case Title}`).
   - Summary facts strip: Work status, Linked original reports, First reported age, Issue type.
   - Primary CTA: **`Accept 48 eligible reports`** (displays exact count of eligible reports; never misleadingly claims "Accept all 50" if 2 are resolved).
   - Four full tabs with URL-preservable state:
     - `Overview`: Factual summary from sanitized data, public incident location, risk context, assigned owner.
     - `Reports (50)`: Server-paged original complaints, each showing reference (`KHI-2026-00500000`), PKT timestamp, sanitized Roman Urdu preview, and individual status (`● Pending`).
     - `Activity`: Append-only case-level audit log (case created, reports linked, bulk accepted, assigned).
     - `Work`: Assignment, operational notes, field status advancement.
4. **Areas (`/department?view=areas`):**
   - Locality workload breakdown for the logged-in department (Active cases, Linked reports, Oldest wait, Urgent cases).
   - Clicking a locality drills down into Work Queue pre-filtered to that area.
5. **Priority (`/department?view=priority`):**
   - Strictly reserved for actual safety risks (`khula taar`, gas leaks, open manholes) and SLA breaches.
   - Normal priority complaints do not carry distracting badges.
6. **Review Queue (`/department?view=review`):**
   - Strictly visible to KMC clearinghouse staff. Handles unassigned `under_review` complaints.
7. **Settings (`/department?view=settings`):**
   - Lean preferences: Light/Dark theme toggle, Sidebar density (Expanded 232px vs Compact 72px), Authenticated session details.

---

### 4. Incident Grouping & Matching Strategy

Grouping reports must be conservative, explainable, and human-correctable:

```
┌─────────────────────────────────────────────────────────────────────────┐
│               INCOMING SANITIZED COMPLAINT (REPORT)                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  1. Extract Authoritative Department & Issue Subtype   │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  2. Normalize Public Incident Landmark & Road Segment  │
        │     (Reject private home addresses; case-fold aliases) │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  3. Hard Veto Checks:                                  │
        │     - Different department? ──────────────> REJECT     │
        │     - Incompatible subtype? ──────────────> REJECT     │
        │     - Different verified asset / crossing? > REJECT    │
        │     - Candidate resolved > 14 days ago? ──> REJECT     │
        └────────────────────────────┬───────────────────────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   │                                   │
      Exact Match on Verified             Plausible Landmark /
      Public Asset or Tight Segment       Intersection Proximity
                   │                                   │
                   ▼                                   ▼
        ┌─────────────────────┐             ┌─────────────────────┐
        │      AUTO-LINK      │             │  SUGGEST MATCH TO   │
        │   To Active Case    │             │   STAFF OPERATOR    │
        └─────────────────────┘             └─────────────────────┘
```

#### Test Fixture Corroboration Rules:
- **Rule 1 (50 on Same Pothole):** 50 reports for `University Road near NED University` with issue `roads/large-pothole` within active window $\rightarrow$ **1 Case, 50 linked reports**.
- **Rule 2 (50 Across Gulshan):** 50 pothole reports across 12 distinct intersections/streets in Gulshan-e-Iqbal $\rightarrow$ **12 distinct cases**, NOT one giant neighborhood case.
- **Rule 3 (Cross-Department Safety):** An electricity spark and a water burst at the same shopping plaza $\rightarrow$ **2 distinct cases in 2 separate departments**, strictly isolated by RLS.
- **Rule 4 (Post-Resolution Recurrence):** A new complaint filed 20 days after a pothole was marked repaired $\rightarrow$ **Treated as a new case or reopened review**, never silently marked resolved.

---

### 5. Bulk Acceptance Transaction Contract

The core demonstration operation satisfies rigorous transactional invariants:

```
staff_accept_incident_case_reports(
    p_case_id uuid,
    p_idempotency_key uuid,
    p_expected_case_version bigint
)
```

1. **Caller Verification:** Validates `auth.uid()` has active staff role for `case.department_id`.
2. **Locking:** `SELECT FOR UPDATE` on `incident_cases` row; verifies expected version.
3. **Idempotency:** Checks `case_batch_operations` for `(case_id, idempotency_key)`. If previously executed, returns stored result without re-executing.
4. **Deterministic Child Locking:** Locks active children in deterministic UUID order (`SELECT ... FOR UPDATE ORDER BY complaint_id`).
5. **Eligibility Filter:** Identifies children in status `'assigned'` (`EXISTING_ALLOWLIST_PENDING_ACCEPTANCE`). Ineligible children (e.g. `'resolved'`) are left completely untouched.
6. **Per-Report Atomic Updates:**
   - Updates `complaints.status = 'accepted'`.
   - Inserts `complaint_status_history` record for each child (preserving individual citizen timeline).
   - Enqueues notification outbox items using existing project logic.
7. **Case-Level Audit:** Inserts one entry into `incident_case_events` recording the operation, eligible count, and staff actor.
8. **Authoritative Return:** Returns `{ operation_id, case_id, total_linked: 50, accepted: 48, skipped_ineligible: 2, case_version: N+1 }`.

---

### 6. Additive Database Migration Plan

All database changes will be strictly **additive**. Existing tables (`complaints`, `complaint_citizen_private`, `complaint_status_history`) will remain untouched:

```sql
-- 1. Incident Cases (Parent Work Item)
CREATE TABLE IF NOT EXISTS public.incident_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT UNIQUE NOT NULL,
    department_id TEXT NOT NULL REFERENCES public.departments(id),
    title TEXT NOT NULL,
    issue_family TEXT NOT NULL,
    issue_subtype TEXT NOT NULL,
    district TEXT NOT NULL,
    locality TEXT NOT NULL,
    public_place TEXT,
    work_status TEXT NOT NULL DEFAULT 'needs_acceptance'
        CHECK (work_status IN ('needs_acceptance', 'accepted', 'in_progress', 'completed', 'on_hold')),
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('critical', 'high', 'normal', 'low')),
    priority_reason TEXT,
    assigned_staff_id UUID REFERENCES auth.users(id),
    assigned_staff_label TEXT,
    first_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Case Memberships (Active Report Association)
CREATE TABLE IF NOT EXISTS public.incident_case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE RESTRICT,
    link_method TEXT NOT NULL CHECK (link_method IN ('auto_asset', 'auto_cluster', 'manual_staff')),
    link_confidence NUMERIC(4,3),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    linked_by UUID REFERENCES auth.users(id),
    unlinked_at TIMESTAMPTZ,
    unlink_reason TEXT,
    CONSTRAINT uq_active_complaint_case UNIQUE (complaint_id)
);

-- 3. Case Activity Audit Log
CREATE TABLE IF NOT EXISTS public.incident_case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    operation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Idempotent Batch Operations
CREATE TABLE IF NOT EXISTS public.case_batch_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.incident_cases(id) ON DELETE CASCADE,
    operation_key UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    operation TEXT NOT NULL,
    result_summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_case_operation_key UNIQUE (case_id, operation_key)
);
```

---

### 7. Performance & Keyset Pagination Architecture

To ensure the interface performs sub-second even with 50,000 complaints:
1. **Never `SELECT *`:** Only project required columns (`id, case_number, title, district, locality, public_place, work_status, priority, first_reported_at, last_reported_at, version`).
2. **Deterministic Composite Cursor:**
   ```sql
   WHERE department_id = :dept
     AND (last_reported_at, id) < (:cursor_time, :cursor_id)
   ORDER BY last_reported_at DESC, id DESC
   LIMIT 26;
   ```
3. **Compound Indexes:**
   - `idx_cases_dept_status_time`: `(department_id, work_status, last_reported_at DESC, id DESC)`
   - `idx_case_reports_case_active`: `(case_id, linked_at DESC) WHERE unlinked_at IS NULL`
   - `idx_cases_dept_area`: `(department_id, locality, issue_subtype)`
4. **Coalesced Realtime Invalidation:** Realtime subscription events will invalidate affected case IDs with debounce backoff rather than triggering blanket refetches.

---

### 8. Verification Strategy & Acceptance Gates

The implementation will be verified through:
1. **Component and Model Tests (Vitest):**
   - Target: 230+ tests passing (preserving 217 existing tests + new case operations tests).
2. **Scenario Test Suite:**
   - A01: 50 same-pothole reports $\rightarrow$ 1 case with 50 linked reports.
   - A02: 50 different-intersection reports $\rightarrow$ separate cases.
   - B01–B08: Bulk acceptance transaction with 48 eligible + 2 resolved, idempotency replay, and atomic rollback on simulated failure.
   - C01–C05: Multi-department RLS cross-tenant denial matrix and PII leak prevention.
   - D01–D09: Responsive screenshot inspections across 1920, 1440, 1366, 1024, 768, and 390 viewports in both light and dark themes.
   - E01–E05: 10K/50K synthetic performance query execution tests.

---

### 9. Permission Checkpoint

> [!IMPORTANT]
> **Strict Operational Boundary:**  
> All design, component architecture, fixture-backed simulations, additive SQL migrations, and tests are executed locally within `D:\RomanUrdu_ComplaintClassifier_staff_auth`.  
> No remote production migrations, Edge Function deployments, or remote git pushes will be executed without explicit authorization from the repository owner.
