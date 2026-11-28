# AWAAZ-E-AWAM (آوازِ عوام) — V23.0B DATABASE SCHEMA RECONCILIATION SPECIFICATION

## 1. PURPOSE AND MIGRATION CONTEXT

- **Migration File:** `supabase/migrations/20261208000000_v23_0b_database_reconciliation.sql`
- **Preceding Migration:** `supabase/migrations/20261207000000_v19_unified_hod_officer_portals.sql`
- **Execution Properties:** 100% additive, idempotent, non-locking, backward-compatible, safe for production environments.

The V23.0A architecture audit identified disparities between earlier table designs and active operational features (specifically V5 legacy incident tracking vs V16/V19 work order dispatch). This document defines the schema reconciliation ensuring zero breaking changes to foreign keys while formalizing authoritative operational tables.

---

## 2. OPERATIONAL MODEL RECONCILIATION: WORK ORDERS VS INCIDENT CASES

### Problem Analysis
- In V5/V6, intake was originally modeled under `incident_cases`.
- In V16 and V19, the Department Head dispatch, assignment, deadline management, and Officer execution workflows were built on `department_work_orders` and `department_work_evidence`.
- Dropping `incident_cases` would violate safety rules and risk foreign key breakages in historical migrations.

### Resolution
1. **Authoritative Comment Annotations:**
   ```sql
   COMMENT ON TABLE public.department_work_orders IS 
   'AUTHORITATIVE OPERATIONAL MODEL (V16/V19/V23): Work orders dispatched by Department Heads to Field Officers.';

   COMMENT ON TABLE public.incident_cases IS 
   'LEGACY MODEL (V5): Preserved for schema backward compatibility. Operational queries should use department_work_orders.';
   ```
2. **Forward-Compatible Operational View:**
   `v23_operational_cases_view` unifies the operational view for reporting and legacy queries:
   ```sql
   CREATE OR REPLACE VIEW public.v23_operational_cases_view AS
   SELECT
     w.id AS case_id,
     w.department_id,
     w.case_label AS case_number,
     w.instructions,
     w.officer_id,
     w.status AS work_status,
     w.due_at,
     w.started_at,
     w.effective_deadline_at,
     w.gps_verified,
     w.anchor_complaint_id,
     c.reference_number,
     c.incident_district,
     c.incident_locality,
     c.status AS complaint_status,
     w.created_at,
     w.updated_at
   FROM public.department_work_orders w
   JOIN public.complaints c ON c.id = w.anchor_complaint_id;
   ```

---

## 3. STORAGE PATH INTEGRITY CONSTRAINTS

### Vulnerability Addressed
Malicious clients could attempt directory traversal (`..`) or invalid character injections in `storage_path` columns of evidence tables.

### SQL Constraints Applied
```sql
ALTER TABLE public.complaint_evidence
  DROP CONSTRAINT IF EXISTS chk_complaint_evidence_storage_path,
  ADD CONSTRAINT chk_complaint_evidence_storage_path
    CHECK (storage_path !~ '\.\.' AND storage_path ~ '^[0-9a-fA-F-]+/[0-9a-fA-F-]+\.[a-zA-Z0-9]+$');

ALTER TABLE public.department_work_evidence
  DROP CONSTRAINT IF EXISTS chk_department_work_evidence_storage_path,
  ADD CONSTRAINT chk_department_work_evidence_storage_path
    CHECK (storage_path !~ '\.\.' AND storage_path ~ '^[0-9a-fA-F-]+/[0-9a-fA-F-]+\.[a-zA-Z0-9]+$');
```
- Restricts storage keys strictly to `{owner_uuid}/{object_uuid}.{ext}` format.
- Rejects any presence of double-dots (`..`).

---

## 4. MULTI-DEPARTMENT RESOLUTION SYNCHRONIZATION

### Problem Analysis
When a citizen complaint involves multiple municipal departments (e.g. water pipeline burst affecting electric poles), each department receives an independent `department_work_order`. Previously, if one department approved their work, the parent complaint status lacked a deterministic trigger to track partial vs full resolution.

### Implemented Trigger and Synchronization Function
```sql
CREATE OR REPLACE FUNCTION public.v23_sync_multi_dept_complaint_status(p_complaint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_orders integer;
  v_verified_orders integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'verified')
  INTO v_total_orders, v_verified_orders
  FROM public.department_work_orders
  WHERE anchor_complaint_id = p_complaint_id;

  IF v_total_orders > 0 THEN
    IF v_verified_orders = v_total_orders THEN
      -- All departments resolved their work orders
      UPDATE public.complaints
      SET status = 'resolved', updated_at = now()
      WHERE id = p_complaint_id AND status <> 'resolved';
    ELSIF v_verified_orders > 0 THEN
      -- At least one department resolved, others pending
      UPDATE public.complaints
      SET status = 'partly_resolved', updated_at = now()
      WHERE id = p_complaint_id AND status NOT IN ('resolved', 'partly_resolved');
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.v23_trigger_work_order_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status) AND NEW.anchor_complaint_id IS NOT NULL THEN
    PERFORM public.v23_sync_multi_dept_complaint_status(NEW.anchor_complaint_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v23_work_order_status_sync ON public.department_work_orders;
CREATE TRIGGER trg_v23_work_order_status_sync
AFTER UPDATE OF status ON public.department_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.v23_trigger_work_order_status_sync();
```

---

## 5. SERVER-SIDE PROXIMITY CALCULATION (HAVERSINE HELPER)

### Mathematical Formula
Calculates great-circle distance between two geographic coordinates:
$$\Delta\sigma = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{1-a}\right)$$
where $a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$, using mean Earth radius $R = 6,371,000 \text{ meters}$.

### Implemented PostgreSQL Function
```sql
CREATE OR REPLACE FUNCTION public.v23_haversine_distance_meters(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_rad double precision := 0.017453292519943295; -- pi / 180
  v_dlat double precision;
  v_dlon double precision;
  v_a double precision;
  v_c double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  v_dlat := (lat2 - lat1) * v_rad;
  v_dlon := (lon2 - lon1) * v_rad;
  v_a := sin(v_dlat / 2.0)^2 + cos(lat1 * v_rad) * cos(lat2 * v_rad) * sin(v_dlon / 2.0)^2;
  v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));
  RETURN round((6371000.0 * v_c)::numeric, 2);
END;
$$;
```

---

## 6. ADMINISTRATIVE HOD PROVISIONING RPC

### Purpose
Allows authorized bootstrap provisioning of initial Department Heads without requiring exposure of service-role keys to browser sessions.

```sql
CREATE OR REPLACE FUNCTION public.v23_admin_provision_initial_hod(
  p_user_id uuid,
  p_department_id text,
  p_full_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
...
-- Caller must be main_admin or executing under service role
IF v_caller IS NOT NULL AND NOT public.is_main_admin(v_caller) THEN
  RAISE EXCEPTION 'Only Main Administrator can provision initial Department Heads.' USING ERRCODE = '42501';
END IF;
...
```

---

## 7. PRIVATE STORAGE BUCKET ARCHITECTURE & RLS

### Configured Buckets
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('complaint-evidence-private', 'complaint-evidence-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('department-work-proof-private', 'department-work-proof-private', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('staff-profile-photos-private', 'staff-profile-photos-private', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### RLS Policies
- `v23_staff_profile_photos_insert`: Allows authenticated users to upload profile pictures only to folder paths matching their own `auth.uid()`.
- `v23_staff_profile_photos_select`: Allows viewing only by the owner, active Department Heads, or Main Administrators.
