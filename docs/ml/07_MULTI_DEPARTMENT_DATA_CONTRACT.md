# AWAAZ-E-AWAM (آوازِ عوام) — MULTI-DEPARTMENT DATA CONTRACT & STATE RECONCILIATION
**Document ID:** `docs/ml/07_MULTI_DEPARTMENT_DATA_CONTRACT.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Approved Architectural Contract  

---

## 1. Domain Entities & Invariants

Municipal operations in Karachi involve distinct agencies with autonomous operational lifecycles. Collapsing multiple defects into a single department ticket creates jurisdictional deadlocks where one agency cannot act on another's domain.

Awaaz-e-Awam formalizes three distinct entities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PARENT COMPLAINT ENTITY                         │
│  - reference_number: 'KHI-2026-XXXXXXXX' (Public Tracking Identifier)  │
│  - citizen_id / guest_tracking_hash: Ownership & tracking credentials  │
│  - sanitized_description, incident_locality, incident_district         │
│  - aggregate_status: Derived truthful composite state                  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ├─── 1 : N (Zero, One, or Multiple)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPLAINT ISSUE ENTITY                          │
│  - issue_id: Stable identifier ('iss-XXXXXXXX')                       │
│  - issue_type: Defect type (e.g., 'kmc.road_damage', 'kwsc.sewage')   │
│  - evidence_span: Extracted text justifying this issue                 │
│  - confidence: Calibrated sigmoid probability                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ├─── 1 : 1 (Per Department Agency)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DEPARTMENT ASSIGNMENT WORK ITEM                      │
│  - assignment_id: Authorized department task                          │
│  - department_id: 'kmc' | 'kwsc' | 'kelectric' | 'ssgc' | ...         │
│  - work_status: assigned ➔ accepted ➔ in_progress ➔ completed         │
│  - staff_actor_id: Municipal staff member handling ticket              │
└────────────────────────────────────────────────────────────────────────┘
```

### Invariants:
1. **Immutable Public Reference:** A citizen always receives exactly **one tracking reference** (e.g. `KHI-2026-A1B2C3D4`) regardless of whether the complaint contains 1, 2, or 3 issues.
2. **Autonomous Lifecycles:** When KMC resolves a pothole issue, K-Electric's live wire repair issue remains in its current status. One department can neither advance nor close another department's work item.
3. **Least-Privilege Isolation:** Department staff can only query, view, and mutate issues assigned to their authenticated agency.
4. **Transparent Citizen Rollup:** Citizen tracking surfaces a truthful aggregate status alongside child issue breakdowns without leaking internal officer identity.

---

## 2. Aggregate Status State Machine

The parent complaint aggregate status $S_{\text{aggregate}}$ is deterministically computed from the set of active child issue statuses $\{s_1, s_2, \dots, s_k\}$:

$$S_{\text{aggregate}} = f(\{s_1, s_2, \dots, s_k\})$$

### State Transition Truth Table:

| Child Issues Statuses $\{s_1, s_2, \dots, s_k\}$ | Derived Parent Status | Citizen Portal Display (English) | Citizen Portal Display (Urdu) |
|:---|:---:|:---|:---|
| All $s_i = \text{under\_review}$ | `under_review` | Awaiting Routing Review | جائزہ لیا جا رہا ہے |
| All $s_i = \text{assigned}$ | `assigned` | Forwarded to Departments | متعلقہ محکموں کو ارسال |
| Any $s_i = \text{accepted}$, no $s_i \in \{\text{in\_progress}, \text{completed}\}$ | `accepted` | Accepted by Department | محکمے نے قبول کر لی |
| Any $s_i = \text{in\_progress}$, not all completed | `in_progress` | Work In Progress | کام جاری ہے |
| Some $s_i = \text{completed}$, other $s_j \in \{\text{assigned}, \text{accepted}, \text{in\_progress}\}$ | `in_progress` *(Partly Resolved)* | Partially Resolved (Active) | جزوی طور پر حل شدہ (جاری) |
| All $s_i = \text{completed}$ | `resolved` | Fully Resolved | مکمل طور پر حل شدہ |
| All $s_i = \text{rejected}$ | `rejected` | Review Concluded (Unfeasible) | غیر متعلقہ یا مسترد |
| Some $s_i = \text{completed}$, others $s_j = \text{rejected}$ | `resolved` *(Partly Completed)* | Completed with Exceptions | استثنیٰ کے ساتھ مکمل |

---

## 3. Storage & Schema Migration Strategy

In strict adherence to project constraints prohibiting unauthorized public-hosted DDL migrations:
1. **Production-Safe Compatible Representation:**
   Multi-department assignments and child issues are serialized into `public.complaints.redaction_flags` under the structured key `multi_department_routing`:
   ```json
   {
     "is_multilabel": true,
     "has_hazard": true,
     "hazard_type": "electrical_water_critical_hazard",
     "assigned_department_ids": ["kelectric", "kwsc"],
     "issues": [
       {
         "id": "iss-kelectric-01",
         "department_id": "kelectric",
         "issue_type": "kelectric.fallen_wire_hazard",
         "confidence": 0.965,
         "status": "assigned"
       },
       {
         "id": "iss-kwsc-01",
         "department_id": "kwsc",
         "issue_type": "kwsc.sewage_overflow",
         "confidence": 0.912,
         "status": "assigned"
       }
     ]
   }
   ```
2. **Relational Entity Model (Staging / Future Migration):**
   A dedicated migration `20261122000000_multilabel_complaint_issues.sql` defines:
   - `public.complaint_issues (id, complaint_id, department_id, issue_type, status, confidence, evidence_span, created_at, updated_at)`
   - `public.department_issue_assignments (id, issue_id, department_id, status, staff_user_id, updated_at)`
   - Full RLS policies restricting department staff visibility strictly to `auth.uid()` matching department memberships.

---

## 4. Idempotency & Concurrency Guarantees

1. **Submission Deduplication:** Guest submissions generate deterministic hashes of citizen contact details and location. Replay attacks within 60 seconds return the existing reference number without spawning duplicate issues.
2. **Status Transition Concurrency:** All status mutations are executed through the `staff_update_complaint_status` RPC. Database row locks (`FOR UPDATE`) prevent race conditions between concurrent staff updates across different departments.
3. **Audit Immutability:** Every issue state transition appends an immutable timeline event to `public.complaint_timeline_events` recording timestamp, actor role, and previous/new status.

---
*End of Multi-Department Data Contract.*
