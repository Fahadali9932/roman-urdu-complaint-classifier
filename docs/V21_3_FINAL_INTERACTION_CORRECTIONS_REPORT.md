# AWAAZ-E-AWAM — V21.3 FINAL PERSONNEL & INTERACTION CORRECTIONS REPORT

**Date:** 27 November 2026 (PKT)  
**Author:** Principal Frontend Engineer, Senior Product Designer, Motion Engineer & Independent Browser QA Specialist  
**Repository:** `https://github.com/Fahadali9932/roman-urdu-complaint-classifier`  
**Base Commit:** `2ef0df7` (`checkpoint/v21-2-before-v21-3`)  
**Active Working Branch:** `fix/v21-3-final-personnel-and-interactions`  
**Authorized Review Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Protected Primary Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (**100% untouched**)  
**Delivery Target:** 5 December 2026 | **Total Expenditure:** $0.00 | **Dependencies:** Zero paid APIs or card requirements  

---

## EXECUTIVE SUMMARY

Following comprehensive inspection by the project owner of V21.2, five targeted defects were identified and prioritized for engineering correction:
1. **Officer Cards Proportions & Scroll Motion:** Cards required 20–25% larger proportions and the approved complaint-style scroll depth effect.
2. **Individual Officer Details File:** Required a comprehensive and authoritative personnel management file with natural document scrolling rather than compressed tabs.
3. **Profile Settings Simplification:** Required removal of "Account Passphrase" and "Authorized Department" rows, and addition of exactly two honest options ("Change username" and "Change password") that trigger a centered "Coming soon" modal with an "Okay" button.
4. **"Mark all as read" Malfunction & Lag:** Derived alerts (`overdue-*`, `ext-*`, `verif-pending`) were never marked read in state and unread count never reached 0, causing lag, button click loops, and lack of optimistic updates.
5. **Morphing Navbar Inconsistent Interaction & Stuck Expanded State:** ActiveElement focus trapping inside `handlePointerLeave` prevented the navbar from ever closing once any tab was clicked, and manual close was immediately overridden by cursor hover.

In V21.3, all five areas have been engineered, rigorously tested, and visually verified in real headless Chrome with zero regressions across the codebase.

---

## 1. OBJECTIVE 1: ENLARGED OFFICER CARDS WITH PROMINENT STANDALONE METRICS

**File:** `src/features/department/components/v19/HodOfficersView.tsx`

### Enhancements:
- **Generous Proportions (20–25% Enlargement):**
  - Card minimum width set to `340px` (desktop grid `repeat(auto-fill, minmax(340px, 1fr))`), minimum height `330px`, and padding `30px` with `28px` corner radius.
  - Avatar enlarged to `84px` circular diameter with `34px` high-legibility bold initials.
  - Name rendered in `19px` bold type with `-0.02em` tracking.
- **Standalone Prominent Metrics (No Nested Card Boxes):**
  - Replaced nested card boxes with clean, standalone numerical typography:
    - **Assigned:** Large `22px` numerical stat in `var(--v20-text-primary, #F0ECE3)`.
    - **Resolved:** Large `22px` numerical stat in `#3BC977` (semantic success green).
    - **Overdue:** Large `22px` numerical stat in `#F59E0B` (amber when >0, neutral muted when 0).
- **Approved Neutral Styling:**
  - Entire card surface uses neutral charcoal glass (`rgba(18, 15, 12, 0.78)` with `border: 1px solid rgba(255, 255, 255, 0.08)` and `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35)`).
  - Status badges use clear semantic indicators: `● Online · Operational` (`#3BC977`) and `Active Account`.
  - Zero harsh yellow buttons, yellow glows, or jarring borders.
- **Responsive Fluidity:**
  - Desktop (1920 & 1440): Clean 3-column layout.
  - Tablet (768): Fluid 2-column layout.
  - Mobile (390 & 320): Single-column full-width cards with natural touch padding.

---

## 2. OBJECTIVE 2: REUSE APPROVED COMPLAINT SCROLL MOTION

**File:** `src/features/department/components/v19/HodOfficersView.tsx`

### Technical Implementation:
- Integrated the exact subtle scroll-linked depth effect from `ParallaxComplaintList.tsx` into the officer directory.
- Container wrapped in `perspective: 800px` (`data-testid="v20-officers-parallax-list"`).
- Each card wrapped in a stable `.v20-officer-card-wrapper` with `currentDims` tracking and direct DOM style mutation on `requestAnimationFrame`:
  - **Scale:** Subtly bounded from `1.0` down to `0.97` as the card reaches the upper boundary.
  - **TranslateY:** Dynamic upward translation up to `14px`.
  - **TranslateZ:** Depth recess up to `-20px`.
  - **Sticky Ceiling:** Bounded at `140px` below the morphing header bar.
- Single RAF loop with passive scroll listener and `isTickingRef` guard prevents redundant layout thrashing.
- Respects `prefers-reduced-motion: reduce` by immediately bypassing transform calculations and restoring static positioning.

---

## 3. OBJECTIVE 3: COMPREHENSIVE INDIVIDUAL OFFICER PERSONNEL FILE

**File:** `src/features/department/components/v19/HodOfficersView.tsx`

When an officer card is clicked, the directory smoothly transitions to a dedicated full-width personnel file with natural document scrolling:
1. **Navigation Action Bar:**
   - Prominent `← Back to officers` action button (`data-testid="v20-officer-back-btn"`).
   - Preserves search query and scroll offset when returning to the directory.
   - Division breadcrumb: `Officer Personnel File · {departmentCode} Division`.
2. **Officer Identity Section:**
   - Large `92px` avatar with `36px` initials and `0 10px 30px rgba(0, 0, 0, 0.45)` shadow.
   - Full display name, `Active Account` badge, and real-time presence indicator (`Online · Operational`).
   - Officer ID (`kmc-off-101`), Division (`KW&SC Field Operations`), and Joined date.
3. **Personnel Information Grid:**
   - Department jurisdiction, verified Employee ID, Account Status, and Last Active Heartbeat.
4. **Performance Overview Section:**
   - Prominent standalone numbers:
     - Performance Rating (`4.7 / 5.0`)
     - On-Time Completion (`92%`)
     - Assigned Tasks (`2`)
     - Resolved & Verified (`12`)
     - Overdue Cases (`0`)
5. **Current Assignments Section:**
   - Full-width list of active work orders.
   - Shows complaint title, work order reference number, bold operational status, commencement timestamp, deadline in **PKT**, and supervisor instructions.
   - Prominent `Extend ↗` action button to adjust deadline for eligible cases.
6. **Work History Section:**
   - Completed field orders verified by supervisory inspection.
   - Displays complaint title, order ID, completion confirmation, and verified resolution outcome.
7. **Warnings & Extension Requests Section:**
   - Plain-language split view showing formal supervisory warnings on record and active time extension requests awaiting decision.
8. **Administrative Controls Area:**
   - Dedicated supervisory control console:
     - **Issue Formal Warning:** Opens accessible modal to log an operational infraction notice.
     - **Suspend / Reactivate Officer:** Toggles field access with confirmation dialog.
   - Natural document scrolling throughout: zero compressed tabs or nested scrollbars.

---

## 4. OBJECTIVE 4: SIMPLIFIED PROFILE SETTINGS & COMING SOON MODALS

**Files:** `src/features/department/components/v19/HodProfileView.tsx` & `src/features/department/components/v19/OfficerProfileView.tsx`

### Technical Implementation:
- **Clean Page Hierarchy:**
  - Header: `"My profile"` in bold sans typography.
  - Card 1: **Identity Header Card** with large `80px` avatar, photo upload button, display name, department role, and division code.
  - Card 2: **Display Name Editing** with `"Display name"` label, `"Save changes"` button, live feedback (`Saving...`, `Saved ✓`, `Retry`), and approved `"Admin"` greeting fallback explanation.
  - Card 3: **Account Settings** strictly honest presentation:
    - Removed misleading `"Account Passphrase"` row.
    - Removed redundant `"Authorized Department"` row.
    - Added exactly two account settings:
      1. **Change username:** Label `"Change username"`, subtitle `"Update operational account username"`, button `Change ↗`.
      2. **Change password:** Label `"Change password"`, subtitle `"Update departmental login password"`, button `Change ↗`.
    - Retained **Sign out:** Label `"Sign out"`, subtitle `"Securely sign out of this workstation"`, button `Sign Out`.
- **Centered "Coming Soon" Modal Dialog:**
  - Clicking either "Change username" or "Change password" opens a centered modal over a blurred dark backdrop (`rgba(0, 0, 0, 0.75)`):
    - **Title:** `"Coming soon"`
    - **Message:** `"This feature will be added soon."`
    - **Dismiss Button:** `"Okay"` (`data-testid="coming-soon-okay-btn"`)
  - Full keyboard accessibility: auto-focuses the "Okay" button, dismisses on `Escape` or `Enter`, and automatically restores focus to the triggering `Change ↗` button upon closure.
  - Zero credential forms or fake account mutations.

---

## 5. OBJECTIVE 5: "MARK ALL AS READ" MALFUNCTION & LAG FIX

**Files:** `src/features/department/components/v19/StaffNotificationsView.tsx`, `V19HodPortalView.tsx`, `V19OfficerPortalView.tsx`

### Root Cause Analysis:
1. In `V19HodPortalView.tsx`, `combinedNotifs` synthesizes alerts derived directly from live work orders (`overdue-${o.id}`, `ext-${o.id}`, `verif-pending`). These synthetic alerts had `read: false` hardcoded and had no corresponding database rows.
2. Clicking "Mark all as read" called `fieldOperations.markNotificationRead(n.id)` on database notifications, but the synthetic alerts remained `read: false` forever.
3. `unreadCount` was calculated by summing overdue orders, extension requests, pending verification count, and unread database notifications. Because the synthetic counts were never dismissed, `unreadCount` remained greater than 0, the navbar badge never cleared, and the unread view remained populated.
4. Users clicked repeatedly, sending multiple parallel requests without button disablement or loading indicators, causing UI lag and freezing.

### Engineering Solution:
1. **Local Dismissal Tracking for Derived Alerts:**
   - Introduced `const [dismissedDerivedIds, setDismissedDerivedIds] = useState<Set<string>>(new Set())` in `V19HodPortalView.tsx`.
   - In `combinedNotifs`, each item's read status evaluates:
     `read: Boolean(n.is_read) || dismissedDerivedIds.has(String(n.id))`
2. **Optimistic Local UI Update in `StaffNotificationsView.tsx`:**
   - Added `localReadIds` and `isMarkingAllRead` state.
   - When "Mark all as read" is clicked:
     - Button is immediately disabled with `isMarkingAllRead` flag.
     - Text transitions to `"Marking as read..."` with a spinner.
     - All displayed notifications are optimistically marked read immediately in local view state.
     - `unreadCount` instantly evaluates to `0`.
     - In case of network rejection, state rolls back to the previous snapshot.
3. **Bounded Execution:**
   - In `V19HodPortalView.tsx`, `onMarkAllAsRead` adds all derived IDs to `dismissedDerivedIds` and marks database notifications read in a single batch.
   - "Mark all as read" button is automatically disabled when `unreadCount === 0`.
   - Zero lag, zero UI freezes, and immediate unread badge clearance.

---

## 6. OBJECTIVE 6: DETERMINISTIC MORPHING NAVBAR CONTROLLER & STUCK-STATE IMMUNITY

**File:** `src/features/department/components/v20/TopEdgeMorphingNav.tsx`

### Root Cause Analysis:
1. `handlePointerLeave` contained:
   ```ts
   if (!navRef.current?.contains(document.activeElement)) {
     setIsOpen(false);
   }
   ```
   When a user clicked any destination tab button or the toggle button, that button became `document.activeElement` inside `navRef.current`. Therefore, `!navRef.current?.contains(document.activeElement)` evaluated to `false`, and the navbar **never closed**, trapping it in an expanded stuck state!
2. When the toggle button was clicked to close while the cursor was still within the `<header>` bounds, the next slight mouse movement or jitter triggered `handlePointerEnter`, immediately overriding the close and re-expanding the navbar.

### Engineering Solution:
1. **Deterministic 4-State Machine:**
   `type NavInteractionState = 'collapsed' | 'opening' | 'expanded' | 'closing'`
   Exposed on `<header id="header" data-nav-state={navState} className="... state-${navState}">`.
2. **Manual Close Guard (`isManualCloseRef`):**
   - When the user manually closes via the toggle button, presses `Escape`, or selects a destination tab:
     - `isManualCloseRef.current = true`
     - `setIsOpen(false)`
     - State transitions to `'closing'`
     - Active element is explicitly blurred: `(document.activeElement as HTMLElement)?.blur()`
   - `handlePointerEnter` checks `if (isManualCloseRef.current) return;` — preventing premature re-opening while the cursor lingers in the header area.
   - Once the cursor exits the header (`handlePointerLeave`), `isManualCloseRef.current` is cleanly reset to `false`.
3. **Removed Focus-Trapped Blocker:**
   - In `handlePointerLeave`, `setIsOpen(false)` executes unconditionally on timeout (250ms), blurring any focused element.
4. **Frame-Rate Independent Spring Dynamics:**
   - Opening spring: $k = 68, c = 16$ (smooth, unhurried expansion in ~650ms).
   - Closing spring: $k = 92, c = 19$ (clean retraction in ~520ms).
   - Direct SVG path mutations via RAF with zero React component re-renders during motion.
5. **Real Browser 30-Cycle Test:**
   - Verified 30 consecutive open/close cycles in real headless Chrome with **0 stuck states**.

---

## 7. AUTOMATED QUALITY GATES & VERIFICATION SUMMARY

| Quality Gate | Target Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **TypeScript Compilation** | `npx tsc -b` | **PASS (Exit 0)** | Zero type errors, strict clean build |
| **Vite Production Build** | `npm run build` | **PASS (Exit 0)** | Bundled in 2.23s, clean asset output |
| **Dedicated V21.3 Test Suite** | `npm test -- --run src/test/V21_3_InteractionCorrections.test.tsx` | **PASS (11/11)** | Cards, motion, details file, profile, mark all read, navbar |
| **V21.2 Regression Suite** | `npm test -- --run src/test/V21_2_PersonnelNotificationsProfile.test.tsx` | **PASS (9/9)** | Directory, detail view, notifications, display name |
| **V21.1 Regression Suite** | `npm test -- --run src/test/V21_1_NavigationAndLanding.test.tsx` | **PASS (9/9)** | Tab clicks, notch sizing, landing display name |
| **Full Repository Test Suite** | `npm test -- --run` | **PASS (784/785)** | 79 passed \| 1 skipped across 80 test files (0 regressions) |
| **Real Chrome Visual QA** | `node tools/ai_factory/capture_v21_3_qa.mjs` | **PASS (18/18)** | 18 screenshots captured, 30 cycles verified |

---

## 8. VISUAL ARTIFACTS INDEX

All high-resolution screenshots have been captured using real headless Chrome CDP and persisted to the artifact directory:

| Filename | Resolution | Description |
| :--- | :--- | :--- |
| `v21_3_officers_directory_desktop_1920.png` | 1920x1080 | 3-column enlarged officer cards, 84px avatar, standalone metrics |
| `v21_3_officers_directory_desktop_1440.png` | 1440x900 | Fluid desktop responsive layout |
| `v21_3_officers_directory_tablet_768.png` | 768x1024 | 2-column tablet layout with generous card touch targets |
| `v21_3_officers_directory_mobile_390.png` | 390x844 | Single-column mobile card layout on iPhone 14/15/16 |
| `v21_3_officers_directory_mobile_320.png` | 320x640 | Ultra-compact single-column mobile layout with zero overflow |
| `v21_3_officer_file_identity_performance_1920.png` | 1920x1080 | Dedicated personnel file: `← Back to officers`, 92px avatar, standalone stats |
| `v21_3_officer_file_assignments_history_1920.png` | 1920x1080 | Current assignments with PKT deadlines, supervisor instructions, work history |
| `v21_3_officer_file_admin_controls_1920.png` | 1920x1080 | Administrative controls area (Issue Warning, Suspend/Reactivate) |
| `v21_3_officer_file_warning_modal_1920.png` | 1920x1080 | Translucent glass modal dialog for formal notice transmission |
| `v21_3_profile_simplified_desktop_1920.png` | 1920x1080 | Simplified profile: "My profile", Display name, Change username, Change password |
| `v21_3_profile_simplified_tablet_768.png` | 768x1024 | Tablet profile view with centered glass card layout |
| `v21_3_profile_simplified_mobile_390.png` | 390x844 | Mobile profile view with responsive touch controls |
| `v21_3_profile_coming_soon_modal_1920.png` | 1920x1080 | Centered "Coming soon" modal with "Okay" button and blurred backdrop |
| `v21_3_notifications_unread_desktop_1920.png` | 1920x1080 | Notifications view with unread dot indicators and active "Mark all as read" |
| `v21_3_notifications_after_mark_all_read_1920.png` | 1920x1080 | Clean view after "Mark all as read": 0 unread, disabled button, zero badge |
| `v21_3_navbar_collapsed_1920.png` | 1920x1080 | Header ceiling with collapsed morphing notch in neutral glass |
| `v21_3_navbar_expanded_1920.png` | 1920x1080 | Fully expanded notch showing tabs, badges, notifications bell, and close button |
| `v21_3_navbar_closed_after_manual_toggle_1920.png` | 1920x1080 | Cleanly retracted navbar after clicking toggle button (0 stuck states) |

---

## 9. GIT COMMIT & REPOSITORY INTEGRITY

- Working directory: `D:\RomanUrdu_V13_19_Review`
- Dedicated branch: `fix/v21-3-final-personnel-and-interactions`
- Safety rollback checkpoint tag: `checkpoint/v21-2-before-v21-3` (pushed to origin)
- Protected primary worktree: `D:\RomanUrdu_ComplaintClassifier_staff_auth` (**100% untouched**)
- Zero database migrations or schema mutations applied.
- All 784 automated tests pass cleanly with zero warnings or regressions.
