# AWAAZ-E-AWAM (آوازِ عوام)
## V23.0A Complete Backend Architecture & Service Inventory Audit

**Project:** Roman Urdu Multi-Department Civic Complaint Classifier & Resolution Platform  
**Audit Milestone:** V23.0A — Backend Architecture & Integration Audit  
**Date of Audit:** 28 November 2026  
**Auditor Roles:** Principal Software Architect, Senior Backend Engineer, PostgreSQL/Supabase Specialist, ML Engineer, Security Auditor  
**Authorized Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Base Commit:** `bbd41216ac8b991103ec0820db61cddd8eaef4cb` (`fix/v22-4-1-citizen-camera-location-responsive`)  
**Audit Branch:** `audit/v23-0a-backend-architecture`  
**Protected Baseline Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (**100% Untouched**)  
**Financial Budget:** Strictly \$0.00 (Zero paid APIs, zero credit cards, zero proprietary closed services)

---

## 1. Executive Summary & Purpose

The frontend architecture of **Awaaz-e-Awam** has been officially frozen following Phase V22.4.1. The Citizen Portal (camera capture, mandatory geolocation, responsive layouts), Department Head Portal (editorial desktop management, case distribution, verification), and Field Officer Portal (mobile-optimized fieldwork console, resolution submission) have achieved complete visual fidelity, accessibility, and client-side test passing status (930 passed tests in Vitest).

The system is now transitioning from frontend refinement to **complete backend integration**. Before applying migrations, creating tables, or altering backend infrastructure, this audit establishes the **absolute technical truth** of the codebase:
1. What services are currently live vs. simulated in-memory vs. mocked.
2. Where the security boundary actually exists (client vs. server).
3. The exact condition and deployment readiness of Supabase Edge Functions.
4. Architectural gaps that must be bridged in Phase V23.

```
+---------------------------------------------------------------------------------------------------+
|                                  CURRENT BACKEND STATE SUMMARY                                    |
+---------------------------------------------------------------------------------------------------+
| Total TypeScript Services Audited: 16                                                             |
|   - Fully Connected (Live Supabase when configured): 2 (SupabaseComplaintService, staffAuth)      |
|   - Dual-Mode (Live RPC with full Local In-Memory Fallback): 2 (fieldOperations, CaseOperations)  |
|   - Pure Client-Side Computation / Heuristic Engines: 6 (v11Inference, relation, privacy, etc.)   |
|   - Local In-Memory / Simulation Engines: 4 (LocalV11, MockComplaint, localSupabaseAdapter, etc.) |
|   - Pure Frontend Presentation Services: 2 (departmentThemes, googleMapsLinks)                   |
+---------------------------------------------------------------------------------------------------+
| Total Supabase Edge Functions Audited: 6                                                          |
|   - submit-classified-complaint (V11 inference + PII redaction + Sindh geo + DB insertion)        |
|   - upload-complaint-photo (1 MiB bounded multipart upload + tracking hash / JWT auth)            |
|   - upload-department-work-proof (Before/after photo upload + AAL2 MFA + SHA-256 integrity)       |
|   - manage-department-officers (HOD officer provisioning + temporary key generation)              |
|   - provision-department-staff (Admin HOD provisioning + AAL2 MFA check)                         |
|   - send-status-notification (Queues timeline events + citizen status messages)                  |
+---------------------------------------------------------------------------------------------------+
| Baseline Verification Health:                                                                     |
|   - TypeScript Compilation (`tsc -b`): Clean (0 errors)                                           |
|   - Vite Production Build (`vite build`): Clean (2.70s bundle time)                               |
|   - Vitest Unit & Integration Suite: 92 passed test files, 930 passed tests, 0 failures           |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Complete Service-by-Service Technical Inventory

Every service in `src/services/` and `src/features/**/services/` was examined for its implementation, data sources, fallbacks, endpoints, and security posture.

```
+-----------------------------------+-----------------------------------+-----------------------------------+
| Service Name & File Path          | Classification                    | Primary Data Source & Fallback    |
+-----------------------------------+-----------------------------------+-----------------------------------+
| staffAuthService                  | Partially Connected /             | Live Supabase Auth + RPCs;        |
| src/services/staffAuthService.ts  | Dual-Mode                         | Falls back to localSupabaseAdapter|
|                                   |                                   | (in-memory + sessionStorage)      |
+-----------------------------------+-----------------------------------+-----------------------------------+
| SupabaseComplaintService          | Fully Connected (Configured) /    | Supabase DB & Edge Functions;     |
| src/services/                     | Fallback to Mock                  | Falls back to MockComplaintService|
| SupabaseComplaintService.ts       |                                   | when VITE_SUPABASE_URL unconfigured|
+-----------------------------------+-----------------------------------+-----------------------------------+
| MockComplaintService              | Mock / In-Memory                  | Hardcoded INITIAL_MOCK_COMPLAINTS |
| src/services/                     |                                   | with simulated 400ms latency      |
| MockComplaintService.ts           |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| LocalV11ComplaintService          | Local Simulation Engine           | Pure in-memory Map & arrays;      |
| src/services/                     |                                   | Client-side V11 TF-IDF execution  |
| LocalV11ComplaintService.ts       |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| LocalSupabaseAdapter              | Local Simulation Adapter          | In-memory Maps & arrays mirroring |
| src/services/                     |                                   | PostgreSQL tables & RLS logic     |
| LocalSupabaseAdapter.ts           |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| CaseOperationsService             | Dual-Mode (Live RPC /             | Live Postgres RPCs when live;     |
| src/services/                     | In-Memory Seeded Map)             | Constructor seeds in-memory Map   |
| CaseOperationsService.ts          |                                   | in DEV / test mode                |
+-----------------------------------+-----------------------------------+-----------------------------------+
| fieldOperations                   | Dual-Mode (Live RPC /             | Live Supabase RPCs (v16_*, v19_*);|
| src/features/department/services/ | Local State Fallback)             | devOrders & localStorage fallback |
| fieldOperations.ts                |                                   | when isLocalFieldDemo() is true   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| v11InferenceAdapter               | Pure Client-Side ML Engine        | Frozen Run004 candidate_model.json|
| src/services/                     |                                   | (Word/Char TF-IDF + Sigmoids)     |
| v11InferenceAdapter.ts            |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| relationEngine                    | Pure Client-Side Rule Engine      | Regular expression lexicons &     |
| src/services/relationEngine.ts    |                                   | syntactic dependency graph rules  |
+-----------------------------------+-----------------------------------+-----------------------------------+
| complaintUnderstanding            | Pure Client-Side Clarifier        | Rule-based ambiguity & disjunctive|
| src/services/                     |                                   | question generator                |
| complaintUnderstanding.ts         |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| privacy-engine                    | Pure Client-Side / Shared Engine  | Regex NER patterns for phone,     |
| src/lib/privacy-engine.ts         | (Mirrored in Edge Function)       | CNIC, names, addresses            |
+-----------------------------------+-----------------------------------+-----------------------------------+
| priority-engine                   | Pure Client-Side / Shared Engine  | Decision tree scoring urgency,    |
| src/lib/priority-engine.ts        |                                   | vulnerability, hazards            |
+-----------------------------------+-----------------------------------+-----------------------------------+
| aiReviewService                   | Partially Connected               | Live RPC staff_flag_ai_review;    |
| src/services/aiReviewService.ts   |                                   | Falls back to in-memory queue     |
+-----------------------------------+-----------------------------------+-----------------------------------+
| aiTelemetryService                | Local Telemetry Recorder          | In-memory latency & accuracy logs;|
| src/services/aiTelemetryService.ts|                                   | No external network transmission  |
+-----------------------------------+-----------------------------------+-----------------------------------+
| syntheticImageDetector            | Client-Side Heuristic Screener    | Canvas pixel entropy, EXIF markers|
| src/services/                     |                                   | Falls back to manual_review       |
| syntheticImageDetector.ts         |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| trustedTimeService                | Client Clock Synchronization      | HTTP HEAD / NTP API with fallback |
| src/services/trustedTimeService.ts|                                   | to monotonic browser clock (PKT)  |
+-----------------------------------+-----------------------------------+-----------------------------------+
| departmentThemes                  | Frontend Only                     | Static CSS variable mappings &    |
| src/features/department/services/ |                                   | single-hue atmospheric palettes   |
| departmentThemes.ts               |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| faceValidation                    | Client-Side Vision Heuristic      | Canvas aspect ratio, luminance,   |
| src/features/department/services/ |                                   | skin-tone color distribution      |
| faceValidation.ts                 |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| googleMapsLinks                   | Frontend Only                     | Universal URL builder for         |
| src/features/department/services/ |                                   | Google Maps directions (Zero-cost)|
| googleMapsLinks.ts                |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| incidentMatching                  | Client-Side Haversine Clustering  | Haversine formula + category match|
| src/features/department/services/ |                                   | Client mirror of v16 candidate RPC|
| incidentMatching.ts               |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
```

---

## 3. Detailed Service Audits

### 3.1 `staffAuthService.ts`
- **File Path:** `src/services/staffAuthService.ts` (910 lines)
- **Public Methods:**
  - `getDepartments(): Promise<DepartmentRow[]>`
  - `requestDepartmentAccess(params): Promise<{ success, requestId, error }>`
  - `signInWithCredentials(identifier, passwordAttempt, expectedDeptId): Promise<{ success, status, rejectionReason, error }>`
  - `checkCurrentStaffAccess(userId): { authorized, status, reason }`
  - `signOut(): void`
  - `getPendingRequests(): Promise<DepartmentAccessRequestWithDept[]>`
  - `approveRequest(requestId): Promise<{ success, error }>`
  - `rejectRequest(requestId, reason): Promise<{ success, error }>`
  - `revokeStaffAccess(membershipId, reason): Promise<{ success, error }>`
  - `getDepartmentMemberships(departmentId): Promise<DepartmentMembershipWithDetails[]>`
- **Current Data Source & Fallback:**
  Checks `isSupabaseConfigured() && supabase`. If configured, executes Supabase Auth `signInWithPassword`, queries `profiles`, `department_memberships`, and calls stored procedures. If unconfigured or in offline mode, delegates to `localSupabaseAdapter`.
- **Security Boundary:**
  In live mode, uses Supabase JWT. In local simulation, stores session in `sessionStorage` under `awaaz_staff_session_v2`. Route guards inspect this context, but server RPCs enforce real authority when connected.

### 3.2 `SupabaseComplaintService.ts`
- **File Path:** `src/services/SupabaseComplaintService.ts` (598 lines)
- **Public Methods:**
  - `getComplaints(): Promise<Complaint[]>`
  - `getCitizenComplaints(citizenId?: string): Promise<Complaint[]>`
  - `getComplaintByReference(referenceNumber: string): Promise<Complaint | null>`
  - `submitComplaint(input: ComplaintSubmissionInput): Promise<SubmissionResult>`
  - `trackComplaintByCode(guestTrackingNumber: string): Promise<Complaint | null>`
  - `claimComplaint(referenceNumber: string, claimCode: string): Promise<Complaint | null>`
- **Current Data Source & Fallback:**
  - When Supabase is configured:
    - Submits via `supabase.functions.invoke('submit-classified-complaint', { body })`.
    - Queries `complaints` table using restricted column set `COMPLAINT_SELECT_QUERY` (strictly excludes `claim_code_hash` and `guest_tracking_hash`).
    - Uploads photo via `supabase.functions.invoke('upload-complaint-photo', { body: formData })`.
  - When unconfigured: Falls back to `MockComplaintService`.
- **Security Boundary:**
  Server-enforced when calling Edge Functions. Edge function performs payload size checks, Sindh polygon checks, and service-role database insertion.

### 3.3 `fieldOperations.ts`
- **File Path:** `src/features/department/services/fieldOperations.ts` (1,935 lines)
- **Public Methods:**
  - `listOfficers(departmentId): Promise<DepartmentOfficer[]>`
  - `provisionOfficer(input): Promise<ProvisionOfficerResult>`
  - `resetOfficerCredentials(input): Promise<ResetOfficerCredentialsResult>`
  - `listWorkOrders(departmentId): Promise<DepartmentWorkOrder[]>`
  - `findCandidateOrders(params): Promise<CandidateWorkOrderMatch[]>`
  - `createWorkOrderWithAdvisory(input): Promise<{ orderId, mode, idempotentReplay }>`
  - `attachReportToWorkOrder(input): Promise<{ orderId, complaintId, mode, idempotentReplay }>`
  - `detachReportFromWorkOrder(input): Promise<void>`
  - `reassignWorkOrderOfficer(input): Promise<void>`
  - `startWork(departmentId, orderId): Promise<void>`
  - `submitResolution(input): Promise<{ verificationStatus, distanceMeters, reportId }>`
  - `approveResolution(departmentId, orderId): Promise<void>`
  - `returnCorrection(departmentId, orderId, reason): Promise<void>`
  - `extendDeadline(departmentId, orderId, hours, reason): Promise<void>`
  - `saveOfficerProfile(details): Promise<void>`
  - `verifyGpsProximity(officerLat, officerLon, anchorLat, anchorLon): { verified, distanceMeters, accuracyMeters, isException }`
- **Current Data Source & Fallback:**
  Contains complete dual logic. When `isLocalFieldDemo()` is false, calls Supabase RPCs:
  `v16_find_candidate_orders`, `v16_create_work_order_with_advisory`, `v16_attach_report_to_work_order`, `v16_detach_report_from_work_order`, `v16_reassign_work_order_officer`, `v19_start_work_order`, `v19_submit_work_completion`, `v19_approve_resolution`, `v19_return_correction`, `v19_extend_deadline`, `v19_save_officer_profile`.
  When in local demo mode, operates on `devOrders`, `devOfficers`, and `devProofs` in memory and persists profile updates to `localStorage`.

### 3.4 `CaseOperationsService.ts`
- **File Path:** `src/services/CaseOperationsService.ts` (1,500 lines)
- **Public Methods:**
  - `getHeadOverview(departmentId, period): Promise<HeadPeriodOverview>`
  - `listIndependentComplaintsForHead(departmentId, options): Promise<HeadIndependentComplaintRow[]>`
  - `getComplaintDetailForHead(departmentId, complaintId): Promise<HeadIndependentComplaintRow | null>`
  - `acceptIndependentComplaint(departmentId, complaintId): Promise<void>`
  - `rejectIndependentComplaint(departmentId, complaintId, reason): Promise<void>`
  - `overridePriority(departmentId, complaintId, priority, reason): Promise<void>`
  - `bulkAcceptCases(departmentId, caseIds): Promise<BulkAcceptResult>`
- **Current Data Source & Fallback:**
  In constructor, seeds synthetic demonstration cases across all 6 departments when in DEV or TEST mode (`this.seedAllDepartments()`). In live mode, queries `complaints` and `complaint_issues`.

---

## 4. Inventory of Supabase Edge Functions

All 6 Edge Functions under `supabase/functions/` were inspected for implementation and dependencies:

```
+-----------------------------------+-----------------------------------+-----------------------------------+
| Edge Function Name & Path         | Purpose & Runtime                 | Inputs, Auth & Storage Details    |
+-----------------------------------+-----------------------------------+-----------------------------------+
| submit-classified-complaint       | Citizen complaint intake:         | Body: JSON (16 KiB limit);        |
| supabase/functions/               | Sindh polygon validation,         | Auth: Anonymous / Citizen Bearer; |
| submit-classified-complaint/      | V11 inference, PII redaction,     | DB: Service role insert into      |
| index.ts                          | reference & claim code generation | complaints & private tables       |
+-----------------------------------+-----------------------------------+-----------------------------------+
| upload-complaint-photo            | Citizen evidence photo upload     | Body: Multipart (1 MiB max);      |
| supabase/functions/               | with magic byte verification      | Auth: Tracking hash or Citizen    |
| upload-complaint-photo/           | (JPEG, PNG, WebP)                 | JWT; Bucket:                      |
| index.ts                          |                                   | complaint-evidence-private        |
+-----------------------------------+-----------------------------------+-----------------------------------+
| upload-department-work-proof      | Officer before/after resolution   | Body: Multipart (2 MiB max);      |
| supabase/functions/               | proof photo upload;               | Auth: Staff JWT (AAL2 MFA req.);  |
| upload-department-work-proof/     | Computes SHA-256 digest           | Bucket:                           |
| index.ts                          |                                   | department-work-proof-private     |
+-----------------------------------+-----------------------------------+-----------------------------------+
| manage-department-officers        | HOD provisioning and credential   | Body: JSON;                       |
| supabase/functions/               | reset for department officers;    | Auth: HOD Staff JWT (AAL2 MFA);   |
| manage-department-officers/       | Generates 18-char temp access key | DB: Admin API createUser/update   |
| index.ts                          |                                   | into department_memberships       |
+-----------------------------------+-----------------------------------+-----------------------------------+
| provision-department-staff        | Main Admin provisioning of HOD    | Body: JSON;                       |
| supabase/functions/               | staff accounts                    | Auth: Main Admin JWT (AAL2 MFA);  |
| provision-department-staff/       |                                   | DB: Admin API createUser          |
| index.ts                          |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
| send-status-notification          | Dispatches citizen timeline       | Body: JSON (complaintId, status); |
| supabase/functions/               | updates and queues notifications  | Auth: Staff JWT;                  |
| send-status-notification/         | in complaint_notification_outbox  | DB: Insert timeline & outbox      |
| index.ts                          |                                   |                                   |
+-----------------------------------+-----------------------------------+-----------------------------------+
```

---

## 5. Architectural Gaps & Critical Vulnerabilities

1. **Split-Brain State Hazard (Local Simulation vs. Live DB):**
   When `VITE_SUPABASE_URL` is missing or placeholder, the frontend gracefully falls back to `localSupabaseAdapter` and in-memory Map stores. However, data created in one browser tab is isolated to that tab or ephemeral memory. Multi-browser real-device testing fails completely without a live Supabase backend.
2. **Two-Step Non-Atomic Citizen Submission:**
   Citizen complaint text is inserted in Step 1 (`submit-classified-complaint`). The photo is uploaded in Step 2 (`upload-complaint-photo`). If the network disconnects or browser closes between Step 1 and Step 2, the complaint exists in the database permanently without its attached photo, and the user receives a partial error message.
3. **Absence of Realtime Push Subscriptions:**
   The Department HOD portal and Officer portal rely on polling or view re-mounting (`useEffect` on tab switch) to refresh complaints and work orders. Neither portal currently subscribes to `supabase.channel('complaints')` or Postgres CDC events.
4. **Mocked First-Login OTP Delivery:**
   While `OtpInput.tsx` exists on the frontend and requires a 6-digit code, the backend delivery mechanism (SMTP email or cellular SMS) is not hooked to a live transactional gateway. In local mode, any 6-digit input is accepted or pre-filled.
5. **Redundant Incident Clustering Models in SQL Migrations:**
   Migration `20261123000000` created `incident_cases` and `incident_case_reports` (V5 desk model). Migration `20261203000000` and `20261206000000` created `department_work_orders` and `department_work_order_reports` (V13.18/V16 model). The frontend has standardized on `department_work_orders`, leaving `incident_cases` as an unused schema legacy.
