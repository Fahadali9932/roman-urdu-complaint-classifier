# AWAAZ-E-AWAM — PHASE V7 DATA & SETTINGS CONTRACTS
**Date:** 16 November 2026  
**Document:** `docs/v7/V7_02_DATA_SETTINGS_CONTRACTS.md`  

---

## 1. Case & Report Unit Dictionary & Invariant Rules

To prevent any further confusion between physical incidents (**cases**) and citizen submissions (**reports**), all services and UI components adhere strictly to the following dictionary:

```
┌────────────────────────┬─────────────────────────────────────────────┬────────────────────────────────────┐
│ Metric Name            │ Exact Definition                            │ Example Label                      │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ totalCases             │ COUNT(DISTINCT case_id) for department      │ 104 cases                          │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ totalReports           │ COUNT(report_id) across all department cases│ 1,252 reports                      │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ casesNeedingResponse   │ Active cases with unacknowledged reports    │ 91 cases need response             │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ reportsAwaitingAck     │ Total pending citizen reports needing ack   │ 951 reports awaiting acknowledgment│
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ casesInProgress        │ Distinct cases with active field work       │ 9 cases in progress                │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ casesCompleted         │ Distinct cases verified completed           │ 4 cases completed                  │
├────────────────────────┼─────────────────────────────────────────────┼────────────────────────────────────┤
│ casesUnassigned        │ Distinct cases without an assigned officer  │ 88 cases unassigned                │
└────────────────────────┴─────────────────────────────────────────────┴────────────────────────────────────┘
```

### Invariant Equations
1. `totalCases = casesNeedingResponse + casesInProgress + casesCompleted` (for active/closed partition).
2. `casesNeedingResponse <= totalCases`.
3. `reportsAwaitingAck <= totalReports`.
4. In the Work Queue **Cases view**, tab counts display **CASE counts** (e.g. `Needs response 91`, `All cases 104`).
5. In the Work Queue **Individual Reports view**, tab counts display **REPORT counts** (e.g. `Awaiting acknowledgment 951`, `All reports 1,252`).

---

## 2. Updated `CaseOperationsService` Summary Contract

```ts
export interface DepartmentWorkSummaryV7 {
  departmentId: DepartmentId;
  totalCases: number;
  totalReports: number;
  casesNeedingResponse: number;
  reportsAwaitingAck: number;
  casesInProgress: number;
  casesCompleted: number;
  casesUnassigned: number;
  urgentCases: number;
}
```

---

## 3. Staff Preferences Schema & Isolation Contract

All staff preferences are strictly scoped per authenticated user ID to eliminate cross-account leakage on shared terminals:

```ts
export interface StaffPreferencesV7 {
  schemaVersion: 7;
  theme: 'light' | 'dark' | 'system';
  sidebar: 'expanded' | 'compact';
  density: 'comfortable' | 'compact';
  startPage: 'overview' | 'work_queue';
  queueView: 'needs' | 'unassigned' | 'mine' | 'all';
  queueSort: 'attention' | 'oldest' | 'most_reports' | 'recently_updated';
  updatedAt: string;
}

// Storage Key Convention:
// 'awaaz_staff_prefs_v7:' + (session.userId || 'anonymous')
```

### Preference Behaviors
* **Table Density (`comfortable` vs `compact`):** Directly toggles CSS class on the table container, modifying row padding (14px vs 8px) and row height (58px vs 46px).
* **Starting Page (`overview` vs `work_queue`):** Governs default route redirect upon department portal sign-in.
* **Default Queue View (`needs` vs `all`):** Sets initial selected tab in `WorkQueuePage`.
* **Sidebar Mode (`expanded` vs `compact`):** Synced between the topbar collapse toggle and settings.

---

## 4. Account Security & Password Change Contract

```ts
// Executed via Supabase Auth client:
const { data, error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

* **Validation Rules:** Minimum 15 Unicode characters (NIST SP 800-63B), matching confirmation field.
* **Feedback Contract:**
  - Clear success alert: *"Password updated successfully for your staff account."*
  - Honest error handling for session expiration, rate limiting, or network unavailability.
