# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 DEMONSTRATION & USER GUIDE
**Document ID:** `docs/v10/10_DEMO_AND_USER_GUIDE.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Demonstration Guide & Operator Handbook  

---

## 1. Scenario 1: Everyday Colloquial Road Complaint (Single Agency)

### Objective:
Demonstrate that a citizen submitting short, unpunctuated Roman Urdu with colloquial spelling is correctly routed to KMC without triggering unwarranted human review.

### Step-by-Step Flow:
1. **Citizen Submission:**
   - Navigate to `/complaint/new` (or guest intake).
   - Enter Complaint Text:
     > `"humare ghar ke pass wali road bohot zada kharab hoi v hai isko theek kiya jae"`
   - Select Location: `Gulshan-e-Iqbal Block 13-D, District East`.
   - Submit Complaint.
2. **Citizen Outcome:**
   - Citizen receives receipt: `KHI-2026-XXXXXXXX`.
   - Classification Status: **Assigned to Karachi Metropolitan Corporation (KMC)**.
   - Identified Issue: `Road Infrastructure Repair (kmc.road_damage)`.
3. **KMC Department Portal (`/department/kmc`):**
   - KMC staff officer logs in (`kmc-01`).
   - The complaint appears immediately in KMC's active Work Queue with status `Assigned`.
   - Officer reviews the case, notes road pothole, and updates status to `In Progress`.
4. **Citizen Tracker (`/track/KHI-2026-XXXXXXXX`):**
   - Displays real-time progress: `"In Progress — KMC road maintenance team deployed"`.

---

## 2. Scenario 2: Power Outage Causing Domestic Pump Failure (Causal Consequence)

### Objective:
Demonstrate that when a citizen describes an electricity blackout that caused their domestic water motor to stop, the system routes ONLY to K-Electric and does NOT mistakenly assign KWSC.

### Step-by-Step Flow:
1. **Citizen Submission:**
   - Enter Complaint Text:
     > `"kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi"`
   - Select Location: `North Nazimabad Block H, District Central`.
   - Submit.
2. **Citizen Outcome:**
   - Citizen receives tracking receipt.
   - Department Assigned: **K-Electric ONLY** (`kelectric.power_outage`).
   - Consequence Log: The system logs that domestic water pump stoppage is an operational consequence of power loss, not a public water supply failure.
3. **Department Queue Verification:**
   - K-Electric Portal (`/department/kelectric`): Case appears in queue.
   - KWSC Water Portal (`/department/kwsc`): Queue remains **completely clean** of this case. Negative isolation confirmed!

---

## 3. Scenario 3: Independent Dual Infrastructure Failures (Multi-Agency)

### Objective:
Demonstrate that an independent electrical fault and a public water pipeline burst create two autonomous work items under one single citizen receipt.

### Step-by-Step Flow:
1. **Citizen Submission:**
   - Enter Complaint Text:
     > `"hamare area mein bijli nahi aa rahi aur sarkari pani ki main pipeline bhi phat gai hai"`
   - Select Location: `Korangi Sector 31-D, District Korangi`.
   - Submit.
2. **Citizen Outcome:**
   - Single tracking reference: `KHI-2026-XXXXXXXX`.
   - Assigned Agencies: **K-Electric** AND **KWSC**.
3. **Independent Operational Processing:**
   - K-Electric logs in: Accepts electrical outage task $\rightarrow$ Sets `in_progress`.
   - KWSC logs in: Accepts water main burst task $\rightarrow$ Sets `in_progress`.
   - KWSC repairs the pipe: Updates KWSC status to `resolved`.
4. **Citizen Tracking Portal:**
   - Aggregate Status: **Partially Resolved (Active)**.
   - Task Breakdown:
     - [x] KWSC — Water Main Repair: **Resolved**
     - [ ] K-Electric — Power Grid Restoration: **In Progress**
   - When K-Electric completes their repair, aggregate status rolls up to **Resolved — All Department Operations Completed**.

---

## 4. Administrative Clearinghouse & Review Queue Handling

When a complaint falls below the auto-route confidence gate ($< 0.60$), contains genuine causal ambiguity (`shayad bijli ki wajah se`), or lacks an incident location:
1. The case appears in `/department/admin/review-queue`.
2. Clear reason badges are displayed:
   - `INCOMPLETE_PUBLIC_LOCATION` (Service identified as road damage, but locality missing)
   - `AMBIGUOUS_CAUSE_EFFECT` (Speculative cause needing verification)
   - `LOW_SERVICE_CONFIDENCE` (Vague description needing citizen clarification)
3. The clearinghouse reviewer can assign the verified department with one click, creating an immutable audit trail.
