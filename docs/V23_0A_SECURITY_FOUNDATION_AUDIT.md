# AWAAZ-E-AWAM (آوازِ عوام)
## V23.0A Security Foundation, Data Privacy & Authorization Audit

**Project:** Roman Urdu Multi-Department Civic Complaint Classifier & Resolution Platform  
**Audit Milestone:** V23.0A — Backend Architecture & Integration Audit  
**Date of Audit:** 28 November 2026  
**Auditor Roles:** Principal Application Security Architect, Authentication Specialist, Security Auditor  
**Authorized Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Governing Security Principle:** "Verify citizen ownership, department isolation, and private-data redaction at the server boundary. Browser storage and route guards do not establish authorization."

---

## 1. Server-Side Security Boundary Enforcement

The fundamental tenet of Awaaz-e-Awam is that the client application (browser) is an **untrusted environment**. Any check performed purely in JavaScript (route guards, local component state, form validation) provides UI convenience, but zero actual security.

```
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Security Domain & Control         | Client-Side Check     | Server-Side Boundary  | Boundary Evaluation & Vulnerability Analysis      |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Citizen PII Isolation             | UI strips contact     | PostgreSQL RLS &      | SECURE: Direct SELECT on complaint_citizen_       |
| (Name, Phone, Address, CNIC)      | fields from staff view| Table Grant Revocation| private revoked from authenticated & anon.        |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Department Isolation              | Dropdown & CSS theme  | PostgreSQL RLS on     | SECURE: v16_staff_operational_access checks       |
| (Staff cross-department access)   | filters               | department_work_orders| user's active membership department_id in DB.     |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Role Hierarchy & Escalation       | Route guards          | profiles.role check in| SECURE: profiles.role cannot be updated by user;  |
| (Citizen -> Officer -> HOD)       | (<DepartmentRoleBound>| Security Definer RPCs | HOD status verified via department_memberships.   |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Sindh Geo Eligibility             | verifySindhLocation() | Deno Edge Function    | PARTIAL: Server validates coordinates against     |
| (Boundary coordinates check)      | in browser            | ray-casting polygon   | polygon, but client provides the coordinates.     |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Field Officer GPS Proximity       | haversineDistance()   | v19_submit_work_      | ATTENTION NEEDED: Current v19 submit RPC records  |
| (Resolution on-site verification) | in browser resolution | completion parameters | client-provided lat/lon; server must re-verify.   |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| Work Order Deadline Enforcement   | TrustedClock.tsx      | Monotonic DB clock    | SECURE: v1318_monotonic_evidence_timestamps       |
| (SLA & overdue calculations)      | in UI                 | NOW() in PostgreSQL   | ensures client clock manipulation has no effect.  |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
| First-Login OTP Verification      | OtpInput.tsx          | Missing Live Gateway  | SIMULATED: Frontend enforces 6-digit input, but   |
| (Staff account onboarding)        | component             | for SMTP/SMS token    | server lacks transactional delivery gateway.      |
+-----------------------------------+-----------------------+-----------------------+---------------------------------------------------+
```

---

## 2. Row Level Security (RLS) Deep-Dive

### 2.1 Citizen Privacy Isolation
- In migration `20261114000000_core_complaints_and_privacy.sql`, `complaint_citizen_private` was created as an isolated table with a 1:1 foreign key to `complaints`.
- In migration `20261115000001_revoke_legacy_client_grants.sql` and `20261126000000_close_privileged_intake_and_repair_privacy.sql`, all direct permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on `complaint_citizen_private` were **explicitly revoked** from `anon` and `authenticated` roles.
- **Verification Result:** An attacker possessing an authenticated HOD or Field Officer JWT **cannot query citizen contact details** through Supabase PostgREST endpoints. The query returns HTTP 403 / empty set. Intake occurs strictly via the `submit-classified-complaint` Edge Function using `SUPABASE_SERVICE_ROLE_KEY`.

### 2.2 Departmental Isolation
- In migration `20261113000000_staff_access_management.sql` and `20261206000000_v16_incident_assignment_and_staff.sql`:
  - `v1318_is_department_head(p_department)` queries `department_memberships` for `user_id = auth.uid()` and `status = 'active'` and `staff_role = 'head'`.
  - `v16_staff_operational_access(p_department, p_role)` verifies that the calling user belongs to the target department.
- **Verification Result:** An HOD of `kelectric` cannot dispatch work orders, extend deadlines, or approve resolutions for `kwsc` or `kmc`. The RPC immediately raises an exception: `"Unauthorized department head action."`

### 2.3 Guest Complaint Tracking & Credential Separation
- In `20261118000000_guest_complaint_submission_and_claiming.sql` and `20261201000000_v13_13_hide_guest_claim_credentials.sql`:
  - Raw claim codes and tracking numbers are **never stored** in the database.
  - The database only stores `claim_code_hash` (SHA-256) and `guest_tracking_hash` (SHA-256).
  - The client query `COMPLAINT_SELECT_QUERY` explicitly excludes these columns from the frontend select list.
- **Verification Result:** Possession of a guest tracking number allows tracking of that specific complaint via `get_guest_complaint_status(p_tracking_hash)`. It does not expose other complaints or permit claiming. Claiming requires the high-entropy 14-character claim code (`CLM-XXXX-XXXX-XXXX`).

---

## 3. Role Separation & Privilege Escalation Defenses

```
                 +-------------------+
                 |    Main Admin     |  (System-wide provisioning & AI review)
                 +-------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
+-----------------------+     +-----------------------+
|  Department Head      |     |  Citizen User         |
|  (HOD - Dept Scoped)  |     |  (Personal Complaints)|
+-----------------------+     +-----------------------+
            |                             |
            v                             v
+-----------------------+     +-----------------------+
|  Field Officer        |     |  Guest Citizen        |
|  (Assigned Cases Only)|     |  (24-digit Hash Only) |
+-----------------------+     +-----------------------+
```

1. **Role Storage:**
   The user's baseline role is stored in `public.profiles.role` (`'main_admin'`, `'department_staff'`, `'citizen'`).
2. **Immutability of Role via Client:**
   The RLS policy on `public.profiles` allows users to update their own `full_name`, but contains `WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()))`. A user cannot alter their role in PostgreSQL.
3. **Department Staff Roles:**
   Within `department_memberships`, staff are segregated into `staff_role = 'head'` or `'officer'`. Edge function `manage-department-officers` permits HODs to create officer memberships, but requires `aal = 'aal2'` (MFA verification) in the caller's JWT claims.

---

## 4. GPS Anti-Tampering & Physical Proximity Evaluation

### 4.1 Citizen Intake GPS
- **Capture:** HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`).
- **Validation:** Server-side ray-casting polygon in `_shared/sindh-geo.ts` validates that the coordinates reside inside the official Sindh geographic boundary.
- **Attack Vector:** An attacker can mock browser coordinates to any point in Sindh.
- **Mitigation:** The location is used for departmental jurisdiction and field routing; it does not grant administrative privileges.

### 4.2 Officer Fieldwork Resolution GPS
- **Capture:** Captured during resolution submission in `WorkResolutionForm.tsx`.
- **Validation:** `haversineDistanceMeters()` computes distance to complaint anchor pin. If $\le 500$m, marks verified.
- **Current Vulnerability:**
  Because the calculation is performed on the client and passed as parameters (`p_lat`, `p_lon`, `p_verified`, `p_dist_m`) to RPC `v19_submit_work_completion`, a rogue client could technically pass forged coordinates.
- **V23 Hardening Requirement:**
  The PostgreSQL RPC `v19_submit_work_completion` must independently re-compute the Haversine distance using the anchor complaint's coordinates stored in `complaint_geo_points` or `complaints`, rejecting or flagging any submission where the calculated distance contradicts the client assertion.

---

## 5. Authentication, First-Login OTP & Token Storage

### 5.1 Temporary Credentials & Rotation
- When an HOD provisions an officer via `manage-department-officers`, an 18-character temporary access key is generated containing uppercase, lowercase, numbers, and symbols.
- The officer is created with `must_change_password = true`.
- On first login, `DepartmentAuthContext` detects `mustChangePassword` and displays password reset controls.

### 5.2 First-Login Email OTP Status
- In Phase V22.0, the requirement for mandatory first-login OTP was introduced.
- **Audit Finding:** The frontend UI component `OtpInput.tsx` is implemented with clean styling and auto-focus mechanics. However, the backend Supabase Auth email OTP delivery or SMS service is currently in **simulation mode** (`isLocalDemoStaffRole()` or fallback). A real SMTP provider (e.g., free tier Brevo / SendGrid / Supabase built-in SMTP) must be configured in Phase V23.

### 5.3 Token Storage & Session Management
- **Citizen Session:** Stored in Supabase Auth client (default `localStorage` under `sb-<project>-auth-token`).
- **Department Staff Session:** Stored in `sessionStorage` under `awaaz_staff_session_v2`.
  - Closing the browser tab destroys the department staff session.
  - Revocation is checked actively on load and session change via `staffAuthService.checkCurrentStaffAccess(userId)`.
  - If membership status is revoked in DB, `signOut()` is executed immediately.
