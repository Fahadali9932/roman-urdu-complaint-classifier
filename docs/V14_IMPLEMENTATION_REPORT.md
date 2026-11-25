# Awaaz-e-Awam — V14 Implementation Report

**Date:** 25 November 2026 (PKT)  
**Branch:** `feature/v14-figma-portal-integration`  
**Target Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Protected Primary Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (untouched)

---

## 1. Executive Summary

Phase V14 integrates the approved V3 Figma **Atmospheric Civic Glass** portal designs across the **Department Head**, **Field Officer**, and **Central Administrator** workspaces, introduces **mandatory Sindh geographical eligibility** enforced on both client and Edge server using the Public Domain `geoBoundaries PAK ADM1 Simplified (2019)` Sindh polygon (`shapeISO: PK-SD`), and repairs the **dual before/after work proof backend** (`upload-department-work-proof` Edge function and additive SQL migration `20261205000000_v14_sindh_geo_and_dual_work_proof.sql`).

All Citizen Portal classification/routing logic, Roman Urdu Run004 classifier artifacts, privacy boundaries, database security triggers, and KMC/department auth vector artwork remain intact. Zero paid services or paid APIs were introduced (`$0.00` spent), and production Supabase (`akbwiedtmxjxcjscgitw`) was not touched.

---

## 2. Verified Checkpoint History (`origin/feature/v14-figma-portal-integration`)

Branched cleanly from verified commit `c60858bea9f63aa55fe7b41bdd0dd34a505020a7` (`checkpoint/v13-21-c60858b` preserved locally):

1. **`c2179ff`** — `docs(v14)`: Recorded `docs/V14_IMPLEMENTATION_SPEC.md` and `docs/v14/V3_FIGMA_SPEC_CACHE.md` covering 252 `V3 ·` Figma frames across Department Head (`dTKbWUPPyx2iu8dfk8e3MJ`), Field Officer (`uXt2jY9QoEysSctI3oplmO`), and Central Administrator (`hlMJ7bE6QuzZiFqvgOXQ3H`).
2. **`e38aa97`** — `V3 Tokens & Primitives`: Added `DM Sans` typography (`index.html`), scoped Atmospheric Civic Glass CSS tokens (`src/styles/v3-civic-glass.css`), and shared components in `src/components/v3/` (`V3TopNav.tsx`, `V3WorkspaceMenu.tsx`, `V3CaseRow.tsx`, `V3PrimaryButton.tsx`, `V3AuthShell.tsx`).
3. **`b783e14`** — `Department Head & Field Officer V3`: Replaced the persistent left sidebar and dense KPI tile strips with the floating glass `DepartmentTopbar` pill, full-screen `V3WorkspaceMenu`, `Focus` workbench (`OverviewPage.tsx`), `36×56px` weekly capsule calendar (`DepartmentDeadlinePicker.tsx`), Field Officer `My day`/`Assignments`/`History` scoping (`officerFilter` in `FieldOperationsDesk.tsx`), V3 staff login (`V3AuthShell` with `#273746` / `rgba(241, 244, 246, 0.86)` light glass card), and `/department/request-access` (`StaffAccessRequestPage.tsx`).
4. **`71a9d3f`** — `Central Administrator V3`: Updated `AdminHeader.tsx` (single floating pill keeping bilingual EN/UR and Light/Dark toggles, with zero empty `Overview` tab leakage), `admin-portal.css`, `staff-auth.css`, `StaffAuthLayout.tsx`, and `AiControlCenterPage.tsx` multi-label department selection cards.
5. **`c899fec`** — `Mandatory Sindh Geographical Eligibility`:
   - Extracted official Sindh ADM1 polygon (`PK-SD`, SHA-256 `e2653ec7189eb025193d91a575387c88b42a136b97cdfd14946e54d1d649c341`) with provenance documented in `docs/v14/SINDH_BOUNDARY_PROVENANCE.md`.
   - Exported ESM TypeScript geometry (`src/data/geo/sindhBoundaryData.ts`, `supabase/functions/_shared/sindh-boundary-data.ts`) compatible across Vite, Vitest, Deno, and Node 24 ESM.
   - Separated Sindh polygon eligibility from Karachi-only municipal coverage (`kmc`, `kwsc`, `kelectric`) in `src/lib/geo/sindhEligibility.ts` and `supabase/functions/_shared/sindh-geo.ts` (`LOCATION_REQUIRED`, `INVALID_COORDINATES`, `OUTSIDE_SINDH`, `UNSUPPORTED_SERVICE_AREA`, `LOCATION_VERIFICATION_UNAVAILABLE`).
   - Enforced mandatory Sindh pins in `IncidentPinPicker.tsx` (with bilingual EN/UR alerts and keyboard coordinate fallback) and `SimplifiedComplaintContainer.tsx` (preserving typed complaint text upon rejection), as well as `SupabaseComplaintService.ts`, `MockComplaintService.ts`, `LocalV11ComplaintService.ts`, and `supabase/functions/submit-classified-complaint/index.ts` before classification, database RPCs, or storage writes.
6. **`9634582`** — `Dual Before/After Work Proof Backend Repair`:
   - Additive migration `supabase/migrations/20261205000000_v14_sindh_geo_and_dual_work_proof.sql`: widens SQL coordinate constraints to the Sindh envelope (`23.50..28.60`, `66.40..71.20`), adds nullable `before_storage_path`, `before_mime_type`, `before_bytes`, and `before_sha256` columns with consistency checks, updates `v1318_can_download_proof` and `v1318_record_proof`, and adds `v14_my_work_proofs`.
   - Updated `supabase/functions/upload-department-work-proof/index.ts`: widened `MAX_BODY` (`LIMIT * 2 + 16384`), switched GPS bounds to `validateSindhCoordinatesServer`, validated magic bytes and SHA-256 digests for both `after` and optional `beforePhoto`, and added atomic cleanup of both uploaded storage paths on persistence failure.
   - Updated `fieldOperations.ts` (`CitizenWorkProof.before_signed_url`, `v14_my_work_proofs` with `v1318_my_work_proofs` fallback) and `CitizenProofPanel.tsx` (side-by-side Before/After review).
   - Added real HTTP Edge suite `tests/edge/v14_dual_work_proof_http.mjs`.
7. **`757f328`** — `Regression & Gate Alignment`: Restored show/hide password toggle (`ThemedDepartmentLoginScreen.tsx`), added valid Karachi pin coordinates to dev presets (`SimplifiedComplaintContainer.tsx`) and ten-scenario fixture (`tests/edge/v13_10_ten_scenarios.mjs`), added `Review Queue` item in `V3WorkspaceMenu` (`DepartmentDashboardPage.tsx`), and aligned Scenario F assertion (`tests/edge/v13_19_scenarios_a_to_m_gate.mjs`) with Sindh bounds.
8. **Final Polish & Documentation Commit** *(current head)* — Resolved issues uncovered during real Chrome CDP visual inspection:
   - Synchronized Light/Dark CSS variable specificity (`[data-theme="light"]` vs `.dark`) in `src/styles/v3-civic-glass.css` and `src/features/auth/admin-portal.css` (including Dark mode `#122E32`/`#075F57` link contrast).
   - Tightened `AdminHeader.tsx` desktop pill spacing and hid desktop-only portal links properly on mobile viewports (`v3-nav-tab-desktop-only`), raising all interactive nav tabs and pill buttons to `>= 44px` hit targets.
   - Fixed Dispatch case-list flex-column vertical row collapse (`flex-shrink: 0` on `.v21-case-row` and `FieldOperationsDesk.tsx`) and widened the Dispatch search input (`"Search reference or area"`).
   - Fixed Leaflet `_onZoomTransitionEnd` (`Cannot read properties of undefined (reading '_leaflet_pos')`) teardown crash on Step 2 -> Step 3 transition in `IncidentPinPicker.tsx` (`zoomAnimation: false`, stable ref for language toggle, explicit `stop()/off()/remove()` cleanup).

---

## 3. Verification Results (Observed After Final Code Edits)

### Automated Suites
- **TypeScript + Vite Production Build (`npm run build`):** Built cleanly (`tsc -b` + `vite build`, 2,255 modules, `dist/assets/index-*.js`), exit `0` in `1.25s`.
- **Production Bundle Hygiene (`node tools/ai_factory/v13_8_2_verify_production_bundle.mjs`):** `PASS` (`1 production JS bundle(s) contain no demonstration fixtures or auth bypass markers`).
- **Linter (`npm run lint` / `oxlint`):** `0 errors` (`169` pre-existing/non-blocking warnings across 374 files), exit `0`.
- **Full Vitest Suite (`npx vitest run`):** `67` test files passed, `1` skipped (`V13_6_DevelopmentProbe.test.ts`, explicitly gated behind `RUN_V13_6_DEV_PROBE=1`); **`688` tests passed, `1` skipped**, `0` failed.
- **Local Node Edge Security & HTTP Suites (`node --test` across all 12 non-staging `tests/edge/*.mjs` files):** **`106` passed, `0` failed, `0` skipped** (`complaint-boundaries.mjs`, `local-http-integration.mjs`, `security-repair.mjs`, `v13_10_ten_scenarios.mjs`, `v13_12_real_auth_gate.mjs`, `v13_13_guest_claim_gate.mjs`, `v13_16_2_atomic_batch_gate.mjs`, `v13_17_geo_evidence_security_gate.mjs`, `v13_18_citizen_review_security_gate.mjs`, `v13_18_work_orders_security_gate.mjs`, `v13_19_scenarios_a_to_m_gate.mjs`, `v14_dual_work_proof_http.mjs`).
- **Python Classifier & AI Factory Unittests (`C:\Python314\python.exe -m unittest discover -s tests/v11 -p "test_*.py" -q`):** **`106` tests passed in `17.771s`**, `OK` (Run004 classifier weights preserved untouched).

### Real Multi-Viewport Headless Chrome CDP Browser QA
Executed against live Vite dev server across `1440px`, `1024px`, `768px`, `393px`, `390px`, and `320px` in both **Light** and **Dark** modes (Department Head login/Focus/Workspace Menu/Dispatch, Field Officer My Day, Central Administrator Requests/Permissions/AI Review, and Citizen `/submit` Sindh pin validation in English LTR + Urdu RTL, plus `/track`, `/login`, and `/department/login`):
- **Total viewport/theme/route checks:** `75`
- **Maximum horizontal overflow:** `0px`
- **Uncaught runtime JS exceptions:** `0`
- **Interactive nav/button targets `< 42px`:** `0` (`smallTargetWarnings: []`)
- Visually inspected PNG captures (artifacts under conversation `screenshots/v14/`), catching and fixing the Admin theme contrast leak, Admin nav wrapping/mobile clipping, Dispatch card flex crushing, and Leaflet transition crash before re-verifying all automated tests.
- *(Note: after the Chrome CDP pass, a final 3-line dark-mode link accent tweak was added to `admin-portal.css` and verified via the full `npm run build`, `oxlint`, `vitest run`, `node --test`, and `python unittest` runs above.)*

---

## 4. Hosted Staging Boundary (Honest Status)

- **Remote Hosted Staging (`jvbulmmdwovtgaxojxhn`):** **NOT EXECUTED FROM THIS ENVIRONMENT.** Local review environment does not hold staging `VITE_SUPABASE_URL`, anon key, or staging service-role credentials, and staging Edge tests (`tests/edge/*_staging.mjs`) were excluded.
- **SQL Migration & Edge Function Deployment Required Before Staging Sign-Off:**
  1. Apply `supabase/migrations/20261205000000_v14_sindh_geo_and_dual_work_proof.sql` on staging `jvbulmmdwovtgaxojxhn`.
  2. Deploy updated `submit-classified-complaint` and `upload-department-work-proof` Edge Functions on staging `jvbulmmdwovtgaxojxhn`.
  3. Execute `tests/edge/v13_12_real_auth_staging.mjs` and real authenticated multi-photo + Sindh pin staging E2E.
