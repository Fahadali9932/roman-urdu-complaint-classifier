# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V8
## COMPREHENSIVE INTEGRATION AUDIT & ROOT CAUSE DIAGNOSIS

**Project:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Remote Supabase:** `akbwiedtmxjxcjscgitw` (`https://akbwiedtmxjxcjscgitw.supabase.co`)  
**Date of Audit:** 16 November 2026  
**Auditor:** Principal Integration Engineer, Security Architect & Systems QA Lead  

---

## 1. Executive Summary

Phase V8 addresses the systemic integration disconnect between the Citizen Portal and the Department Portal in the Roman Urdu Municipal Complaint Management System (*Awaaz-e-Awam*). 

Prior to this phase, automated frontend test suites were passing while live integration suffered from fundamental architectural disconnects:
1. **Disconnected Static In-Memory Seeds:** The department portal's `CaseOperationsService` initialized from static mock seeds and did not synchronize with live Supabase complaints in its work summary.
2. **Coarse Locality Grouping:** All citizen complaints submitted in the same municipal district/locality (e.g., `Gulshan-e-Iqbal`) were indiscriminately merged into the first active incident case, regardless of whether the physical defect was at University Road, Disco Bakery, NIPA flyover, or Maskan Chowrangi.
3. **Status Lifecycle Skipping:** The bulk acceptance workflow mutated complaints directly from `assigned` to `in_progress`, skipping the necessary `accepted` (work acknowledged) state and attempting direct SQL `UPDATE` queries on `public.complaints` without invoking the security definer RPC (`staff_update_complaint_status`), which failed silently under RLS.
4. **Invariant Case Count Inconsistency (102 vs 104):** Department work summaries only counted three states (`needs_response`, `in_progress`, `completed`), omitting two legitimate cases (`C-2032` and `C-2011`) that were in status `accepted`. Total cases was 104, but stage breakdowns summed to 102 (78 + 11 + 13 = 102).
5. **Standalone Settings Clutter:** Dedicated settings navigation cluttered the sidebar when account info, appearance toggles, and passphrase changes properly belonged in the topbar staff account dropdown.

---

## 2. Detailed Technical Audit Findings (Points A through K)

### Point A: Complete Data Path from Citizen Form Submission to Database Insertion
- **Form Component:** `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx`.
- **Intake Flow:** The citizen enters narrative details, selects District and Locality, specifies the physical street/corridor landmark, and provides contact details (Name, Phone, Residential Address).
- **Transport:** The client invokes the Supabase Edge Function `submit-classified-complaint` via HTTP POST.
- **Backend Edge Execution (`supabase/functions/submit-classified-complaint/index.ts`):**
  1. Validates mandatory payload fields (`incidentDistrict`, `incidentLocality`, `incidentPublicLocation`, `citizenName`, `citizenPhone`, `residentialAddress`, and description word count $\le 200$).
  2. Runs client-side Naive Bayes / Roman Urdu heuristic classification against 6 municipal departments.
  3. Executes PII redaction and privacy masking (`processComplaintPrivacy`).
  4. Generates cryptographic private claim codes (`CLM-XXXX-XXXX-XXXX`) and 24-digit numeric guest tracking numbers.
  5. Inserts the complaint into `public.complaints` using `SUPABASE_SERVICE_ROLE_KEY` via `submit_classified_complaint` RPC.
  6. Inserts initial timeline event (`submitted`, `assigned`).
  7. Returns reference number (`KHI-2026-XXXXXXXX`), claim code, tracking number, and predicted department.

### Point B: ML Classification & Prediction Persistence
- **Engine:** Bundled in Edge Function and `src/services/classificationService.ts`.
- **Trained Model:** Multiclass Roman Urdu model covering:
  - `kmc`: Roads, bridges, flyovers, potholes, street infrastructure.
  - `kwsc`: Water supply, sewerage leaks, pipeline bursts.
  - `kelectric`: Power outages, sparking wires, transformers.
  - `ssgc`: Gas leaks, low pressure, pipeline damage.
  - `sbca`: Illegal construction, building cracks, hazardous structures.
  - `sswmb`: Solid waste, garbage heaps, overflowing dumpsters.
- **Persistence:** Stored in `public.complaints.predicted_department_id` and `public.complaints.prediction_confidence`. If confidence $\ge 0.70$ and not flagged, `assigned_department_id` is set to the predicted department. If confidence $< 0.70$, routed to clearinghouse review.

### Point C: Root Cause of Department Portal Disconnect
- **Finding:** In `src/services/CaseOperationsService.ts`, cases were initialized from a static in-memory array (`this.casesByDept`).
- **Failure Mode 1:** `getDepartmentWorkSummary(deptId)` never called `this.syncWithSupabase(deptId)`. It queried only the local static map.
- **Failure Mode 2:** `executeBulkAcceptance` attempted a direct PostgREST `update({ status: 'in_progress' })` on `complaints`. Under Supabase RLS, direct client updates on `complaints` are denied (`42501 permission denied`). The official route is `staff_update_complaint_status` RPC.
- **Resolution:** Added `await this.syncWithSupabase(deptId)` to `getDepartmentWorkSummary` and routed status changes through `supabase.rpc('staff_update_complaint_status')`.

### Point D: Mechanism for Department Portal Queries
- Staff sign in using department credentials (`roads-01`, `water-01`, etc.).
- Supabase JWT grants membership in `public.department_memberships`.
- PostgREST evaluates RLS policy:
  `WHERE assigned_department_id = (SELECT department_id FROM department_memberships WHERE user_id = auth.uid())`
- KMC staff (`roads-01`) additionally hold clearinghouse privileges, allowing queries on `status = 'under_review'` for cross-department triage.

### Point E: Complaint Grouping Criteria & Locality Fault
- **Previous Broken Logic (`CaseOperationsService.ts:856`):**
  ```ts
  const targetCase = list.find((c) => c.locality.toLowerCase() === locality.toLowerCase());
  ```
  Any complaint with `incident_locality = "Gulshan-e-Iqbal"` was merged into the first active Gulshan case, grouping a water leak near Maskan with a pothole near NED University!
- **V8 Refactored Invariant:**
  Complaints corroborate into an existing incident case if and only if:
  1. Department ID matches.
  2. Parent case `workStatus !== 'completed'`.
  3. Locality matches exactly (case-insensitive).
  4. Physical corridor/landmark matches via `isCorridorMatch(c.publicPlace, row.incident_public_location)`, comparing tokenized physical landmarks (e.g., `NED`, `University Road`, `Hill Park`, `Disco Bakery`) while excluding broad locality stop words.
  5. If no corridor match exists, a new incident case (`C-XXXX`) is created with its own distinct lifecycle and tracking.

### Point F: Status Transition Lifecycle & skipping Defect
- **Invariant Lifecycle:**
  $$\text{submitted / assigned} \xrightarrow{\text{Department Acceptance}} \text{accepted} \xrightarrow{\text{Work Dispatched}} \text{in\_progress} \xrightarrow{\text{Field Remediation}} \text{resolved}$$
- **Defect:** Prior code bypassed `accepted` and wrote `in_progress` immediately upon batch acceptance.
- **Resolution:** Bulk acceptance now formally updates in-memory cases and Supabase records to status `'accepted'`. Work transitions to `'in_progress'` only when dispatch notes and field crews are mobilized.

### Point G: Real-Time Status Updates & Citizen Tracking
- When staff trigger status updates via the status modal or bulk acceptance, `staff_update_complaint_status` RPC writes to `public.complaints.status` and appends a row in `public.complaint_timeline_events`.
- Citizen tracking at `/track` queries the updated status and timeline events, immediately reflecting progress in both English and Urdu.

### Point H: Remote Database Schema vs. Local Migrations
- **Remote Tables Verified:**
  - `complaints` (38+ live records with all sanitization and priority fields)
  - `departments` (6 municipal departments)
  - `department_memberships` (staff roles and associations)
  - `profiles` (user accounts)
  - `complaint_timeline_events` (audit events)
- **Local Migrations Unapplied Remotely:**
  - `20261123000000_case_operations_desk_v5.sql` (`incident_cases`, `incident_case_reports`)
  - `20261124000000_guest_numeric_tracking_v6.sql` (`citizen_guest_claims`, `get_guest_complaint_status` RPC)
- **Architecture Strategy:** The frontend client operates natively on authoritative `public.complaints` rows, performing dynamic incident case corroboration in `CaseOperationsService` without hard dependencies on unapplied remote tables.

### Point I: Authentication Boundaries & Tenant Scoping
- All 6 departments verified with active staff accounts:
  - KMC: `roads-01` (`roads@kmc.gov.pk`)
  - KWSC: `water-01` (`water@kwsc.gov.pk`)
  - K-Electric: `electricity-01` (`power@kelectric.com.pk`)
  - SSGC: `gas-01` (`gas@ssgc.com.pk`)
  - SBCA: `building-01` (`building@sbca.gov.pk`)
  - SSWMB: `sanitation-01` (`sanitation@sswmb.gov.pk`)
- Cross-tenant RLS confirmed: Staff queries returned zero foreign complaints.

### Point J: Clearinghouse Review Queue
- Low-confidence predictions ($< 0.70$) are marked `needs_review: true`.
- KMC clearinghouse operators review complaints at `/department?view=review` and call `staff_review_and_assign_complaint` to route them to the appropriate municipal authority.

### Point K: The 102 vs 104 Count Inconsistency Root Cause
- Total cases seeded in KMC: 104.
- Case breakdown:
  - Needs response (`needs_acceptance`): 78
  - Accepted (`accepted`): 2 (`C-2032` and `C-2011`)
  - In progress (`in_progress`): 11
  - Completed (`completed`): 13
  - **Sum:** $78 + 2 + 11 + 13 = 104$.
- Prior implementation only calculated 3 buckets: $78 + 11 + 13 = 102$, dropping the 2 accepted cases and creating an apparent 2-case deficit.
- Resolution: Added explicit `casesAccepted` tracking across `ICaseOperationsService`, `OverviewPage`, and metrics strips.

---

## 3. Verification Summary

| Diagnostic Point | Assessment | Resolution Status |
| :--- | :--- | :--- |
| **A: Submission Intake** | Edge function working, validates mandatory fields | Verified & Tested |
| **B: ML Classification** | Roman Urdu model predicts with high confidence | Verified & Tested |
| **C: Portal Sync** | Static seed disconnect resolved | Synchronized with Supabase |
| **D: RLS Query Path** | Tenant-scoped PostgREST policies operational | Verified across 6 depts |
| **E: Case Grouping** | Locality-only merge replaced with corridor matching | Verified & Tested |
| **F: Status Lifecycle** | `accepted` stage restored; no skipping to `in_progress` | Verified Invariant |
| **G: Real-Time Tracking** | Timeline RPC updates visible to citizens | Verified & Tested |
| **H: Schema Audit** | Local vs remote schema cataloged | Documented & Guarded |
| **I: Auth Scoping** | All 6 department accounts isolated | 0% leakage verified |
| **J: Clearinghouse** | Review queue routes ambiguous complaints | Verified & Tested |
| **K: 102 vs 104 Count** | 4-state sum ($78+2+11+13=104$) fully consistent | Exact Invariant Enforced |
