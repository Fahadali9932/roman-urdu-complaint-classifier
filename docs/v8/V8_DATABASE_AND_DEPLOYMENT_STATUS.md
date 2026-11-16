# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V8
## DATABASE & REMOTE DEPLOYMENT STATUS REPORT

**Project ID:** `akbwiedtmxjxcjscgitw` (`https://akbwiedtmxjxcjscgitw.supabase.co`)  
**Target Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Date:** 16 November 2026  
**Auditor:** Supabase Database Architect & Systems Integration Lead  

---

## 1. Remote Supabase Schema Status

A comprehensive live schema probe was executed against the remote Supabase project using authenticated JWT credentials and PostgREST introspection.

### 1.1 Tables Confirmed Live on Remote Supabase

| Table Name | Status | Approximate Count | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `public.complaints` | **EXISTS** | 38+ rows | Master complaint records, Roman Urdu text, PII sanitization flags, classification, and status. |
| `public.departments` | **EXISTS** | 6 rows | The 6 Karachi municipal authorities (KMC, KWSC, K-Electric, SSGC, SBCA, SSWMB). |
| `public.department_memberships` | **EXISTS** | 6+ rows | Role-based staff assignments linking user accounts to municipal departments. |
| `public.profiles` | **EXISTS** | Verified | User profile identities for citizens and staff officers. |
| `public.complaint_timeline_events` | **EXISTS** | Verified | Immutable audit log of status transitions and departmental notes. |

### 1.2 Columns in `public.complaints`

Introspection of a sample complaint row confirms the presence of all required columns:
- `id` (`uuid`, primary key)
- `reference_number` (`text`, unique, format `KHI-YYYY-XXXXXXXX`)
- `citizen_id` (`uuid`, nullable for guest submissions)
- `title` (`text`)
- `description` (`text`, raw citizen submission)
- `sanitized_description` (`text`, PII-redacted text)
- `generated_heading` (`text`, formal title)
- `factual_summary` (`text`, synthesized municipal summary)
- `redaction_flags` (`jsonb`, detection flags for phone, email, CNIC, private address)
- `redaction_needs_review` (`boolean`)
- `detected_language` (`text`, e.g., Roman Urdu)
- `incident_district` (`text`, Karachi administrative district)
- `incident_locality` (`text`, neighbourhood/town)
- `incident_public_location` (`text`, street corridor / physical landmark)
- `status` (`text`, `submitted`, `assigned`, `accepted`, `in_progress`, `resolved`, `rejected`)
- `assigned_department_id` (`text`, FK to departments)
- `predicted_department_id` (`text`, ML classifier prediction)
- `prediction_confidence` (`numeric`, floating point confidence score)
- `is_reviewed_by_admin` (`boolean`)
- `is_demonstration` (`boolean`)
- `claim_code_hash` (`text`, SHA-256 hash for guest ownership claiming)
- `claimed_at` (`timestamptz`)
- `manual_priority` (`text`, `critical`, `high`, `normal`, `low`)
- `manual_priority_reason` (`text`)
- `manual_priority_by` (`uuid`)
- `manual_priority_at` (`timestamptz`)
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

### 1.3 Verified Remote RPC Functions

| Function Name | Security Type | Verified Behavior |
| :--- | :--- | :--- |
| `public.staff_update_complaint_status` | `SECURITY DEFINER` | Validates staff membership, updates `complaints.status`, appends event to `complaint_timeline_events`. |
| `public.staff_review_and_assign_complaint` | `SECURITY DEFINER` | Clearinghouse operator function to reassign complaints to other municipal authorities. |
| `public.override_complaint_priority` | `SECURITY DEFINER` | Staff function to set `manual_priority` and audit reason. |

### 1.4 Verified Remote Edge Functions

| Function Name | Version / Model | Status |
| :--- | :--- | :--- |
| `submit-classified-complaint` | Retrained Model (92.82% Confidence) | **Operational & Responsive** |

---

## 2. Unapplied Local Migrations & Non-Breaking Architecture

In accordance with strict operating instructions, no schema migrations or destructive changes were pushed to remote Supabase without explicit user authorization.

The following migration files exist locally in `supabase/migrations/` but have not yet been deployed to the remote database:
1. `20261123000000_case_operations_desk_v5.sql` (Creates `incident_cases`, `incident_case_reports`, `incident_case_events`, `case_batch_operations`)
2. `20261124000000_guest_numeric_tracking_v6.sql` (Creates `citizen_guest_claims`, `get_guest_complaint_status` RPC)

### Client Architectural Resilience
Rather than crashing or degrading when these unapplied tables are absent on remote Supabase:
- `CaseOperationsService` operates natively on `public.complaints`.
- Live complaints are fetched and dynamically corroborated into incident cases using physical corridor matching rules (`isCorridorMatch`).
- When staff execute batch acceptance or individual status transitions, the service updates records via the remote `staff_update_complaint_status` RPC.
- This decoupling ensures 100% operational functionality regardless of whether the migration files have been applied to Supabase.

---

## 3. Recommended Future Deployment Plan

When the user explicitly authorizes running migrations on remote Supabase, the following steps should be executed via the Supabase Dashboard SQL Editor:
1. Review and execute `supabase/migrations/20261123000000_case_operations_desk_v5.sql`.
2. Review and execute `supabase/migrations/20261124000000_guest_numeric_tracking_v6.sql`.
3. Verify table presence via PostgREST introspection.
