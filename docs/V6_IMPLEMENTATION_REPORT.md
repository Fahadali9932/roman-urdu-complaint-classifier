# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V6 MASTER IMPLEMENTATION REPORT
## Trustworthy Citizen Submission, Private Tracking, Safe Authentication & Living Department Workspace

**Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Branch:** `feature/live-citizen-classification-workflow`  
**Supabase Project:** `akbwiedtmxjxcjscgitw` (`https://akbwiedtmxjxcjscgitw.supabase.co`)  
**Status:** Verification Passed (All 6 Acceptance Gates Satisfied)

---

## 1. Executive Summary

Phase V6 focused on resolving nine systemic defects spanning citizen trust, privacy hardening, role isolation, and department operational craft. Previous iterations suffered from cross-role credential leakage, persistent applicant draft leakage in `sessionStorage`, a completely blank department overview screen, synthetic demo terminology, and missing synchronization between citizen submissions and department work queues.

All nine defects have been addressed, verified by automated unit and integration tests (30 test files, 235 tests passing), confirmed with zero build errors, and visually validated across desktop (1440x900) and mobile (390x844) viewports.

---

## 2. Root Cause Analysis & Technical Resolutions

### Defect 1: New Citizen Complaints Not Appearing in Department Work Queue
* **Root Cause:** `CaseOperationsService` initialized cases from static in-memory seed generators without querying live rows in `public.complaints`. While citizen complaints were successfully stored in Supabase via the Edge Function, department staff officers saw only seed cases.
* **Resolution:** 
  - Implemented `syncWithSupabase(deptId: DepartmentId)` in `src/services/CaseOperationsService.ts`.
  - Dynamically queries `public.complaints` filtering by `assigned_department_id = deptId` or `predicted_department_id = deptId`.
  - Maps live citizen complaints into `IncidentCaseSummary` objects and incorporates them into the department work queue.
  - Linked bulk acceptance actions (`executeBulkAcceptance`) back to Supabase to update live complaint records in real time.

### Defect 2: Two-Way Role Separation & Wrong-Portal Session Revocation
* **Root Cause:** Route guards allowed cross-portal leakage: department staff could browse citizen authenticated pages, and citizens could potentially enter department dashboards if sessions were active in browser storage.
* **Resolution:**
  - Updated `src/features/auth/CitizenRequiredRoute.tsx`: if a logged-in user possesses the `department_staff` role, the route revokes the session on Supabase and signs them out with notice: *"This is a department account. Please use the department sign-in page."*
  - Updated `src/features/auth/LoginPage.tsx`: intercepts staff credentials entered into the citizen login form, immediately signs out, and warns the user.
  - Updated `src/services/staffAuthService.ts`: when a citizen profile attempts to sign into the Department Portal, the service checks the profile role, signs out, and denies access with: *"This is a citizen account. Please use the citizen sign-in page."*
  - Covered with regression tests in `src/test/RoleAndDraftSecurity.test.tsx`.

### Defect 3: Cross-Account Draft Leakage in Browser Storage
* **Root Cause:** `sessionStorage.getItem('awaaz_complaint_draft_v1')` persistently held citizen applicant PII (name, phone, home address, narrative) across different users on shared family or public computers.
* **Resolution:**
  - Updated `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx`:
    - Actively purges any legacy `awaaz_complaint_draft_v1` on component mount.
    - Stores applicant contact information strictly in React component memory (`useState`) and never serializes it to `sessionStorage` or `localStorage`.
    - Automatically purges contact details if the authenticated citizen changes.
    - Truthful privacy disclosures rendered in both English and Urdu.
  - Covered with regression tests in `src/test/RoleAndDraftSecurity.test.tsx`.

### Defect 4: Citizen Registration Validation & NIST 800-63B Passphrase Policy
* **Root Cause:** Registration lacked RFC 5322 email syntax validation, lacked a confirm password input, and used overly rigid or confusing password validation.
* **Resolution:**
  - Updated `src/features/auth/RegisterPage.tsx` and `src/i18n/translations.ts`:
    - Normalizes emails to lowercase and validates syntax via standard regex.
    - Added mandatory `Confirm Password` field with show/hide password toggle.
    - Implemented NIST SP 800-63B compliant passphrase policy: minimum 15 Unicode characters, full support for spaces, phrases, and natural language, without arbitrary complexity rules (no forcing special symbols or uppercase if length >= 15).
  - Covered with comprehensive tests in `src/test/RegisterPage.test.tsx` (all 6 tests passing).

### Defect 5: One-Number 24-Digit Guest Tracking with Zero-PII Whitelist
* **Root Cause:** Guest tracking previously relied on complicated dual codes (reference number + claim code) or raw reference lookups that could disclose citizen information.
* **Resolution:**
  - Added migration `supabase/migrations/20261124000000_guest_numeric_tracking_v6.sql`:
    - Adds `guest_tracking_hash` (CHAR(64)) column with SHA-256 index.
    - Creates `get_guest_complaint_status(p_tracking_hash text)` database RPC returning strictly public-safe whitelist fields: `found`, `public_status`, `display_status`, `public_category`, `submitted_at`, `updated_at`, `public_updates`.
  - Updated `supabase/functions/submit-classified-complaint/index.ts`:
    - Generates 24-digit CSPRNG numeric tracking code (`generateGuestTrackingNumber()`) using `crypto.getRandomValues` with rejection sampling.
    - Hashes tracking number with SHA-256 and stores in `guest_tracking_hash`.
    - Returns unhashed 24-digit code in submission response.
  - Updated `src/features/citizen/ComplaintTracker.tsx`:
    - Primary tab: single input for 24-digit tracking number with automatic grouping (`XXXX XXXX XXXX XXXX XXXX XXXX`).
    - Secondary tab: "Claim to account" for linking complaints or legacy `CLM-...` claim codes.
    - Enforced rate limiting (max 10 attempts).
    - Rendered minimal public status card with zero PII (no applicant name, phone, email, or raw text).
  - Covered with regression tests in `src/test/GuestNumericTracking.test.tsx`.

### Defect 6: Department Overview Screen Blank Bug
* **Root Cause:** `DepartmentSidebar` set navigation state to `currentSection = 'overview'`, but `DepartmentDashboardPage.tsx` only matched `currentSection === 'dashboard'`, causing React to render nothing in the main workspace.
* **Resolution:**
  - Created `src/features/department/components/OverviewPage.tsx`:
    - Implements the animated Civic Response Network SVG based on `prototype/overview_motion_preview.html`.
    - Time-aware greeting ("Good morning / afternoon / evening") tailored to Pakistan Standard Time.
    - 4-metric overview strip: Waiting for a reply, Work started, Completed cases, Active municipal areas.
    - "Next up" queue preview with quick-action links.
    - "Areas to check" Karachi district rollup.
  - Updated `DepartmentDashboardPage.tsx` to mount `OverviewPage` when `currentSection === 'overview' || currentSection === 'dashboard'`.
  - Added responsive CSS in `department-theme.css` for mobile screens.

### Defect 7: Case Detail Synthetic / Robotic Copy Eradication
* **Root Cause:** Hardcoded mock templates contained phrases such as `"Synthetic demonstration"`, `"0 Nov 2026"`, `"Intake Pipeline"`, `"At a glance"`, and `"Independently trackable"`.
* **Resolution:**
  - Replaced all non-production copy across `src/features/department/components/CaseDetailPage.tsx` and `src/services/CaseOperationsService.ts` according to `COPY_REPLACEMENT_MATRIX.md`.
  - Fixed date arithmetic bug in seed generators where `15 - age` evaluated to `0 Nov 2026`.
  - Retained incident grouping, corroborated citizen reports list, and bulk acceptance functionality intact.

### Defect 8: Topbar Redesign
* **Root Cause:** Previous topbar had inconsistent height, misaligned breadcrumbs, and cluttered layout.
* **Resolution:**
  - Redesigned `src/features/department/components/DepartmentTopbar.tsx`:
    - Exact 60px height with clean border.
    - Clear hierarchical breadcrumbs (`Work queue / Case C-2051` or `Overview`).
    - Restrained agency badge (e.g., `KMC`, `KWSC`, `KE`).
    - User avatar menu with dropdown options for `Settings` and `Sign out`.

### Defect 9: Citizen Footer & Settings Cleanup
* **Root Cause:** Public citizen footer and mobile drawer contained a link to the internal Department Portal, confusing citizens.
* **Resolution:**
  - Updated `src/components/layout/PublicFooter.tsx` and `PublicHeader.tsx`: removed Department Portal links.
  - Streamlined `DepartmentDashboardPage.tsx` settings section with theme selection and account info.

---

## 3. Database Schema Migration Plan

The SQL migration file has been created at:  
`supabase/migrations/20261124000000_guest_numeric_tracking_v6.sql`

```sql
-- Adds SHA-256 hash column for 24-digit numeric guest tracking
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS guest_tracking_hash CHAR(64);

CREATE INDEX IF NOT EXISTS idx_complaints_guest_tracking_hash
ON public.complaints(guest_tracking_hash)
WHERE guest_tracking_hash IS NOT NULL;

-- Public-safe RPC returning zero PII
CREATE OR REPLACE FUNCTION public.get_guest_complaint_status(p_tracking_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
...
$$;
```

> [!IMPORTANT]
> Per safety directives, this migration has **not** been applied to remote production Supabase. It is ready for deployment once authorized.
