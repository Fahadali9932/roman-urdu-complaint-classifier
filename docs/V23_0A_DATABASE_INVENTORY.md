# AWAAZ-E-AWAM (آوازِ عوام)
## V23.0A Complete Database Inventory & Schema Audit

**Project:** Roman Urdu Multi-Department Civic Complaint Classifier & Resolution Platform  
**Audit Milestone:** V23.0A — Backend Architecture & Integration Audit  
**Date of Audit:** 28 November 2026  
**Auditor Roles:** Principal Software Architect, PostgreSQL & Supabase Specialist, Security Auditor  
**Authorized Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Migration Directory:** `supabase/migrations/` (36 Migration Files Audited)

---

## 1. Complete Migration Sequence & History

```
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| Migration Timestamp & Filename    | Core Architectural Purpose & DDL Operations                                                       |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261113000000_staff_access_      | Base schema: departments, profiles, department_access_requests, department_memberships,           |
| management.sql                    | access_audit_log, basic RLS policies and admin helper functions.                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261114000000_core_complaints_   | Core complaints table, complaint_citizen_private (PII isolation), complaint_timeline_events,      |
| and_privacy.sql                   | auth_rate_limits, staff_update_complaint_status RPC.                                              |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261114000003_controlled_demo_   | Demonstration flag support (is_demonstration boolean) on complaints and submission RPC.           |
| submissions.sql                   |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261115000000_security_          | Access request review hardening, trigger rejecting contact numbers from raw complaint text.       |
| hardening.sql                     |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261115000001_revoke_legacy_     | Revokes direct INSERT/UPDATE on complaints from anon and authenticated roles.                     |
| client_grants.sql                 |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261115000002_close_department_  | Revokes direct SELECT on raw complaints from non-assigned staff.                                  |
| view.sql                          |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261115000003_remove_anonymous_  | Enforces authentication guards on public RPC functions.                                           |
| definer_access.sql                |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261116000000_live_citizen_      | Dynamic citizen profile creation trigger on auth.users insert.                                    |
| submission.sql                    |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261116000001_citizen_profile_   | Refines profile trigger execution context and error handling.                                     |
| trigger.sql                       |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261116000002_revoke_citizen_    | Security patch revoking direct execute on citizen profile trigger function.                       |
| trigger_execute.sql               |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261117000000_department_        | Adds complaint_notification_outbox and department acceptance workflow state machine.             |
| acceptance_workflow.sql           |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261118000000_guest_complaint_   | Guest complaint submission: adds claim_code_hash, guest_tracking_hash, claim_guest_complaint RPC. |
| submission_and_claiming.sql       |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261119000000_live_guest_claim_  | Aligns guest claim code format and hashing logic (SHA-256).                                       |
| alignment.sql                     |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261119000001_revoke_guest_rpc_  | Revokes public execution on internal claiming helpers.                                            |
| public_access.sql                 |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261120000000_staff_class_       | Introduces staff classification review queue, complaint_audit_logs, review_and_assign RPC.        |
| review_queue.sql                  |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261121000000_intelligent_       | Adds sanitized_description, generated_heading, factual_summary, redaction_flags to complaints.   |
| privacy_sanitization.sql          |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261121195517_v13_16_2_atomic_   | Atomic batch acceptance: staff_batch_acceptance_requests table and batch acceptance RPC.          |
| batch_acceptance.sql              |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261121202000_v13_16_2_reconcile_| Hardens idempotency checks and department isolation guards on batch acceptance.                  |
| atomic_guards.sql                 |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261122000000_staff_priority_    | Manual priority overrides: manual_priority, manual_priority_reason, staff_override_priority RPC.  |
| override.sql                      |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261123000000_case_operations_   | Case operations desk v5: incident_cases, incident_case_reports, incident_case_events,              |
| desk_v5.sql                       | case_batch_operations.                                                                            |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261124000000_guest_numeric_     | Guest numeric tracking: 24-digit tracking numbers, get_guest_complaint_status RPC.                |
| tracking_v6.sql                   |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261125000000_multi_department_  | Multi-department schema: complaint_issues table, assigned_department_ids array column.            |
| schema.sql                        |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261126000000_close_privileged_  | Closes public intake RPCs, permanently revokes access to complaint_citizen_private from staff.    |
| intake_repair_privacy.sql         |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261126000001_shared_ai_         | Shared AI classification reviews: ai_classification_reviews table and review queue RPCs.          |
| classification_reviews.sql        |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261127000000_harden_staff_      | Security audit patch: restricts staff RPC permissions to authenticated department staff only.      |
| rpc_permissions.sql               |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261127000001_close_public_      | Revokes all public execute on complaint RPCs; routes all intake through Edge Functions.           |
| complaint_rpc_access.sql          |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261128000000_v13_10_case_rpc_   | Hardens case RPC error handling and transaction boundaries.                                       |
| hardening.sql                     |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261129000000_v13_10_reconcile_  | Fixes reassignment race conditions across multi-department routing issues.                        |
| reassignment.sql                  |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261130000000_v13_11_persistent_ | Persistent intake rate limiting: app_private.complaint_intake_rate_limits schema & table.         |
| intake_quotas.sql                 |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261201000000_v13_13_hide_guest_ | Ensures claim_code_hash and guest_tracking_hash cannot be leaked via schema introspection or views.|
| claim_credentials.sql             |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261202000000_v13_17_evidence_   | Private evidence & geo archive: complaint_geo_points and complaint_evidence tables.               |
| and_public_map.sql                |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261203000000_v13_18_verified_   | Verified work orders: department_work_orders, department_work_order_reports,                      |
| work_orders.sql                   | department_work_evidence, department_work_feedback, department_work_closure_reviews, events.      |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261204000000_v13_18_monotonic_  | Monotonic timestamps: prevents clock rollback exploits on work order SLA deadlines.               |
| timestamps.sql                    |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261205000000_v14_sindh_geo_     | Sindh boundary polygon coordinates verification & dual work proof download authorization.         |
| dual_work_proof.sql               |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261206000000_v16_incident_      | Incident assignment & advisory clustering: v16_assignment_operations, candidate matching RPCs.    |
| assignment_and_staff.sql          |                                                                                                   |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
| 20261207000000_v19_unified_hod_   | Unified HOD/Officer portal: work_order_deadline_history, staff_notifications, officer_warnings,   |
| officer_portals.sql               | officer_activity_heartbeats, officer_ranking_events, officer_profile_details, v19_* RPCs.         |
+-----------------------------------+---------------------------------------------------------------------------------------------------+
```

---

## 2. Complete Table Inventory (All 34 Tables)

### Group 1: Core System & Personnel Access
1. **`public.departments`**
   - Columns: `id` (text, PK), `name` (text), `name_urdu` (text), `code` (text, UNIQUE), `is_active` (boolean, default true), `created_at` (timestamptz).
   - Seeded with 6 Karachi departments: `kelectric`, `sswmb`, `ssgc`, `kwsc`, `kmc`, `sbca`.
2. **`public.profiles`**
   - Columns: `id` (uuid, PK, references `auth.users`), `full_name` (text), `email` (text), `role` (text: `main_admin` | `department_staff` | `citizen`), `created_at` (timestamptz), `updated_at` (timestamptz).
3. **`public.department_access_requests`**
   - Columns: `id` (uuid, PK), `user_id` (uuid, references `auth.users`), `department_id` (text, references `departments`), `full_name` (text), `work_email` (text), `cnic` (text, nullable), `phone` (text, nullable), `job_title` (text, nullable), `badge_id` (text, nullable), `status` (text: `pending` | `approved` | `rejected` | `revoked`), `rejection_reason` (text, nullable), `reviewed_by` (uuid, nullable), `reviewed_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
4. **`public.department_memberships`**
   - Columns: `id` (uuid, PK), `user_id` (uuid, references `auth.users`), `department_id` (text, references `departments`), `staff_role` (text: `head` | `officer`, default `officer`), `status` (text: `active` | `suspended` | `revoked`, default `active`), `approved_by` (uuid), `approved_at` (timestamptz), `revoked_by` (uuid, nullable), `revoked_at` (timestamptz, nullable), `revocation_reason` (text, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
5. **`public.access_audit_log`**
   - Columns: `id` (uuid, PK), `action` (text), `target_user_id` (uuid), `target_email` (text), `department_id` (text, nullable), `actor_id` (uuid, nullable), `details` (jsonb, nullable), `created_at` (timestamptz).
6. **`public.auth_rate_limits`**
   - Columns: `id` (uuid, PK), `identifier` (text, UNIQUE), `attempt_count` (integer, default 1), `first_attempt_at` (timestamptz), `last_attempt_at` (timestamptz), `locked_until` (timestamptz, nullable).
7. **`app_private.complaint_intake_rate_limits`**
   - Columns: `id` (uuid, PK), `ip_hash` (text), `request_hour` (timestamptz), `count` (integer), `created_at` (timestamptz).

### Group 2: Complaints & Citizen Privacy
8. **`public.complaints`**
   - Columns: `id` (uuid, PK), `citizen_id` (uuid, nullable, references `auth.users`), `reference_number` (text, UNIQUE), `incident_district` (text), `incident_locality` (text), `incident_public_location` (text), `title` (text), `description` (text), `sanitized_description` (text), `generated_heading` (text), `factual_summary` (text), `redaction_flags` (jsonb), `redaction_needs_review` (boolean, default false), `detected_language` (text), `status` (text: `submitted` | `under_review` | `assigned` | `accepted` | `in_progress` | `resolved` | `rejected`), `assigned_department_id` (text, references `departments`), `assigned_department_ids` (text[]), `predicted_department_id` (text), `prediction_confidence` (numeric), `is_multilabel` (boolean), `has_hazard` (boolean), `claim_code_hash` (text, nullable), `guest_tracking_hash` (text, nullable), `is_demonstration` (boolean, default false), `manual_priority` (text, nullable), `manual_priority_reason` (text, nullable), `manual_priority_by` (uuid, nullable), `manual_priority_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
9. **`public.complaint_citizen_private`**
   - Columns: `complaint_id` (uuid, PK, references `complaints` on delete cascade), `citizen_name` (text), `citizen_phone` (text), `citizen_email` (text), `residential_address` (text), `created_at` (timestamptz).
10. **`public.complaint_timeline_events`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints` on delete cascade), `status` (text), `title` (text), `title_urdu` (text), `description` (text), `description_urdu` (text), `actor_role` (text), `actor_id` (uuid, nullable), `created_at` (timestamptz).
11. **`public.complaint_issues`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `department_id` (text, references `departments`), `issue_type` (text), `evidence_span` (text, nullable), `confidence` (numeric), `status` (text), `status_notes` (text, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
12. **`public.complaint_geo_points`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `latitude` (numeric), `longitude` (numeric), `accuracy_m` (numeric, nullable), `created_at` (timestamptz).
13. **`public.complaint_evidence`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `storage_path` (text), `mime_type` (text), `file_size_bytes` (integer), `sha256_hash` (text), `created_at` (timestamptz).
14. **`public.complaint_notification_outbox`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `recipient_phone` (text, nullable), `recipient_email` (text, nullable), `channel` (text: `sms` | `email`), `message` (text), `status` (text: `pending` | `sent` | `failed`), `created_at` (timestamptz).
15. **`public.complaint_audit_logs`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `actor_id` (uuid), `action` (text), `metadata` (jsonb), `created_at` (timestamptz).

### Group 3: Work Orders & Field Operations (Active V16/V19 Subsystem)
16. **`public.department_work_orders`**
    - Columns: `id` (uuid, PK), `department_id` (text, references `departments`), `anchor_complaint_id` (uuid, references `complaints`), `case_label` (text), `officer_id` (uuid, references `auth.users`), `assigned_by` (uuid, references `auth.users`), `instructions` (text), `assigned_at` (timestamptz), `due_at` (timestamptz), `original_due_at` (timestamptz), `started_at` (timestamptz, nullable), `status` (text: `assigned` | `in_progress` | `pending_review` | `verified` | `returned`), `assigned_duration_hours` (integer, default 48), `effective_deadline_at` (timestamptz, nullable), `rejection_reason` (text, nullable), `gps_latitude` (numeric, nullable), `gps_longitude` (numeric, nullable), `gps_accuracy_m` (numeric, nullable), `gps_distance_m` (numeric, nullable), `gps_verified` (boolean, default false), `gps_exception_review` (boolean, default false), `evidence_integrity_status` (text, nullable), `location_verification_id` (text, nullable), `extension_requested_due_at` (timestamptz, nullable), `extension_reason` (text, nullable), `reviewed_at` (timestamptz, nullable), `review_note` (text, nullable), `citizen_dispute_pending` (boolean, default false), `created_at` (timestamptz), `updated_at` (timestamptz).
17. **`public.department_work_order_reports`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders` on delete cascade), `complaint_id` (uuid, references `complaints`), `is_anchor` (boolean, default false), `attached_by` (uuid), `attached_at` (timestamptz).
18. **`public.department_work_evidence`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `storage_path` (text), `before_storage_path` (text, nullable), `location_result` (text), `original_distance_m` (numeric, nullable), `accuracy_m` (numeric), `duplicate_warning` (boolean, default false), `sha256_hash` (text), `created_at` (timestamptz).
19. **`public.department_work_feedback`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `complaint_id` (uuid, references `complaints`), `rating` (integer: 1-5), `comment` (text, nullable), `created_at` (timestamptz).
20. **`public.department_work_closure_reviews`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `reviewed_by` (uuid), `decision` (text: `approved` | `returned`), `notes` (text, nullable), `reviewed_at` (timestamptz).
21. **`public.department_work_events`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `event_type` (text), `actor_id` (uuid), `payload` (jsonb), `created_at` (timestamptz).
22. **`public.v16_assignment_operations`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `operation_type` (text), `idempotency_key` (text, UNIQUE), `created_at` (timestamptz).
23. **`public.work_order_deadline_history`**
    - Columns: `id` (uuid, PK), `order_id` (uuid, references `department_work_orders`), `department_id` (text), `previous_deadline` (timestamptz), `extended_deadline` (timestamptz), `additional_hours` (integer), `reason` (text), `authorized_by` (uuid), `created_at` (timestamptz).

### Group 4: Staff Operations & Personnel Management (V19 Subsystem)
24. **`public.staff_notifications`**
    - Columns: `id` (uuid, PK), `user_id` (uuid, nullable), `department_id` (text), `title` (text), `message` (text), `notification_type` (text: `general` | `assignment` | `warning` | `deadline` | `verification` | `system`), `is_read` (boolean, default false), `link_url` (text, nullable), `created_at` (timestamptz).
25. **`public.officer_warnings`**
    - Columns: `id` (uuid, PK), `officer_id` (uuid), `department_id` (text), `issued_by` (uuid), `reason` (text), `severity` (text: `advisory` | `formal` | `final`), `issued_at` (timestamptz).
26. **`public.officer_activity_heartbeats`**
    - Columns: `id` (uuid, PK), `officer_id` (uuid), `department_id` (text), `last_active_at` (timestamptz), `active_view` (text).
27. **`public.officer_ranking_events`**
    - Columns: `id` (uuid, PK), `officer_id` (uuid), `order_id` (uuid, nullable), `department_id` (text), `event_type` (text), `points_delta` (integer), `notes` (text, nullable), `created_at` (timestamptz).
28. **`public.officer_profile_details`**
    - Columns: `user_id` (uuid, PK, references `auth.users`), `department_id` (text, references `departments`), `full_name` (text), `employee_id` (text, UNIQUE), `official_email` (text), `phone_masked` (text, nullable), `cnic_masked` (text, nullable), `cnic_hash` (text, nullable), `profile_photo_storage_path` (text, nullable), `approval_status` (text: `photograph_required` | `awaiting_approval` | `approved` | `retake_required`), `rejection_reason` (text, nullable), `reviewed_by` (uuid, nullable), `reviewed_at` (timestamptz, nullable), `submitted_at` (timestamptz, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).

### Group 5: Legacy & Shared Review Tables
29. **`public.incident_cases`** (Legacy V5 Desk Model)
    - Columns: `id` (uuid, PK), `department_id` (text), `case_number` (text), `primary_category` (text), `status` (text), `created_at` (timestamptz).
30. **`public.incident_case_reports`** (Legacy V5 Desk Model)
    - Columns: `id` (uuid, PK), `case_id` (uuid), `complaint_id` (uuid), `created_at` (timestamptz).
31. **`public.incident_case_events`** (Legacy V5 Desk Model)
    - Columns: `id` (uuid, PK), `case_id` (uuid), `event_type` (text), `created_at` (timestamptz).
32. **`public.case_batch_operations`** (Legacy V5 Desk Model)
    - Columns: `id` (uuid, PK), `department_id` (text), `batch_id` (text), `created_at` (timestamptz).
33. **`public.staff_batch_acceptance_requests`** (Legacy V13.16.2 Model)
    - Columns: `id` (uuid, PK), `batch_id` (text, UNIQUE), `department_id` (text), `accepted_count` (integer), `created_at` (timestamptz).
34. **`public.ai_classification_reviews`**
    - Columns: `id` (uuid, PK), `complaint_id` (uuid, references `complaints`), `department_id` (text), `flagged_by` (uuid), `suggested_department_id` (text), `reason` (text), `status` (text: `pending` | `approved` | `rejected`), `reviewed_by` (uuid, nullable), `reviewed_at` (timestamptz, nullable), `created_at` (timestamptz).

---

## 3. Schema Conflicts & Duplications

1. **Dual Work Order / Incident Case Redundancy:**
   - In `20261123000000_case_operations_desk_v5.sql`, tables `incident_cases` and `incident_case_reports` were created.
   - In `20261203000000_v13_18_verified_department_work_orders.sql`, tables `department_work_orders` and `department_work_order_reports` were created.
   - **Resolution for V23:** Deprecate `incident_cases` and `incident_case_reports`. The frontend components in `src/features/department/components/v19/` and service `fieldOperations.ts` strictly use `department_work_orders`.
2. **Missing Constraints on Storage Paths:**
   - `complaint_evidence.storage_path`, `department_work_evidence.storage_path`, and `officer_profile_details.profile_photo_storage_path` store text paths into Supabase Storage buckets, but do not have check constraints ensuring proper folder prefix isolation (`<complaint_id>/...` or `<order_id>/...`).
3. **Array vs. Relational Multi-Department Mapping:**
   - `complaints` contains `assigned_department_ids text[]` (array).
   - Simultaneously, `complaint_issues` stores individual issue rows per department (`complaint_id`, `department_id`, `issue_type`).
   - In V23, these must be synchronized via a trigger or unified query view.

---

## 4. Complete Stored Procedure / RPC Inventory

```
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| Function Name                     | Security Context  | Parameters, Logic & Target Tables                                                 |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| is_main_admin                     | SECURITY DEFINER  | (p_user_id uuid) -> boolean; Checks profiles.role = 'main_admin'.                |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| get_active_staff_department       | SECURITY DEFINER  | (p_user_id uuid) -> text; Returns department_id from active membership.           |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v1318_is_department_head          | SECURITY DEFINER  | (p_department text) -> boolean; Checks if auth.uid() is active head of department|
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_staff_operational_access      | SECURITY DEFINER  | (p_department text, p_required_role text) -> boolean; Role-based access validator|
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_resolve_staff_login_email     | SECURITY DEFINER  | (p_identifier text, p_department text) -> text; Resolves username/employee ID     |
|                                   |                   | to official work email for Supabase Auth sign-in.                                 |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_department_officers           | SECURITY DEFINER  | (p_department text) -> table; Returns active officers with workload metrics.      |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_find_candidate_orders         | SECURITY DEFINER  | (p_department, p_complaint_id, p_radius_m, p_include_uncertain) -> json;          |
|                                   |                   | Finds existing work orders within radius matching issue category.                 |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_create_work_order_with_       | SECURITY DEFINER  | (p_department, p_complaint_id, p_officer, p_due, p_instructions, p_case_label,   |
| advisory                          |                   |  p_idempotency_key, p_expected_candidates) -> json; Atomic order creation.       |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_attach_report_to_work_order   | SECURITY DEFINER  | (p_department, p_order_id, p_complaint_id, p_idempotency_key, p_reason) -> json;  |
|                                   |                   | Links secondary complaint report to anchor work order.                            |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_detach_report_from_work_order | SECURITY DEFINER  | (p_department, p_order_id, p_complaint_id, p_reason) -> void;                     |
|                                   |                   | Removes secondary complaint report from cluster.                                  |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v16_reassign_work_order_officer   | SECURITY DEFINER  | (p_department, p_order_id, p_new_officer, p_reason) -> void;                      |
|                                   |                   | Reassigns active work order to another department officer.                        |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_start_work_order              | SECURITY DEFINER  | (p_order_id uuid) -> void; Transitions status from assigned to in_progress.       |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_submit_work_completion        | SECURITY DEFINER  | (p_order_id, p_report_id, p_lat, p_lon, p_acc_m, p_dist_m, p_verified,            |
|                                   |                   |  p_integrity_status, p_loc_verif_id) -> void; Submits resolution for HOD review. |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_approve_resolution            | SECURITY DEFINER  | (p_order_id uuid) -> void; Verifies work order, resolves linked complaints,       |
|                                   |                   | awards ranking points to officer.                                                 |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_return_correction             | SECURITY DEFINER  | (p_order_id uuid, p_reason text) -> void; Returns order for rework,               |
|                                   |                   | applies ranking penalty to officer.                                               |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_extend_deadline               | SECURITY DEFINER  | (p_order_id uuid, p_additional_hours int, p_reason text) -> void;                 |
|                                   |                   | Extends deadline, updates effective_deadline_at, writes history record.           |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_reject_department_complaint   | SECURITY DEFINER  | (p_complaint_id uuid, p_reason text) -> void; Closes non-actionable complaint.    |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_issue_warning                 | SECURITY DEFINER  | (p_officer_id uuid, p_severity text, p_reason text) -> void; Records staff warning|
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| v19_save_officer_profile          | SECURITY DEFINER  | (p_details jsonb) -> void; Updates officer profile photo path & details.          |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| get_guest_complaint_status        | SECURITY DEFINER  | (p_tracking_hash text) -> json; Returns sanitized timeline & status for 24-digit  |
|                                   |                   | tracking without exposing citizen contact PII.                                    |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
| claim_guest_complaint             | SECURITY DEFINER  | (p_reference_number text, p_claim_code_hash text) -> json; Links guest complaint  |
|                                   |                   | to authenticated citizen account.                                                 |
+-----------------------------------+-------------------+-----------------------------------------------------------------------------------+
```

---

## 5. Row-Level Security (RLS) Policy Audit

```
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| Table Name                        | RLS Status    | Active Policies & Enforcement Mechanism                                           |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.departments                | ENABLED       | SELECT: Public (anyone can read active departments).                               |
|                                   |               | INSERT/UPDATE/DELETE: Service Role only.                                          |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.profiles                   | ENABLED       | SELECT: Own profile (auth.uid() = id) or Main Admin.                              |
|                                   |               | UPDATE: Own profile (display name only). Role escalation forbidden.               |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.department_memberships     | ENABLED       | SELECT: Own membership or HOD for own department members.                         |
|                                   |               | INSERT/UPDATE: Main Admin or HOD via Edge Functions.                              |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.complaints                 | ENABLED       | SELECT: Citizen sees own complaints (citizen_id = auth.uid()).                    |
|                                   |               | Staff sees complaints assigned to their department. Direct public SELECT revoked. |
|                                   |               | INSERT/UPDATE: Revoked from anon/authenticated; strictly via RPC / Edge Function. |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.complaint_citizen_private  | ENABLED       | SELECT: STRICT! Only citizen owner (auth.uid() = citizen_id).                      |
|                                   |               | ALL STAFF (HOD & Officer) REVOKED. Staff cannot query contact PII directly.       |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.department_work_orders     | ENABLED       | SELECT/UPDATE: Department staff belonging to order's department.                  |
|                                   |               | Officer can only update assigned orders via v19_* RPCs.                           |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.complaint_evidence         | ENABLED       | SELECT: Citizen owner or assigned department staff.                               |
|                                   |               | INSERT: Via upload-complaint-photo Edge Function.                                 |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
| public.department_work_evidence   | ENABLED       | SELECT: Department staff or citizen owner of anchor complaint after resolution.   |
|                                   |               | INSERT: Via upload-department-work-proof Edge Function.                           |
+-----------------------------------+---------------+-----------------------------------------------------------------------------------+
```

---

## 6. Proposed Unified Relational Schema for V23

To resolve table redundancies (`incident_cases` vs `department_work_orders`) and prepare the database for production multi-browser integration, the V23 consolidated schema architecture is:

```
                           +----------------------+
                           |     auth.users       |
                           +----------------------+
                                      |
                                      +------------------------------------+
                                      |                                    |
                                      v (1:1)                              v (1:N)
+--------------------+     +----------------------+              +----------------------+
|    departments     | <-- |       profiles       |              |   citizen_private    |
+--------------------+     +----------------------+              +----------------------+
          |                           |                                    |
          | (1:N)                     v (1:N)                              | (1:1 cascade)
          |                +----------------------+                        |
          +--------------> |department_memberships|                        |
          |                +----------------------+                        v
          |                           |                          +----------------------+
          |                           v                          |      complaints      |
          |                +----------------------+              +----------------------+
          |                |officer_profile_detail|                        |
          |                +----------------------+                        | (1:N)
          |                                                                +---------------------+
          v (1:N)                                                          |                     |
+----------------------+                                                   v                     v
|department_work_orders|<---------------------------------------- +----------------+  +-----------------+
+----------------------+ (anchor_complaint_id)                    |complaint_issues|  |complaint_evidenc|
          |                                                       +----------------+  +-----------------+
          +-----------------------------+
          | (1:N)                       | (1:N)
          v                             v
+----------------------+      +----------------------+
|work_order_reports    |      |department_work_evid  |
+----------------------+      +----------------------+
```
