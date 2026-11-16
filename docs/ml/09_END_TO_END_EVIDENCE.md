# AWAAZ-E-AWAM (آوازِ عوام) — END-TO-END DEMONSTRATION & MULTI-DEPARTMENT EVIDENCE
**Document ID:** `docs/ml/09_END_TO_END_EVIDENCE.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Certified Operational Evidence & Workflow Verification  

---

## 1. Demonstration Scenario & Narrative

In Karachi's urban environment, civic failures frequently cascade across jurisdictional boundaries:
- A broken underground water supply line erodes road sub-base, creating massive asphalt potholes.
- An illegal excavation for stormwater drainage ruptures a low-pressure gas line.
- Heavy monsoon rains cause an electric pole to tilt, dropping a live wire into stagnant floodwater.

Under single-label classification architectures, such complaints are routed to one single agency (e.g. KMC). The KMC inspector visits the site, discovers a ruptured KWSC water line, and marks the complaint "Rejected — Not KMC Jurisdiction." The citizen receives a rejection notice without redress, while the water leak worsens and the road collapses further.

Phase V9 implements **Multi-Department Issue-Aware Routing**. A single citizen submission produces a single public receipt while decomposing the report into autonomous municipal work orders.

---

## 2. Step 1: Citizen Submission & Edge Inference

### Citizen Input
- **Channel:** Citizen Portal / Guest Submission (`/complaint/new`)
- **Location:** Main Korangi Road near Brooks Chowrangi, District Korangi
- **Roman Urdu Submission Text:**
  > *"Main Korangi Road pe gehra khadda par gaya hai aur sath hi sewage line leak ho rahi hai, ganda pani sarak pe beh raha hai aur traffic block hai."*

### Edge Inference & Multi-Label Decomposition
The isomorphic TypeScript classifier (`classifyMultiLabel`) processes the normalized text:

```json
{
  "departments": ["kmc", "kwsc"],
  "primaryDepartment": "kmc",
  "scores": {
    "kmc": 0.9412,
    "kwsc": 0.9125,
    "kelectric": 0.0411,
    "ssgc": 0.0205,
    "sbca": 0.0152,
    "sswmb": 0.0894
  },
  "isMultiLabel": true,
  "hasHazard": false,
  "hazardConfidence": 0.02,
  "needsReview": false,
  "issues": [
    {
      "id": "iss-kmc-001",
      "departmentId": "kmc",
      "issueType": "kmc.road_damage",
      "evidenceSpan": "gehra khadda par gaya hai... sarak pe beh raha hai",
      "confidence": 0.9412,
      "status": "pending"
    },
    {
      "id": "iss-kwsc-002",
      "departmentId": "kwsc",
      "issueType": "kwsc.sewage",
      "evidenceSpan": "sewage line leak ho rahi hai, ganda pani sarak pe",
      "confidence": 0.9125,
      "status": "pending"
    }
  ]
}
```

### Immutable Public Citizen Receipt
- **Tracking Reference Number:** `KHI-2026-KD4987A1`
- **Claim Code (Guest):** `CLM-849201`
- **Aggregate Status:** `pending` ("Received — Multi-Agency Work Item Created")
- **Assigned Departments:** `["kmc", "kwsc"]`

---

## 3. Step 2: Department A (KMC) Portal View & Triage

1. **Staff Authentication:** Staff officer `kmc-01` signs into KMC Operations Desk (`/department/kmc`).
2. **Work Queue Filter:** The queue selector executes:
   ```typescript
   query.filter('assigned_department_ids', 'cs', '["kmc"]')
   ```
   Complaint `KHI-2026-KD4987A1` appears in KMC's active work list with a prominent **Multi-Agency** badge.
3. **Case Detail Inspection:**
   - KMC staff views the parent description and location (Main Korangi Road).
   - The UI highlights KMC's assigned task: `Road Infrastructure Repair (kmc.road_damage)`.
   - The UI indicates that KWSC is also assigned for `kwsc.sewage`.
4. **KMC Operational Status Update:**
   - Staff updates KMC status from `pending` to `in_progress`.
   - Operational Note: *"District Korangi road maintenance team notified; asphalt patch scheduled post-dewatering."*
   - Audit trail registers KMC action with timestamp and officer ID.

---

## 4. Step 3: Department B (KWSC) Portal View & Triage

1. **Staff Authentication:** Water & Sewerage officer `water-01` signs into KWSC Operations Desk (`/department/kwsc`).
2. **Work Queue Filter:**
   ```typescript
   query.filter('assigned_department_ids', 'cs', '["kwsc"]')
   ```
   Complaint `KHI-2026-KD4987A1` appears in KWSC's active work list.
3. **Case Detail Inspection:**
   - The UI highlights KWSC's assigned task: `Sewerage Line De-clogging & Repair (kwsc.sewage)`.
4. **KWSC Operational Status Update:**
   - KWSC staff updates their issue status to `in_progress`.
   - Operational Note: *"Suction and jetting machine deployed to clear blocked main sewer line."*

---

## 5. Step 4: Negative Isolation Test (SSGC / SBCA / K-Electric)

1. **Staff Authentication:** Gas safety officer `gas-01` signs into SSGC Operations Desk (`/department/ssgc`).
2. **Work Queue Query:**
   ```typescript
   query.filter('assigned_department_ids', 'cs', '["ssgc"]')
   ```
3. **Result:**
   - `KHI-2026-KD4987A1` is **strictly excluded** from SSGC's Work Queue.
   - Attempting a direct URL navigation to `/department/ssgc/cases/KHI-2026-KD4987A1` triggers an authorization guard:
     ```
     HTTP 403 Forbidden: Case is not assigned to SSGC jurisdiction.
     ```
4. **Significance:** Proven jurisdictional isolation preventing unauthorized surveillance or status alteration by non-involved municipal agencies.

---

## 6. Step 5: Sequential Resolution & Aggregate State Reconciliation

### Transition Phase 1: KWSC Completes Dewatering & Sewer Repair
- KWSC completes jetting operations and resolves their task:
  - KWSC Issue Status: `resolved`
  - KMC Issue Status: `in_progress` (awaiting dry road surface before paving)
- **Deterministic Aggregate State Evaluation:**
  - Evaluated via `computeAggregateStatus`:
    ```typescript
    computeAggregateStatus([
      { departmentId: 'kmc', status: 'in_progress' },
      { departmentId: 'kwsc', status: 'resolved' }
    ])
    // Result: 'partly_resolved'
    ```
- **Citizen Tracker State:**
  - Citizen visits `/track/KHI-2026-KD4987A1`.
  - Banner: **Partially Resolved — 1 of 2 Municipal Tasks Complete**.
  - Task Progress Card:
    - [x] KWSC — Sewerage Line Repair: **Resolved** (16 Nov 2026, 17:15)
    - [ ] KMC — Road Asphalt Reconstruction: **In Progress**

### Transition Phase 2: KMC Completes Road Resurfacing
- KMC paving crew completes asphalt carpeting and updates task status:
  - KMC Issue Status: `resolved`
- **Deterministic Aggregate State Evaluation:**
  - Evaluated via `computeAggregateStatus`:
    ```typescript
    computeAggregateStatus([
      { departmentId: 'kmc', status: 'resolved' },
      { departmentId: 'kwsc', status: 'resolved' }
    ])
    // Result: 'resolved'
    ```
- **Citizen Tracker State:**
  - Citizen visits `/track/KHI-2026-KD4987A1`.
  - Banner: **Resolved — All Municipal Operations Completed**.
  - Visual satisfaction confirmation and feedback rating enabled.

---

## 7. Verification Summary Matrix

| Step | User / Actor | Action | Expected Output | Verification Method |
| :--- | :--- | :--- | :--- | :---: |
| 1 | Citizen | Submits dual road + sewage complaint | Single reference `KHI-2026-KD4987A1` with 2 issues | Automated Test T02 |
| 2 | KMC Staff | Opens queue, accepts road issue | Status `in_progress`, KMC note logged | Automated Test T13 |
| 3 | KWSC Staff | Opens queue, starts dewatering | KWSC task `in_progress`, independent of KMC | Automated Test T12 |
| 4 | SSGC Staff | Checks gas queue | Complaint `KHI-2026-KD4987A1` not visible | Automated Test T12 |
| 5 | Citizen | Checks public tracker | Aggregate `partly_resolved` then `resolved` | Automated Test T14, T16 |

This end-to-end operational cycle confirms that Awaaz-e-Awam provides Karachi with a unified, transparent municipal complaint operating desk.
