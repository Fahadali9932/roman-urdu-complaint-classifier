# AWAAZ-E-AWAM (آوازِ عوام)
## V23.0A Implementation Roadmap: End-to-End Backend Integration

**Project:** Roman Urdu Multi-Department Civic Complaint Classifier & Resolution Platform  
**Audit Milestone:** V23.0A — Backend Architecture & Integration Audit  
**Date of Audit:** 28 November 2026  
**Auditor Roles:** Principal Software Architect, Senior Backend Engineer, ML Engineer, QA Lead  
**Authorized Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Guiding Principles:**  
1. Strict $0.00 financial budget (Zero paid APIs, zero credit cards, zero commercial LLMs).  
2. 100% preservation of approved frozen frontend design and responsive UX.  
3. Server-side boundary enforcement (PostgreSQL RLS and Deno Edge Functions).  
4. Bounded, automated test verification at every phase transition.

---

## 1. Phased Roadmap Overview

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASE V23 INTEGRATION TIMELINE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [V23.0A] Current Architecture & Integration Audit  --------------------------> [COMPLETED]       |
|           Exhaustive technical audit of all services, DB schemas, workflows.                        |
|                                                                                                    |
|  [V23.0B] Database Schema Reconciliation & Unified Auth Integration ----------> [NEXT PHASE]      |
|           Consolidated migrations, clean Supabase Auth connection, HOD & Officer live logins.      |
|                                                                                                    |
|  [V23.0C] Roman Urdu Classifier Backend Service & Edge Function Deployment ----> [PENDING]         |
|           Deno-hosted V11 model inference, 16 KiB bounded intake, live routing, PII redaction.     |
|                                                                                                    |
|  [V23.0D] Cross-Portal Real-Time Workflows -----------------------------------> [PENDING]         |
|           Citizen -> HOD queue -> Officer mobile dispatch -> Proof upload -> Verification closure.|
|                                                                                                    |
|  [V23.0E] Multi-Browser Verification, Stress Testing & Final Hardening -------> [PENDING]         |
|           Cross-device browser testing, GPS tamper resistance, SLA monotonic clock audit.          |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Execution Plan

### Phase V23.0B: Database Schema Reconciliation & Real Auth Wiring
- **Primary Goal:** Establish a pristine, non-conflicting PostgreSQL schema on live Supabase and connect real authentication for Citizens, Department Heads, and Field Officers.
- **Key Objectives:**
  1. Consolidate legacy migrations: formally deprecate `incident_cases` and standardize on `department_work_orders`.
  2. Apply missing constraints and ensure RLS is 100% active on all 34 tables.
  3. Wire `staffAuthService.ts` to live Supabase Auth without breaking local simulation fallback.
  4. Ensure HOD and Officer login flows (`/department/head/login` and `/department/officer/login`) authenticate against live Supabase Auth with proper departmental isolation.
- **Files to Modify / Create:**
  - `supabase/migrations/20261208000000_v23_schema_consolidation.sql` (New unified migration)
  - `src/services/staffAuthService.ts` (Streamline live vs fallback paths)
  - `src/context/DepartmentAuthContext.tsx` (Seamless session persistence with Supabase Auth)
  - `src/lib/supabase.ts` (Dynamic configuration validation)
- **Verification Criteria:**
  - HOD can sign in with live email/password and see department data.
  - Officer can sign in with staff username/employee ID and receive assigned work orders.
  - All existing 930 Vitest tests pass without regressions.

---

### Phase V23.0C: Roman Urdu Classifier Backend Service & Edge Function Deployment
- **Primary Goal:** Deploy the frozen V11 Roman Urdu classifier and privacy engine inside Supabase Deno Edge Functions with zero external API dependencies.
- **Key Objectives:**
  1. Package `v11_model.json` and dual-track TF-IDF engine into `submit-classified-complaint`.
  2. Ensure edge inference executes within $\le 50$ms and 16 KiB memory bounds.
  3. Deploy `upload-complaint-photo` with 1 MiB bounded magic-byte image validation.
  4. Connect `SupabaseComplaintService.ts` to invoke live Edge Functions when configured.
  5. Retain `LocalV11ComplaintService.ts` as an instant offline/test fallback.
- **Files to Modify / Create:**
  - `supabase/functions/submit-classified-complaint/index.ts`
  - `supabase/functions/upload-complaint-photo/index.ts`
  - `src/services/SupabaseComplaintService.ts`
  - `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx`
- **Verification Criteria:**
  - Submitting Roman Urdu complaint (e.g., `"Bijli ka meter jal gaya hai"`) routes to `kelectric` on live Supabase database.
  - Multi-department text routes correctly to both departments.
  - 24-digit tracking number and claim code generated and stored in hash format.

---

### Phase V23.0D: Cross-Portal Real-Time Workflows
- **Primary Goal:** Enable end-to-end data propagation across Citizen, HOD, and Officer portals with Supabase Realtime updates.
- **Key Objectives:**
  1. Connect HOD complaints inbox (`HodComplaintsView.tsx`) to live Supabase `complaints` table.
  2. Implement `v16_create_work_order_with_advisory` execution in `fieldOperations.ts`.
  3. Connect Officer mobile work console (`OfficerWorkView.tsx`) to live `department_work_orders`.
  4. Deploy `upload-department-work-proof` Edge Function and create `department-work-proof-private` storage bucket.
  5. Connect `v19_submit_work_completion` and `v19_approve_resolution` live RPC calls.
  6. Add Realtime push subscriptions (`supabase.channel`) for instant notification badges.
- **Files to Modify / Create:**
  - `src/features/department/services/fieldOperations.ts`
  - `src/services/CaseOperationsService.ts`
  - `src/features/department/components/v19/HodComplaintsView.tsx`
  - `src/features/department/components/v19/OfficerWorkView.tsx`
  - `src/features/department/components/v19/HodVerificationView.tsx`
  - `src/features/citizen/ComplaintTracker.tsx`
- **Verification Criteria:**
  - Complaint submitted by Citizen appears in HOD portal in $< 1$s.
  - Work order assigned by HOD appears in Officer mobile console immediately.
  - Resolution submitted by Officer appears in HOD Verification Desk with Before/After photos.
  - Approval by HOD reflects as `Resolved` in Citizen Tracking.

---

### Phase V23.0E: End-to-End Multi-Browser Verification & Stress Testing
- **Primary Goal:** Execute rigorous, evidence-based verification across separate physical devices and browsers.
- **Key Objectives:**
  1. Multi-device live browser test: Citizen on Desktop Chrome, HOD on Edge Desktop, Officer on Android/iOS Safari.
  2. Server-side GPS distance tamper resistance test (rejecting spoofed client assertions).
  3. Monotonic clock test (validating SLA deadlines cannot be gamed by client clock shifts).
  4. Zero-cost production build verification and performance profiling.
- **Verification Criteria:**
  - 100% of workflows function across independent browsers without shared local storage.
  - 0 TypeScript errors, 0 build errors, 100% test pass rate in Vitest.
  - Comprehensive Playwright visual QA screenshots across all portals.

---

## 3. Technical Risk Matrix & Mitigations

```
+-----------------------------------+----------+-------------+---------------------------------------------------+
| Risk Description                  | Severity | Probability | Concrete Mitigation Strategy                      |
+-----------------------------------+----------+-------------+---------------------------------------------------+
| Supabase Free Tier Pausing /      | Medium   | Low         | Maintain 100% functional LocalV11ComplaintService |
| Unconfigured Environment          |          |             | and LocalSupabaseAdapter as instant fallbacks.    |
+-----------------------------------+----------+-------------+---------------------------------------------------+
| Split-Brain State in Tests        | High     | Medium      | Keep unit and integration tests configured with   |
| (Tests expecting local mocks)     |          |             | MODE === 'test', isolating tests from live DB.    |
+-----------------------------------+----------+-------------+---------------------------------------------------+
| Deno Edge Function Cold Starts    | Low      | Medium      | Keep classifier bundle under 2 MiB and optimize   |
| (Slow intake latency)             |          |             | TF-IDF matrix lookup loops.                       |
+-----------------------------------+----------+-------------+---------------------------------------------------+
| Image Upload Size Limits          | Medium   | Medium      | Enforce client-side canvas compression to 1 MiB   |
| (Citizen / Officer mobile photos) |          |             | before upload + server-side 1 MiB hard ceiling.   |
+-----------------------------------+----------+-------------+---------------------------------------------------+
| GPS Spoofing on Officer Work      | High     | Low         | Server-side recalculation of Haversine distance   |
|                                   |          |             | inside PostgreSQL v19_submit_work_completion RPC. |
+-----------------------------------+----------+-------------+---------------------------------------------------+
```
