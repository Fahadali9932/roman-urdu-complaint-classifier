# AWAAZ-E-AWAM — V17 Apple Clear Liquid Glass Staff Portal Redesign Report

**Date:** 26 November 2026 (PKT)  
**Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Branch:** `feature/v17-apple-liquid-glass-staff-portal` (branched from `checkpoint/v16-fa817d1` at `fa817d1`)  
**Protected Baseline Preserved:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`, frozen Run004 classifier (`E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56`), Citizen Portal (`/`, `/submit`, `/track`), Central Administrator backend/security routes, and Supabase production project (`akbwiedtmxjxcjscgitw`).

---

## 1. Material System & Design Tokens (`src/features/department/apple-liquid-glass.css`, `src/styles/v3-civic-glass.css`)

- **Clear Liquid Glass Architecture:** Scoped cleanly to `.lg-portal-shell` and `.lg-auth-shell` without altering Citizen Portal styling.
  - **Light Canvas:** Neutral silver-gray (`#ECEFF4` to `#EAEEF3`), primary ink `#111418`, secondary ink `#5C6470`, system blue accent `#007AFF`.
  - **Dark Canvas:** Neutral graphite (`#0D0F12` to `#0E1014`), primary ink `#F5F7FA`, secondary ink `#9AA2AE`, system blue accent `#0A84FF`.
  - **Three Clear Glass Tiers:** `--lg-glass-clear` (floating navigation ribbon & top bar), `--lg-glass-surface` (panels, overview strip, inbox container), and `--lg-glass-dense` (popovers, contextual sheets, floating mobile bottom bar), each with `< 20px` backdrop blur (`16px`–`20px`) and crisp hairline optical edge highlights, plus `@supports not (backdrop-filter)` solid fallbacks.
  - **Motion & Accessibility:** `130ms` press feedback, `220ms` segmented capsule glide, `250ms` origin-anchored contextual popovers, `300ms` sheet transitions, `prefers-reduced-motion` support, and visible `:focus-visible` focus rings.

---

## 2. Reusable Clear Liquid Glass Primitives (`src/features/department/components/glass/`)

- **`LiquidSegmentedControl.tsx`:** Measured `offsetLeft`/`offsetWidth` sliding glass capsule supporting `sm` and `md` sizes, optional `tabular-nums` counts, and keyboard-accessible `aria-pressed` states.
- **`LiquidSheet.tsx`:** Contextual modal / mobile bottom-sheet dialog with `Escape` key dismissal, backdrop click dismissal, and accessible close labeling (`Close <title>`).
- **`PriorityPill.tsx`:** Restrained semantic dot + readable text label (`Urgent`, `High`, `Routine`, `Verified`) with zero emoji or decorative clutter.
- **`LiquidGlassRibbon.tsx`:** Floating HOD navigation ribbon (`Awaaz-e-Awam` mark, `Overview`, `Complaints`, `Officers`, `Archive`, `Search`, `Notifications` badge + popover, Light/Dark theme toggle, `Account` menu, and `<= 820px` mobile `LiquidSheet` menu) with hover/focus contextual glass preview popovers powered by `RibbonMetrics`.

---

## 3. Redesigned Staff Portals & Operational Views

- **Independent Logins (`ThemedDepartmentLoginScreen.tsx`, `v3-civic-glass.css`):** Clear Liquid Glass auth cards (`blur(18px) saturate(165%)`), `#007AFF`/`#0A84FF` system-blue accent, and distinct role headers (`Department Head Sign-In` on `/department/head/login`, `Field Officer Sign-In` on `/department/officer/login`) with zero shared role-switcher tabs on dedicated role routes.
- **Department Head Homepage (`HeadHomePage.tsx`):** Full-width floating ribbon + `Overview` heading & department subtitle + Apple segmented date selector (`Today`, `Yesterday`, `This month`, `This year`, `Custom`) + one integrated 5-metric Clear Liquid Glass strip (`Received`, `Unassigned`, `In progress`, `Verify evidence`, `Resolved`) + ~65% `Complaint inbox` (`Priority`, `Unassigned`, `In progress`, `All` + compact Apple Mail rows + `View all`) + ~35% `Field operations` (`Officer availability` + `Evidence verification`), with loading, empty, and error-retry states.
- **Responsive HOD Boundary (`DepartmentRoleBoundary.tsx`, `DepartmentDashboardPage.tsx`):** Removed `< 1024px` hard lockout while keeping server-backed role verification intact, allowing HOD workflows to adapt responsively from `1920px` down to `320px`.
- **Complaints, Detail, Weekly Picker & Officers (`HeadComplaintsPage.tsx`, `HeadComplaintDetailView.tsx`, `department-deadline-picker.css`, `department-operations-v16.css`):** Apple Mail inbox rows with `PriorityPill`, `LiquidSegmentedControl` date filters, system-blue map markers (eliminating legacy purple `#6D28D9`), and Clear Liquid Glass styling across the Monday-first weekly deadline picker and 5-stage dispatch/verification/roster views.
- **Field Officer Mobile-First Portal (`DepartmentDashboardPage.tsx`, `apple-liquid-glass.css`):** Added fixed floating `.lg-officer-bottom-nav` (`My Day`, `Assigned Work`, `History`, `Profile`) with frosted dense glass and active capsule indicator.

---

## 4. Verification & Real Chrome Visual QA Results

- **TypeScript (`npx tsc -b`):** Exit `0` (0 errors).
- **Linter (`npm run lint` / `oxlint`):** Exit `0` (0 errors, 281 pre-existing warnings).
- **Production Build (`npm run build`):** Built `2,265` modules in `1.33s` (`dist/assets/index-*.js`, `dist/assets/index-*.css`).
- **Production Bundle Security (`node tools/ai_factory/v13_8_2_verify_production_bundle.mjs`):** `PASS` (0 demonstration fixtures or auth bypass markers).
- **Vitest Suite (`npx vitest run --exclude src/test/V13_6_DevelopmentProbe.test.tsx`):** **71 test files passed, 1 skipped (72); 713 tests passed, 1 skipped (714)** in `30.03s` (including `V15_HeadDesktopHomeAndRestriction.test.tsx` 6/6, `V16_FullWorkflows.test.tsx` 10/10, `V13_20_DepartmentRoleAndDeadlinePicker.test.tsx` 7/7, and `V17_AppleLiquidGlassPortal.test.tsx` 4/4).
- **Non-Staging Node Edge Security Suites (`node --test tests/edge/*.mjs` excluding live staging `v13_12_*`):** **106 passed, 0 failed**.
- **Python Backend Unittests (`python -m unittest discover -s tests/v11`):** **106 tests OK (`16.536s`)**.
- **Impeccable Static Scan (`npx impeccable detect src/features/department`):** **0 findings** across 56 scanned files.
- **Real Headless Chrome Visual QA (`tools/ai_factory/v17_apple_qa.mjs`):** **22/22 screenshots captured** across `1920px`, `1440px`, `1366px`, `1024px`, `768px`, `390px`, and `320px` in Light and Dark modes with **`0` horizontal overflows**, **`0` page errors**, and **`0` console errors**, plus verified Citizen Portal isolation (`/`).
