# AWAAZ-E-AWAM — PHASE V19 BACKEND MIGRATIONS & SECURITY REPORT

## 1. Migration Summary (`20261207000000_v19_unified_hod_officer_portals.sql`)

The V19 migration expands the PostgreSQL schema with zero breaking changes to existing V16 tables, adding dedicated columns for commencement-based deadlines, GPS proximity auditing, and communications ledgers.

### 1.1 `department_work_orders` Table Extensions
```sql
ALTER TABLE public.department_work_orders
  ADD COLUMN IF NOT EXISTS assigned_duration_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS effective_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS gps_latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS gps_longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS gps_accuracy_m numeric(6, 2),
  ADD COLUMN IF NOT EXISTS gps_distance_m numeric(8, 2),
  ADD COLUMN IF NOT EXISTS gps_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS evidence_integrity_status text NOT NULL DEFAULT 'verified';
```

### 1.2 Supporting Operational Tables
1. **`staff_notifications`**: Dedicated ledger for system, assignment, warning, and verification notices across department personnel. Includes foreign keys to `auth.users(id)` and `departments(id)`, with boolean read status indexing.
2. **`officer_warnings`**: Immutable audit log of formal and advisory supervisory notices issued by department heads to field officers with severity levels (`advisory`, `formal`, `final`).
3. **`officer_activity_heartbeats`**: Live presence and active workspace tracking for field staff.

---

## 2. PostgreSQL Stored Procedures (RPCs)

All V19 RPCs are marked `SECURITY DEFINER` with fixed `search_path = ''` to prevent search-path injection vulnerabilities.

### 2.1 `v19_start_work_order(p_order_id UUID)`
- **Purpose:** Initializes commencement-based deadline. The timer only begins when the officer acknowledges the field dispatch.
- **Logic:**
  - Validates caller is assigned officer or active department head.
  - Sets `started_at = now()`.
  - Sets `effective_deadline_at = now() + (assigned_duration_hours || ' hours')::interval`.
  - Dispatches an automated notification to the department head.

### 2.2 `v19_submit_work_completion(p_order_id UUID, p_storage_path TEXT, p_lat NUMERIC, p_lng NUMERIC, p_accuracy NUMERIC)`
- **Purpose:** Records on-site evidence and verifies 30m GPS proximity.
- **Logic:**
  - Computes Haversine distance in meters against linked citizen complaint coordinates.
  - If `distance <= 30.0` meters, sets `gps_verified = true` and location result `'near'`; otherwise `'needs_review'`.
  - Sets order status to `'pending_review'`.
  - Queues item for HOD supervisory verification.

### 2.3 `v19_approve_resolution(p_order_id UUID)`
- **Purpose:** HOD grants supervisory approval of completed fieldwork.
- **Logic:**
  - Enforces caller is active HOD of the department.
  - Updates order status to `'verified'`.
  - Cascades resolution to parent complaint (`complaints.status = 'resolved'`) and all attached linked reports.
  - Notifies assigned officer of successful closure.

### 2.4 `v19_return_correction(p_order_id UUID, p_reason TEXT, p_correction_hours INT)`
- **Purpose:** Returns inadequate field evidence for on-site correction.
- **Logic:**
  - Requires mandatory non-empty justification string.
  - Updates order status to `'returned'`.
  - Extends `effective_deadline_at` by penalty correction hours (default 24h).
  - Issues formal notification to assigned officer.

### 2.5 `v19_reject_department_complaint(p_complaint_id UUID, p_reason TEXT)`
- **Purpose:** Rejects out-of-jurisdiction or invalid complaints from department unassigned queue.
- **Logic:**
  - Enforces HOD role authorization.
  - Records rejection reason and updates complaint status to `'rejected'`.

---

## 3. Security Boundary & Anti-Leak Safeguards

1. **Server-Side Boundary Enforcement:** All department access, complaint assignment, evidence review, and status transitions verify caller membership and role in PostgreSQL. Route guards are purely ergonomic.
2. **Dynamic Anti-Leak Watermark (`WatermarkOverlay.tsx`):**
   - Renders 18 repeating diagonal tiles across all staff views.
   - Embeds authenticated department code, staff username, and high-precision Asia/Karachi (PKT) timestamp.
   - Uses `pointer-events: none` and `user-select: none` to avoid interfering with interface interactions.
3. **Print Concealment:** CSS print rules (`@media print`) ensure confidential watermark identity is visibly stamped onto printed reports with non-reproducible optical security.
4. **Offline Demo Fallback ($0 Budget):** `FieldOperationsService` includes full client-side emulation of all V19 RPCs for local testing and developer preview without requiring live cloud databases.
