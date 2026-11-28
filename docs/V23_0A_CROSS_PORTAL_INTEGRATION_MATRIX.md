# AWAAZ-E-AWAM (آوازِ عوام)
## V23.0A Cross-Portal Integration Matrix & End-to-End Workflow Audit

**Project:** Roman Urdu Multi-Department Civic Complaint Classifier & Resolution Platform  
**Audit Milestone:** V23.0A — Backend Architecture & Integration Audit  
**Date of Audit:** 28 November 2026  
**Auditor Roles:** Principal Software Architect, Senior Backend Engineer, Senior Product Designer, QA Lead  
**Authorized Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Portals in Scope:** Citizen Portal, Department Head (HOD) Portal, Field Officer Portal

---

## 1. End-to-End Civic Data Lifecycle Overview

The complete municipal remediation loop spans three distinct user roles across three separate client interfaces:
1. **Citizen Portal (Web & Mobile):** Anonymous or authenticated intake $\to$ Camera capture $\to$ Live GPS validation $\to$ Roman Urdu description $\to$ Realtime AI classification.
2. **Department Head Portal (Desktop-Restricted):** Ingestion into departmental triage inbox $\to$ Risk assessment & priority override $\to$ Advisory incident clustering $\to$ Work order creation & officer dispatch.
3. **Field Officer Portal (Mobile-First):** Work order acceptance $\to$ Turn-by-turn navigation $\to$ On-site GPS proximity verification $\to$ Before/after photographic evidence capture $\to$ Remediation report submission.
4. **HOD Verification Desk:** Photographic proof audit $\to$ GPS distance badge check $\to$ Resolution approval (or return for rework) $\to$ Automated citizen status transition.
5. **Citizen Tracking & Resolution Closure:** 24-digit tracking check $\to$ Verified proof review $\to$ Citizen satisfaction rating.

```
+----------------------------------------------------------------------------------------------------+
|                                    CIVIC DATA PROPAGATION LOOP                                     |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +-------------------+           +-----------------------+           +-----------------------+   |
|    |  CITIZEN PORTAL   |           |    SUPABASE BACKEND   |           |       HOD PORTAL      |   |
|    | (Mobile / Desktop)|           |  (Edge Functions, DB) |           |  (Desktop Restricted) |   |
|    +-------------------+           +-----------------------+           +-----------------------+   |
|              |                                 |                                   |               |
|  1. Submit   | --- HTTP POST ----------------> |                                   |               |
|     Complaint|     submit-classified-complaint |                                   |               |
|              |                                 | --- Insert into public.complaints |               |
|              |                                 |     with assigned_department_id   |               |
|              |                                 |                                   |               |
|              |                                 | <--- Fetch Department Queue ----- | 2. Review     |
|              |                                 |      listIndependentComplaints     |    Complaint  |
|              |                                 |                                   |               |
|              |                                 | <--- RPC v16_create_work_order -- | 3. Assign     |
|              |                                 |      Insert department_work_orders|    Officer    |
|              |                                 |                                   |               |
|              |                                 |           +-----------------------+               |
|              |                                 |           |     OFFICER PORTAL    |               |
|              |                                 |           |     (Mobile Console)  |               |
|              |                                 |           +-----------------------+               |
|              |                                 |                       |                           |
|              |                                 | <--- Fetch Assigned - | 4. View Work Order        |
|              |                                 |      Orders           |                           |
|              |                                 |                       |                           |
|              |                                 | <--- RPC v19_start -- | 5. Start Fieldwork        |
|              |                                 |                       |                           |
|              |                                 | <--- HTTP POST ------ | 6. Submit Proof & GPS     |
|              |                                 |      upload-work-proof|                           |
|              |                                 |                       |                           |
|              |                                 | <--- RPC v19_submit - | 7. Submit Resolution      |
|              |                                 |                       |                           |
|              |                                 | <--- RPC v19_approve  | 8. HOD Verifies & Closes  |
|              |                                 |      (From HOD Desk)  |                           |
|              |                                 |                       |                           |
| 9. Track &   | <--- Query Status ------------- |                       |                           |
|    Feedback  |      get_guest_complaint_status |                       |                           |
|              |                                 |                       |                           |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Deep Dive: The 5 Core Workflows

### Workflow A: Complaint Submission $\to$ Classification $\to$ Department Assignment
- **Citizen Action:** Citizen completes Step 1 (Contact), Step 2 (Live Photo), Step 3 (Mandatory Live Location), Step 4 (Roman Urdu Description). Citizen clicks "Submit Complaint".
- **Current Technical Implementation:**
  - In Live Mode (`isSupabaseConfigured() = true`):
    - Submits payload to `submit-classified-complaint` Edge Function.
    - Function executes Deno-hosted V11 model inference, checks Sindh coordinates, sanitizes text, inserts into `complaints` and `complaint_citizen_private`.
    - Returns `referenceNumber`, `claimCode`, `guestTrackingNumber`, `assigned_department_ids`.
    - Photo uploaded in secondary request to `upload-complaint-photo`.
  - In Dev/Test Mode (`isTestMode = true` or Supabase unconfigured):
    - Submits to `LocalV11ComplaintService.ts`.
    - Runs in-browser `v11InferenceAdapter.ts` with frozen Run004 artifact.
    - Saves complaint in memory array `testComplaints`.
- **Integration Status:**
  - Single-browser: **Working 100%**.
  - Multi-browser with Live Backend: **Requires deployed Edge Functions and populated `.env`**.
- **Missing Link for Production:**
  Edge Functions must be deployed to the hosted Supabase project. The two-step submission (complaint first, photo second) must be made resilient so failed photo uploads do not leave dangling unevidenced complaints without clear citizen guidance.

---

### Workflow B: HOD Case Review $\to$ Assignment $\to$ Officer Work Order
- **HOD Action:** Department Head logs in at `/department/head/login`, views the Complaints Queue, reviews AI routing & confidence, sets an SLA deadline, selects an active field officer, and dispatches the work order.
- **Current Technical Implementation:**
  - HOD accesses `/department/portal/head/complaints`.
  - Component `HodComplaintsView.tsx` calls `caseOperationsService.listIndependentComplaintsForHead(departmentId)`.
  - In live mode, queries `complaints` where `assigned_department_id = deptId`.
  - In local mode, queries in-memory `StoredCase[]` seeded in constructor.
  - HOD selects officer and clicks "Dispatch":
    - Calls `fieldOperations.createWorkOrderWithAdvisory(...)`.
    - In live mode, executes Supabase RPC `v16_create_work_order_with_advisory`.
    - Inserts row into `public.department_work_orders` and links report in `public.department_work_order_reports`.
    - Queues notification in `public.staff_notifications`.
- **Integration Status:**
  - In local simulation: **Working 100%**.
  - Live Supabase: RPC `v16_create_work_order_with_advisory` is defined in migration `20261206000000`, but currently unverified with live authentication tokens.
- **Missing Link for Production:**
  HOD portal must query live Supabase `complaints` view and use authenticated session JWT when calling `v16_create_work_order_with_advisory`.

---

### Workflow C: Officer Field Work $\to$ GPS Verification $\to$ Resolution Submission
- **Officer Action:** Field Officer logs in at `/department/officer/login` on a mobile device, opens `/department/portal/officer/work`, views assigned cases, clicks "Start Work", navigates to the incident site, opens the Resolution Form, captures live GPS & Before/After photos, and submits resolution.
- **Current Technical Implementation:**
  - Component `OfficerWorkView.tsx` calls `fieldOperations.listWorkOrders(departmentId)`.
  - Officer clicks "Start Work" $\to$ calls `fieldOperations.startWork(departmentId, orderId)` $\to$ calls RPC `v19_start_work_order` (or updates `devOrders`).
  - Officer clicks "Get Directions" $\to$ opens zero-cost universal Google Maps navigation link generated by `googleMapsLinks.ts`.
  - In `WorkResolutionForm.tsx`:
    - Officer clicks "Verify My GPS Location" $\to$ triggers HTML5 `navigator.geolocation.getCurrentPosition`.
    - `haversineDistanceMeters()` computes distance to complaint anchor coordinates.
    - If distance $\le 500$m, marks `gps_verified = true`. If $> 500$m, requires officer justification note (`gps_exception_review = true`).
    - Officer attaches Before & After work photographs $\to$ calls `upload-department-work-proof` Edge Function $\to$ saves files in `department-work-proof-private` bucket $\to$ stores SHA-256 hashes.
    - Calls `fieldOperations.submitResolution(...)` $\to$ calls RPC `v19_submit_work_completion` $\to$ updates order status to `pending_review`.
- **Integration Status:**
  - In local simulation: **Working 100%**.
  - Live Supabase: RPC `v19_submit_work_completion` exists in migration `20261207000000`. Storage bucket `department-work-proof-private` must be provisioned.
- **Missing Link for Production:**
  Dual photo upload must be connected to Supabase Storage bucket with RLS policies allowing authenticated officers to write and HODs to read.

---

### Workflow D: HOD Verification $\to$ Approval / Return $\to$ Final Closure
- **HOD Action:** HOD navigates to `/department/portal/head/verification`, inspects pending resolution reports, verifies Before/After photos and GPS distance badge, and clicks either "Approve Resolution" or "Return for Correction".
- **Current Technical Implementation:**
  - Component `HodVerificationView.tsx` loads work orders where `status = 'pending_review'`.
  - Displays Before & After photographs in `ImageLightbox.tsx`, displays GPS proximity badge ("On Site: 42m away"), and displays officer notes.
  - If HOD clicks "Approve Resolution":
    - Calls `fieldOperations.approveResolution(departmentId, orderId)`.
    - Calls RPC `v19_approve_resolution`.
    - Database updates order status to `verified`, updates all linked complaints to status `resolved`, creates resolution timeline event, awards ranking points to officer in `officer_ranking_events`.
  - If HOD clicks "Return for Correction":
    - Calls `fieldOperations.returnCorrection(departmentId, orderId, reason)`.
    - Calls RPC `v19_return_correction`.
    - Updates order status back to `in_progress`, applies penalty points in `officer_ranking_events`, creates correction warning in `officer_warnings`.
- **Integration Status:**
  - Local simulation: **Working 100%**.
  - Live Supabase: Logic exists in `20261207000000_v19_unified_hod_officer_portals.sql`.
- **Missing Link for Production:**
  Requires verified bucket URLs for proof photos and real database transactions.

---

### Workflow E: Citizen Tracking $\to$ Status Updates $\to$ Resolution Feedback
- **Citizen Action:** Citizen visits `/track`, enters 24-digit tracking number (or signs into citizen dashboard), views real-time progress timeline, inspects verified work photographs upon resolution, and submits a 1-5 star rating.
- **Current Technical Implementation:**
  - Component `ComplaintTracker.tsx` takes tracking number $\to$ hashes via SHA-256 $\to$ calls `get_guest_complaint_status(p_tracking_hash)`.
  - Function returns sanitized complaint heading, district, locality, department, status, and timeline events.
  - Never returns citizen contact PII (`complaint_citizen_private`).
  - Upon status = `resolved`, displays officer before/after photographs and satisfaction rating input.
  - Citizen rating calls `v1318_citizen_feedback` RPC $\to$ records row in `department_work_feedback`.
- **Integration Status:**
  - Local simulation: **Working 100%**.
  - Live Supabase: `get_guest_complaint_status` and `v1318_citizen_feedback` defined in migrations.
- **Missing Link for Production:**
  Live database must be populated so external citizens on other machines can query by tracking hash.

---

## 3. Cross-Browser & Multi-Device Readiness Matrix

```
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Workflow Component                | Single-Browser Test   | Multi-Device Live DB  | Technical Remediation Needed for Live V23         |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Citizen Complaint Intake          | PASS (Local V11 Map)  | REQUIRES LIVE DB      | Deploy submit-classified-complaint Edge Function; |
|                                   |                       |                       | Configure Supabase URL & Anon Key.                |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Citizen Photo Upload              | PASS (Simulated)      | REQUIRES LIVE BUCKET  | Provision complaint-evidence-private bucket;      |
|                                   |                       |                       | Deploy upload-complaint-photo Edge Function.      |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| HOD Department Intake Queue       | PASS (Seeded Map)     | REQUIRES LIVE DB      | Wire caseOperationsService to live complaints DB; |
|                                   |                       |                       | Add Supabase Realtime channel for instant intake. |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| HOD Officer Assignment            | PASS (devOrders Array)| REQUIRES LIVE RPC     | Connect v16_create_work_order_with_advisory RPC;  |
|                                   |                       |                       | Replace devOrders state with live query.          |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Officer Mobile Fieldwork Console  | PASS (Local Array)    | REQUIRES LIVE DB      | Query department_work_orders by officer_id;       |
|                                   |                       |                       | Connect v19_start_work_order RPC.                 |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Officer Before/After Proof Upload | PASS (Base64 Memory)  | REQUIRES LIVE BUCKET  | Provision department-work-proof-private bucket;   |
|                                   |                       |                       | Deploy upload-department-work-proof Edge Function.|
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Officer Resolution Submission     | PASS (Local State)    | REQUIRES LIVE RPC     | Connect v19_submit_work_completion RPC.           |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| HOD Resolution Verification       | PASS (Local State)    | REQUIRES LIVE RPC     | Connect v19_approve_resolution and                |
|                                   |                       |                       | v19_return_correction RPCs.                       |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Citizen 24-Digit Tracking         | PASS (Local Lookup)   | REQUIRES LIVE RPC     | Connect get_guest_complaint_status RPC.           |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Citizen Satisfaction Feedback     | PASS (Local State)    | REQUIRES LIVE RPC     | Connect v1318_citizen_feedback RPC.               |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
```
