# AWAAZ-E-AWAM — V14 APPROVED FIGMA IMPLEMENTATION SPECIFICATION

Recorded: **25 November 2026**
Target Worktree: `D:\RomanUrdu_V13_19_Review`
Target Branch: `feature/v14-figma-portal-integration` (branched from verified `feature/v13-21-calm-operations-redesign` commit `c60858bea9f63aa55fe7b41bdd0dd34a505020a7`; rollback branch `checkpoint/v13-21-c60858b`)
Protected Primary Worktree: `D:\RomanUrdu_ComplaintClassifier_staff_auth` (untouched)
Staging Supabase Project Ref: `jvbulmmdwovtgaxojxhn` (Protected Production Ref: `akbwiedtmxjxcjscgitw` — untouched)

## 1. Authoritative Figma V3 Files (Education Plan `f24bdocs1m01043@iub.edu.pk`)

Only frames prefixed `V3 ·` constitute the approved design direction.

- **Department Head (100 V3 frames)**: `https://www.figma.com/design/dTKbWUPPyx2iu8dfk8e3MJ` (`page 0:1`)
- **Field Officer (70 V3 frames)**: `https://www.figma.com/design/uXt2jY9QoEysSctI3oplmO` (`page 0:1`)
- **Central Administrator (82 V3 frames)**: `https://www.figma.com/design/hlMJ7bE6QuzZiFqvgOXQ3H` (`page 0:1`)

## 2. Approved Visual System ("Atmospheric Civic Glass")

- **Typography**: `DM Sans` (`Regular`, `Medium`, `fontVariationSettings: "opsz" 14`, line-height `1.35`)
- **Light Theme**:
  - Canvas `#E8EDF0`, Surface `#F1F4F6`, Raised Surface `#DCE5EA`, Selected Surface `#D9E4EB`, Border `#C4D0D8`
  - Primary Text `#273746`, Secondary Text `#526575`, Primary Action `#426581`, Text Accent `#365875`
- **Dark Theme**:
  - Canvas `#202B35`, Surface `#283541`, Raised Surface `#344450`
  - Primary Text `#E1E8EE`, Secondary Text `#A9B9C6`, Primary Action `#436581`, Text Accent `#B1CADC`
- **Desktop Reference Geometry**: Floating pill nav `1120 × 56px` at `1440px` (`radius 28px`, `backdrop-blur`), main column `~960px`, Desktop H1 `38px`, Mobile H1 `28–30px`, Row title `17px`, Meta `13px`, Row height `80px`, Primary touch/action height `>= 44px`.
- **Constraints**: No permanent sidebars, no duplicate navs, no role-switching tabs, no black-and-gold palette, no oversized KPI cards, no generic SaaS dashboards, no excessive nested containers; preserve existing KMC/department authentication background artwork.

## 3. Portal & Feature Scope

1. **Independent Portal Routes**:
   - Department Head: `/department/head/login`, `/department/head/*`
   - Field Officer: `/department/officer/login`, `/department/officer/*`
   - Central Administrator: `/admin/login`, `/admin/*` (no public admin registration)
2. **Department Head Workflow**: Focus (`2–4` pending decisions), Complaints (searchable queue + detail inspection + acceptance/priority/classification disputes), 5-stage guided Assignment (Case -> Officer with real workload/5-verified-case rating rule -> Monday-first 7-day weekly capsule calendar in PKT -> Instructions -> Confirm, preserving state on back navigation), Extension review, Proof review & rework return, Officers roster, Archive, Workspace menu.
3. **Field Officer Workflow**: Independent sign-in, staff access request, My Day, Personal assignment list, Task details, Start work (`in_progress` persisted), Before/After photographic evidence + GPS evidence, Extension request, Returned work & resubmission, History. PII (`citizen names/phones`) redacted.
4. **Central Administrator Workflow**: Login, Pending requests & applicant inspection, Approve/Reject with reasons, Department/role/permission changes, Suspension & revocation, Classification dispute inspection & manual routing correction, Searchable audit ledger & event inspection.
5. **Sindh Geographical Eligibility**: Mandatory incident-location selection prior to citizen complaint submission; pinned local Sindh GeoJSON polygon/multipolygon+holes validation (never bbox, never client-trusted, never IP-only, never paid API); localized English & Urdu *"Outside our service region"* feedback preserving written text; server enforcement in `supabase/functions/submit-classified-complaint/index.ts` and database/RPC boundaries with structured codes (`LOCATION_REQUIRED`, `INVALID_COORDINATES`, `OUTSIDE_SINDH`, `UNSUPPORTED_SERVICE_AREA`, `LOCATION_VERIFICATION_UNAVAILABLE`) + separation between Sindh eligibility and per-department service coverage (e.g., Karachi municipal boundaries) + preventing orphaned uploads.
6. **Targeted Backend Repair**: Repair dual Before/After photo persistence in `supabase/functions/upload-department-work-proof/index.ts` and `department_work_evidence` (additive migrations preserving history, ownership/department/GPS/type/size validation, private storage signed retrieval, backward compatibility for single-photo historical records, partial upload recovery, 72h citizen review/dispute lifecycle).
7. **Invariants**: Preserve Roman Urdu classifier (max 2 auto-routed departments, causal-consequence filtering, frozen checkpoints, existing regression tests), $0.00 spending, real browser QA across `1440, 1024, 768, 393, 390, 320px` in Light & Dark, commit/push verified checkpoints to `feature/v14-figma-portal-integration`, deliver `docs/V14_IMPLEMENTATION_REPORT.md`.
