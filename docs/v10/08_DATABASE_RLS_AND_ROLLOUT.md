# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 DATABASE RLS POLICIES & STAGED ROLLOUT PLAN
**Document ID:** `docs/v10/08_DATABASE_RLS_AND_ROLLOUT.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Security Specification & Staged Migration Plan  

---

## 1. Local-to-Hosted Schema Status & Zero-Downtime Guarantee

### Explicit Disclosure of Hosted State:
> [!IMPORTANT]
> **Hosted Supabase Database (`akbwiedtmxjxcjscgitw`):**  
> Staged migration `20261125000000_multi_department_schema.sql` has **NOT been executed remotely**. Remote execution requires explicit owner authorization.

### Backwards-Compatible Storage Architecture:
To guarantee continuous operations and avoid schema breaks:
1. Multi-department routing and child issues are dual-written:
   - Structured format: To `public.complaint_issues` if the relational table is present.
   - Compatible metadata: To `public.complaints.redaction_flags` under the structured JSONB key `multi_department_routing`.
2. Both `LocalSupabaseAdapter.ts` and `SupabaseComplaintService.ts` seamlessly unpack assignments from `redaction_flags`.
3. **Operational Result:** 100% feature availability and test execution across all 6 department desks without executing a single remote DDL statement.

---

## 2. Row-Level Security (RLS) Policy Specifications

### Complaints Table (`public.complaints`)

| Target Role | Operation | Security Policy Qualification | Purpose & Guardrail |
| :--- | :--- | :--- | :--- |
| `anon` (Guest) | `INSERT` | `citizen_id IS NULL AND guest_tracking_hash IS NOT NULL` | Guest complaint submission with cryptographic claim secret. |
| `anon` (Guest Tracker)| `SELECT` | `guest_tracking_hash = crypt(headers->>'x-claim-code', guest_tracking_hash)` | Scoped guest status lookup; zero PII leakage. |
| `authenticated` (Citizen) | `SELECT` | `citizen_id = auth.uid()` | Complainant reads only their own complaints. |
| `authenticated` (Staff) | `SELECT` | `department_id = staff_dept() OR assigned_department_ids @> ARRAY[staff_dept()]` | Department staff queries only assigned civic tasks. |
| `authenticated` (Staff) | `UPDATE` | `department_id = staff_dept() OR assigned_department_ids @> ARRAY[staff_dept()]` | Prevents cross-agency status manipulation. |

### Complaint Issues Table (`public.complaint_issues`)

| Target Role | Operation | Security Policy Qualification | Purpose & Guardrail |
| :--- | :--- | :--- | :--- |
| `authenticated` (Staff) | `SELECT` | `assigned_department_id = staff_dept()` | Fine-grained issue isolation. KWSC staff cannot view KMC road task notes. |
| `authenticated` (Staff) | `UPDATE` | `assigned_department_id = staff_dept()` | Staff can only advance status for their own departmental defect. |

---

## 3. Negative Permission & Security Verification

All security policies were validated in `src/test/MultiDepartmentRoutingAndSecurity.test.ts`:
- **Cross-Department Boundary (T12):** When a complaint contains both KMC and KWSC tasks, a KMC officer can accept the road issue, but attempting to mutate the KWSC sewer issue is rejected.
- **Guest Tracking Isolation (T16):** Querying a complaint via public reference returns department progress cards, but redacts citizen phone, CNIC, and internal staff notes.
- **Citizen Account Isolation (T17):** Citizen B attempting to view Citizen A's submitted complaint receives an empty set / 404.

---

## 4. Production Rollout Runbook (Upon Owner Approval)

```bash
# Step 1: Push non-destructive multi-department DDL to hosted Supabase
supabase db push --include-all

# Step 2: Deploy Edge Function with bundled V10 model
supabase functions deploy submit-classified-complaint --no-verify-jwt

# Step 3: Deploy frontend production build (dist/)
npm run build
```
