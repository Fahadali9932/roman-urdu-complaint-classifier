# Awaaz-e-Awam — V15.0 Department Head Home, Collapsible Rail & Desktop Boundary Report

**Date:** 26 November 2026 (PKT)  
**Target Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Branch:** `feature/v15-head-desktop-home` (branched from `49a6b02`; local rollback branch `checkpoint/v14-1-49a6b02` preserved)  
**Protected Baseline Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (untouched)  
**Target Delivery:** 5 December 2026  

---

## 1. Executive Summary & Scope

V15.0 replaces the visually rejected V14.1 Mineral Slate styling and floating topbar **exclusively inside the Department Head workspace**, delivering:

1. **Neutral Collapsible Vertical Sidebar Rail (`HeadSidebarNav.tsx`, `v15-head-desktop.css`):** Iconsax-inspired paper/charcoal neutral palette, `68px` collapsed / `216px` expanded desktop rail with `localStorage` persistence (`awaaz_head_sidebar_collapsed`), `lucide-react` outline icons, accessible hover/focus tooltips when collapsed, restrained purple illumination strictly scoped to the selected navigation destination, bottom account controls (`username`, theme switcher, sign out), an `Open workspace menu` Settings popover (`Review queue`, `Change passphrase`, theme switch, `Sign out`) dismissible via `Escape`, and the 8 operational destinations: `Home`, `Complaints`, `Dispatch`, `Work orders`, `Proof review`, `Officers`, `Archive`, and `Settings`.
2. **Operational Department Head Home (`HeadHomePage.tsx`):** Clean landing page for authenticated Heads featuring a single-line workspace header (`departmentCode`, `departmentName`, `Department Head`, `Refresh`, account action, Light/Dark toggle), PKT time-of-day greeting (`Asia/Karachi`) and formatted PKT date, 4 interactive inline operational counts (`Incoming`, `Unassigned`, `Proof review`, `Overdue`) connected to real `caseOperationsService.getDepartmentWorkSummary` and `fieldOperations.orders`, `Priority inbox` with `View all complaints` + 4 filters (`All priorities`, `Urgent`, `Unassigned`, `Overdue`), deterministic prioritization capped at **5** hairline-separated rows on 100+ items, contextual row actions (`Review` / `Assign` / `Inspect`), quiet footer (`Showing X of Y priority records` + `Open full inbox`), and full loading / empty / empty-filter / recoverable error (`Retry`) state coverage. Existing `OverviewPage.tsx` remains untouched for `V13_16_DepartmentOperations.test.tsx`.
3. **Scoped V15.0 Neutral Light & Dark Tokens (`v15-head-desktop.css`):** Light canvas `#FAFAFA`, surface `#FFFFFF`, primary ink/action `#171717`, muted `#666666` (`>= 5.3:1` WCAG AA contrast on `#F7F7F8`/`#FFFFFF`), border `#E5E5E5`; Dark canvas `#121212`, surface `#1C1C1C`, primary ink/action `#F5F5F5` (`#171717` onaction), muted `#A3A3A3`, border `#303030`; semantic red/amber/green strictly reserved for status states.
4. **Desktop-Only Head Usability Boundary (`useHeadDesktopAccess.ts`, `HeadDesktopRestrictionScreen.tsx`, `DepartmentRoleBoundary.tsx`, `DepartmentDashboardPage.tsx`):** Enforces `>= 1024 CSS px` and non-phone form factors (catching narrow viewports, mobile UAs, and coarse/no-hover landscape phones) across Head operational routes (`/department/head`, `/department`, `/department/complaints/:referenceNumber`), prevents Head workspace mount and operational case/complaint/work-order queries when restricted, preserves active authentication sessions across viewport resizing (`390px` <-> `1280px`) without signing users out, and leaves Field Officer (`/department/officer`), Central Administrator (`/admin`), Citizen portal (`/`), and Roman Urdu classifier (`run004_v11`) untouched. Browser viewport checks remain UX usability controls; Supabase authentication, department membership, AAL2, and RLS enforce server authorization.

### Design Skills Applied
- **Impeccable** (`Operate` mode, `.agents/skills/impeccable/`): `New Work`, `Operate`, `Distill`, `Layout`, `Typeset`, `Polish`, `Audit`, plus `impeccable detect` (source scan and live headless Chrome CDP scan).
- **Charles Unslop** & **Charles UX Animation** (`d:\RomanUrdu_ComplaintClassifier_staff_auth\.agents\skills\`): removed stacked box chrome on the restriction screen (fixing Impeccable's `icon-tile-stack` finding), raised Light `--v15-muted` from `#737373` (`4.47:1`) to `#666666` (`>= 5.3:1`), ensured clean horizontal truncation/non-wrapping buttons at `1024px`, and honored `prefers-reduced-motion: reduce`.
- **Unavailable Optional Skills (Reported Honestly):** `Charles Polish`, `Charles Color Analysis`, and `Superpowers` were not available as active Antigravity skills (`v7.0.1` exists only under Codex plugin cache) and could not be loaded.

---

## 2. Files Added & Modified (Scoped to Department Head Portal + Tests + Docs)

| File Path | Purpose | Status |
| :--- | :--- | :--- |
| `src/features/department/hooks/useHeadDesktopAccess.ts` | Evaluates `>= 1024px` width, phone UA, and landscape handheld touch-screen constraints reactively via `resize` / `orientationchange` / `matchMedia` | Added |
| `src/features/department/v15-head-desktop.css` | Neutral Light/Dark palette, directional sheens, collapsible sidebar rail (`68px`/`216px`), selected-only purple illumination, `HeadHomePage` styling, restriction screen responsive styles | Added |
| `src/features/department/components/HeadDesktopRestrictionScreen.tsx` | Responsive Light/Dark `"Continue on desktop"` notice with theme switch and `"Return to homepage"` link | Added |
| `src/features/department/components/HeadSidebarNav.tsx` | Collapsible 8-destination vertical rail with tooltips, bottom account bar, and Escape-dismissible Settings popover | Added |
| `src/features/department/components/HeadHomePage.tsx` | Greeting, PKT date, 4 inline metrics, 5-row deterministic Priority Inbox, filters, loading/empty/error recovery states | Added |
| `src/features/department/components/DepartmentSidebar.tsx` | Added `'work_orders'` to `WorkspaceSection` type union | Modified |
| `src/features/department/DepartmentRoleBoundary.tsx` | Renders `HeadDesktopRestrictionScreen` before mounting `DepartmentDashboardPage` when `expectedRole === 'head'` and `!isDesktopAllowed` | Modified |
| `src/features/department/DepartmentDashboardPage.tsx` | Wires `HeadSidebarNav`, `HeadHomePage`, `HeadDesktopRestrictionScreen`, `useHeadDesktopAccess`, and gates complaint fetches until role + desktop access are confirmed | Modified |
| `src/test/V15_HeadDesktopHomeAndRestriction.test.tsx` | Automated unit/integration coverage for Head Home metrics, deterministic 5-row cap on 105 items, filters, rail tooltips/popover, desktop boundary, session retention, and Officer mobile access | Added |
| `docs/V15_HEAD_HOME_IMPLEMENTATION_REPORT.md` | This implementation & verification report | Added |
| `docs/CURRENT_PROJECT_STATUS.md` | Appended verified V15.0 status section | Modified |

---

## 3. Verified Verification Gates (Post Final Edit)

All static, build, bundle, test, and live headless Chrome checks ran cleanly after the final code edit:

| Verification Gate | Command / Tool | Observed Result |
| :--- | :--- | :--- |
| Impeccable Static Scan | `.\.agents\skills\impeccable\scripts\impeccable.cmd detect --json src/features/department` | **Exit `0`** (`[]`, 0 findings) |
| Impeccable Live CDP Audit | `impeccable detect --cdp <port> --json` via `v15_head_qa.mjs` | **0 findings** across all 4 audited views (`head_home_light_1440`, `head_home_dark_1440`, `head_restriction_light_390`, `head_restriction_dark_390`; exit `0` each) |
| TypeScript | `npx tsc -b` | **Exit `0`** (0 errors) |
| Linter | `npm run lint` (`oxlint`) | **Exit `0`** (`0` errors, `273` pre-existing warnings across `390` files) |
| Production Build | `npm run build` (`vite build`) | **Exit `0`** (`1.30s`, `2,260` modules transformed) |
| Production Bundle Safety | `node tools/ai_factory/v13_8_2_verify_production_bundle.mjs` | **`PASS`** (`1` production JS bundle, clean of demo fixtures/bypass markers) |
| Full Vitest Suite | `npx vitest run` | **Exit `0`**: `68` test files passed, `1` skipped (`69`, skipped: `V13_6_DevelopmentProbe.test.ts`); **`694` tests passed, `1` skipped (`695`)** in `30.22s` (includes all `6/6` tests in `V15_HeadDesktopHomeAndRestriction.test.tsx`) |
| Local Node Edge Suites | `node --test` across non-staging `tests/edge/*.mjs` | **Exit `0`**: **`106` passed, `0` failed** |
| Python Classifier Suite | `python -m unittest discover -s tests/v11` | **Exit `0`**: **`106` tests `OK`** in `17.232s`; Run004 classifier untouched |

---

## 4. Multi-Viewport Browser QA & Screenshot Verification (`screenshots/v15_head_home/`)

Captured and verified **25** screenshots in headless Chrome (`v15_head_qa.mjs`, gitignored under `screenshots/v15_head_home/`):
- **Desktop Expanded (Light & Dark):** `1920x1080`, `1440x900`, `1366x768`, `1280x800`, `1024x768` (`sidebarWidth = 216px`, `inboxRowCount = 5`, `overflow = 0px`, `0` console/page errors).
- **Desktop Collapsed:** `1920x1080`, `1440x900`, `1024x768` Light + `1440x900` Dark (`sidebarWidth = 68px`, `overflow = 0px`), plus `head_sidebar_settings_popover_light_1440.png` (Settings menu open; verified `Escape` key closes popover) and `head_secondary_complaints_light_1440.png` (legacy secondary `Complaints` queue inside `.v15-head-shell`).
- **Desktop Restriction Gate:** `1023x768` (Light & Dark), `768x1024` (Light), `393x852` (Light), `390x844` (Light & Dark), `320x568` (Light & Dark), and mobile landscape `844x390` (Light) — all rendering `"Continue on desktop"` cleanly with `0px` horizontal overflow.
- **Restriction Network & Session Telemetry:** Direct navigation to `/department/head`, `/department`, and `/department/complaints/KHI-2026-1001` at `390x844` rendered the restriction screen, preserved `awaaz_department_auth_session_v1` in `sessionStorage`, triggered **0** operational complaint/case/work-order network requests (`restrictedNetworkUrls: []`), and recovered cleanly to `HeadHomePage` when resized `390px -> 1280px` without re-login.
- **Portal Non-Regression Smoke:** Field Officer sign-in (`roads-02`) at `390x844` opened normally without desktop restriction; Central Administrator (`/admin/login`) and Citizen (`/`) measured `0px` horizontal overflow at `1440x900`.

---

## 5. Spend & Hosting State Note

- **Total Monetary Spend:** **\$0.00** (zero paid tools, services, APIs, or cloud upgrades).
- **Not Executed:** No merge to `main`, no force-push, no production deployment, and no autonomous ML training was performed. Remote hosted staging/production behavior was not modified or queried live.
