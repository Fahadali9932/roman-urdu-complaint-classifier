# AWAAZ-E-AWAM — PHASE V7 BASELINE DIAGNOSIS & REPRODUCIBILITY AUDIT
**Date:** 16 November 2026  
**Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Git Branch:** `feature/live-citizen-classification-workflow`  
**Current HEAD Commit:** `b227c00` (`feat(v6): Trustworthy citizen submission, private tracking, safe auth and living department workspace`)  
**Target Environment:** Local React/Vite development server (port 5173) + Supabase Edge Functions & Database (`akbwiedtmxjxcjscgitw`)  

---

## 1. System Scope & Environment State

* **Active Git Branch:** `feature/live-citizen-classification-workflow` (clean working directory, 2 commits ahead of remote).
* **Vite Development Server:** Active and responding on `http://localhost:5173` (HTTP 200 OK).
* **Automated Test Baseline:** 30 Vitest test suites, 235 tests passing (100% pass at commit `b227c00`).
* **Supabase Status:** Migration `20261124000000_guest_numeric_tracking_v6.sql` created locally in `supabase/migrations/`; per safety protocols, **not** deployed remotely without explicit user consent.

---

## 2. Reproduced Defects & Direct Screen Observations

The baseline review was conducted by inspecting the reference screenshots captured on 16 Nov 2026 (`v6_overview_20261116.png`, `v6_queue_20261116.png`, `v6_settings_20261116.png`) and tracing the executing code paths in the repository.

| Screen / Area | Direct Observation | Product / Operator Impact | Root Cause Confirmed | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Overview Hero & Heading** | Massive promotional headline *"A clearer view of what matters next"* with abstract road network SVG (`Civic Response Network`). Takes up top 340px of screen with zero operational decision utility. | Feels like a promotional marketing brochure rather than a municipal operations desk. Operators must scroll to see actionable items. | `src/features/department/components/OverviewPage.tsx` rendered decorative SVG road art and slogan banner instead of dense work metrics. | **P1 (UX / Voice)** |
| **P0 Count Ambiguity & Mismatch** | Overview states: *"Waiting for a reply: 951 (Needs acceptance)"* and *"951 cases need a reply"*. Queue header shows `104 cases · 1,252 reports`, but queue tab shows `Needs action 951`. | **Severe cognitive confusion.** Staff are told there are 951 cases needing reply, when in fact there are only 104 total cases. The number 951 is the count of *reports*, not cases! | `CaseOperationsService.ts` calculated `awaitingAcceptance` as `reduce(sum of pendingAcceptanceCount)` across all reports and passed it to the case tab without case-level distinction. | **P0 (Data Integrity)** |
| **Overview Metric Arithmetic Failure** | Metric cards show: *Waiting for a reply: 951*, *Work started: 0*, *Completed cases: 301*. | Impossible mathematical distortion. `Work started: 0` is false. Arithmetic was subtracting report counts from case counts: `inProgress = Math.max(0, totalCases - awaitingAcceptanceReports) = Math.max(0, 104 - 951) = 0`. | Hardcoded subtraction bug in `OverviewPage.tsx` line 50. Mixed cases with reports. | **P0 (Arithmetic Bug)** |
| **Work Queue Titles & Repetition** | Case table displays repetitive synthetic titles: e.g., *"Obstruction on street — Sector 35 public service road · segment 15"*, *"Obstruction on street — Block 6 service lane near park · segment 30"*. | Synthetic fixture names (`segment 15`, `segment 30`) look robotic, degrade trust, and hinder quick triage. | Seed generators in `src/services/CaseOperationsService.ts` concatenated artificial `segment X` strings directly into user-facing titles. | **P1 (Data Presentation)** |
| **Work Queue Visual Clutter** | Every single row features repetitive pills: large red `• URGENT` or orange `• ATTENTION` badges, `4 reports / 4 residents`, `15 days / oldest report`. | Visual fatigue and slow scanning. The entire table screams for attention, defeating the purpose of prioritization. | Lack of progressive disclosure and absence of clean, compact table styling. | **P1 (Design / Usability)** |
| **Settings Lack Practical Utility** | Settings offers only Theme (Light/Dark) and Sidebar (Expanded/Compact) plus read-only profile info. | Staff cannot configure their daily workflow (default starting page, initial queue tab, table density) and cannot perform basic security actions (password change). | `DepartmentDashboardPage.tsx` settings view was implemented as a minimalist placeholder. | **P1 (Feature Utility)** |
| **User Preference Scope Leakage** | Theme and sidebar preferences are stored in global `localStorage` keys (`aawaaz-demo-theme`, `aawaaz-demo-collapsed`). | Account preferences leak across different staff officers sharing the same terminal or testing different accounts. | Preferences were not keyed by authenticated user ID (`auth.uid()`). | **P1 (State Isolation)** |

---

## 3. Mathematical Proof of Counting Discrepancy

Auditing `src/services/CaseOperationsService.ts`:

```ts
// Existing implementation in getDepartmentWorkSummary:
const list = this.casesByDept.get(deptId) || [];
const active = list.filter((c) => c.workStatus !== 'completed');
const totalReports = list.reduce((s, c) => s + c.linkedReportCount, 0); // = 1,252
const awaitingAcceptance = active.reduce(
  (s, c) => s + c.pendingAcceptanceCount, // SUM of report counts! = 951
  0
);
```

Then in `OverviewPage.tsx`:
```ts
// Existing bug:
needsAcceptanceCount: workSummary.awaitingAcceptance, // = 951 (REPORTS)
inProgressCount: Math.max(0, workSummary.totalCases - workSummary.awaitingAcceptance), // = Math.max(0, 104 - 951) = 0!
completedCount: Math.max(0, workSummary.totalReports - workSummary.awaitingAcceptance), // = 1,252 - 951 = 301
```

And in `WorkQueuePage.tsx`:
```tsx
// Existing bug on Cases tab list:
<button role="tab" className="view-chip">
  Needs action {summaryStats.awaitingAcceptance > 0 && <b>{summaryStats.awaitingAcceptance}</b>} // Shows 951!
</button>
<button role="tab" className="view-chip">
  All cases <b>{summaryStats.totalCases}</b> // Shows 104!
</button>
```

### Exact Required Count Definitions (The Invariant Rules)
1. **Case-level metrics (when viewing Cases):**
   - `totalCases`: Count of distinct physical incident cases (e.g., 104).
   - `casesNeedingResponse`: Count of distinct cases where `workStatus === 'needs_acceptance' || pendingAcceptanceCount > 0` (e.g., 91).
   - `casesInProgress`: Count of distinct cases where `workStatus === 'in_progress'` (e.g., 9).
   - `casesCompleted`: Count of distinct cases where `workStatus === 'completed'` (e.g., 4).
   - `casesUnassigned`: Count of distinct cases where `assignedStaffId === null || assignedStaffLabel === 'Unassigned'` (e.g., 88).
2. **Report-level metrics (when viewing Individual Reports or summary badges):**
   - `totalReports`: Sum of all linked citizen submissions (e.g., 1,252).
   - `reportsAwaitingAck`: Sum of pending reports awaiting department acknowledgment (e.g., 951).
   - Displayed strictly with report units: `951 reports awaiting acknowledgment`, NEVER `951 cases`.

---

## 4. Immediate Action Plan for V7 Iteration 1

1. **Fix Counting & Summary Contracts in `CaseOperationsService.ts`**:
   - Provide distinct `case` counts and `report` counts in `getDepartmentWorkSummary`.
   - Update `WorkQueuePage.tsx` so case view tabs display case counts, and report view tabs display report counts.
2. **Redesign Overview Page (`OverviewPage.tsx`)**:
   - Remove decorative road network SVG and slogan hero.
   - Build compact, decision-first operations desk:
     - 10-second response band with clear case count (`N cases need a first response`) and secondary report volume (`M reports pending acknowledgment`).
     - Animated stage distribution bars (visualizing real stage counts once on load; accessible reduced-motion fallback).
     - 4-metric strip with exact case-level counts.
     - `Work first` list (top 4 actionable cases with clear public place and report counts).
     - `Areas with open work` (real area workload rollup).
3. **Refine Work Queue Table (`WorkQueuePage.tsx`)**:
   - Clean natural human titles (eliminate synthetic `segment XX`).
   - Remove redundant warning badges from routine rows.
   - Introduce `Comfortable` vs `Compact` table density toggle.
4. **Build Real Staff Settings (`DepartmentDashboardPage.tsx` / `SettingsPage.tsx`)**:
   - Add persisted user preferences: Starting page (`Overview` / `Work queue`), Table density (`Comfortable` / `Compact`), Default queue view (`Needs response` / `All cases`), and Default sort.
   - Implement real password change modal via Supabase Auth `updateUser({ password })`.
   - Key all preferences by `awaaz_staff_preferences_v7:<userId>`.
