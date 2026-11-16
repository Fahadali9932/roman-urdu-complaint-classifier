# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V10 ISSUE RELATION & CAUSAL DISAMBIGUATION
**Document ID:** `docs/v10/02_ISSUE_RELATION_AND_ROUTING.md`  
**Version:** 10.0  
**Date:** 16 November 2026  
**Status:** Certified Engineering Architecture  

---

## 1. The Core Multi-Department Challenge

Citizens naturally describe municipal grievances through chains of cause and effect:
- A power blackout prevents domestic water motors from pumping water to rooftop tanks.
- An overflowing sewer line spills wastewater across an intersection, obstructing vehicular traffic.
- A ruptured high-pressure water main washes away the road sub-base, creating massive craters.

Single-label and naive keyword multi-label classifiers fail on these texts:
- *Naive Keyword Matching:* Seeing `bijli` and `pani` in the same complaint automatically allocates tickets to both K-Electric and KWSC, even when the water supply is functioning normally.
- *Single-Label Reduction:* Forcing a dual water-leak + collapsed-road report to KMC results in KMC rejecting the complaint because they cannot repair water pipes.

Phase V10 implements a **Semantic Issue Relation Resolver** (`IssueRelationResolver`) that evaluates causal connectors (`is wajah se`, `jis se`, `kyunki`) and affirmative defect requirements before assigning departmental work orders.

---

## 2. Relation Taxonomy & Disambiguation Rules

| Relation Type | Definition & Criteria | Action Taken |
| :--- | :--- | :--- |
| **`INDEPENDENT`** | Two distinct municipal services suffer independent physical or operational defects. | Generates two autonomous departmental work items under one tracking reference. |
| **`CAUSES` / `EFFECT_OF`** | Primary service failure causes an operational symptom in another system without structural damage to that second service. | Assigns ONLY the primary owning department; suppresses phantom secondary assignments. |
| **`SAME_INCIDENT_DIFFERENT_REPAIRS`** | A single physical incident damages two distinct public infrastructures requiring independent crews. | Assigns BOTH departments with linked incident metadata. |
| **`MENTION_ONLY`** | An agency or locality is mentioned as geographic context or reference. | Suppresses ungrounded department assignment. |
| **`NEGATED`** | A service defect is explicitly denied or clarified as functioning properly. | Suppresses negated department. |
| **`UNCERTAIN`** | Causal relationship is speculative or ambiguous (`shayad`, `lagta hai`). | Routes to administrative human review queue (`AMBIGUOUS_CAUSE_EFFECT`). |

---

## 3. Four Canonical Benchmark Scenarios

### Example A: Power Outage Causing Household Water Motor Failure
- **Citizen Report:** `"kal se bijli nahi hai is wajah se ghar ki pani wali motor nahi chal rahi"`
- **Semantic Analysis:**
  - Clause 1: `kal se bijli nahi hai` $\rightarrow$ Affirmative electrical outage (`kelectric`).
  - Connector: `is wajah se` $\rightarrow$ Causal marker.
  - Clause 2: `ghar ki pani wali motor nahi chal rahi` $\rightarrow$ Consequential symptom. The domestic water pump cannot run because power is out. No public water pipeline or KWSC supply failure is asserted.
- **Routing Decision:**
  - Assigned: **`kelectric` (K-Electric)**
  - Suppressed: **`kwsc`** (Reason: *"Household water motor failure is an operational consequence of power outage, not a KWSC supply defect."*)
  - Relation: `kelectric` $\xrightarrow{\text{CAUSES}}$ `kwsc` (Non-actionable effect).

---

### Example B: Two Independent Infrastructure Failures
- **Citizen Report:** `"hamare area mein bijli nahi aa rahi aur sarkari pani ki main pipeline bhi phat gai hai"`
- **Semantic Analysis:**
  - Clause 1: `bijli nahi aa rahi` $\rightarrow$ Affirmative electrical outage (`kelectric`).
  - Connector: `aur` $\rightarrow$ Coordinating conjunction (Independent).
  - Clause 2: `sarkari pani ki main pipeline bhi phat gai hai` $\rightarrow$ Affirmative public water main burst (`kwsc`).
- **Routing Decision:**
  - Assigned: **`kelectric` (K-Electric)** AND **`kwsc` (KWSC)**
  - Tracking: One public citizen receipt (`KHI-2026-XXXXXXXX`) linking two independent departmental work orders.
  - Relation: `INDEPENDENT`.

---

### Example C: One Incident Requiring Two Separate Departmental Repairs
- **Citizen Report:** `"pani ki main line phat gai hai aur us ki wajah se road ki satah bhi toot gai hai"`
- **Semantic Analysis:**
  - Primary Event: `pani ki main line phat gai hai` $\rightarrow$ KWSC water main fracture.
  - Causal Link: `aur us ki wajah se` $\rightarrow$ Physical impact.
  - Secondary Event: `road ki satah bhi toot gai hai` $\rightarrow$ KMC asphalt road structural damage.
  - Operational Reality: KWSC plumbing crews do not lay asphalt; KMC road crews cannot fix pressurized water mains. Both departments must independently deploy crews.
- **Routing Decision:**
  - Assigned: **`kwsc` (Water Pipeline Repair)** AND **`kmc` (Road Asphalt Reconstruction)**
  - Relation: `SAME_INCIDENT_DIFFERENT_REPAIRS`.

---

### Example D: Sewerage Overflow Causing Traffic Jam
- **Citizen Report:** `"sewerage ka pani road par aa raha hai jis se traffic ruk gaya hai"`
- **Semantic Analysis:**
  - Primary Defect: `sewerage ka pani road par aa raha hai` $\rightarrow$ KWSC sewer main overflow.
  - Connector: `jis se` $\rightarrow$ Consequence marker.
  - Symptom: `traffic ruk gaya hai` $\rightarrow$ Traffic delay due to surface water. No pothole, crater, or road structural collapse is described.
- **Routing Decision:**
  - Assigned: **`kwsc` (KWSC Sewerage Clearance)**
  - Suppressed: **`kmc`** (Reason: *"Traffic obstruction or water accumulation on pavement is a symptom of sewer overflow, not an independent structural road defect."*)

---

## 4. Aggregate Citizen Progress State Reconciliation

When multiple departments manage child tasks on a single complaint, the citizen portal displays a unified aggregate status evaluated via the deterministic state machine:

$$S_{\text{aggregate}} = f(\{s_{\text{kmc}}, s_{\text{kwsc}}, \dots\})$$

- If all issues are `resolved` $\rightarrow$ Aggregate is **`resolved`** ("Resolved — All Municipal Tasks Complete").
- If some issues are `resolved` and others are `in_progress` $\rightarrow$ Aggregate is **`partly_resolved`** ("Partially Resolved — 1 of 2 Departments Complete").
- If all issues are `rejected` $\rightarrow$ Aggregate is **`rejected`**.
- One department cannot close, alter, or advance another department's work item.
