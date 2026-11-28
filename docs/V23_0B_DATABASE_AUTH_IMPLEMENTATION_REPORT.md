# AWAAZ-E-AWAM (آوازِ عوام) — V23.0B DATABASE RECONCILIATION, REAL AUTHENTICATION & BRANDING REPORT

## EXECUTIVE SUMMARY

- **Milestone:** V23.0B — Database Reconciliation, Real Authentication & Branding
- **Preceding Baseline:** `bbd4121` (V22.4.1 Final Citizen Portal, verified & frozen)
- **Checkpoint Tag:** `checkpoint/before-v23-0b-database-auth` at `fd06e99` (pushed to origin)
- **Active Development Branch:** `feature/v23-0b-database-auth-foundation`
- **Protected Primary Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (**100% UNTOUCHED**)
- **Authorized Execution Worktree:** `D:\RomanUrdu_V13_19_Review`
- **Financial Expenditure:** Strictly **\$0.00** (Zero paid dependencies, zero card requirements)

---

## 1. OFFICIAL BRAND ASSET GENERATION & INTEGRATION (OBJECTIVE 1)

### Visual Foundation & Mathematical Geometry
The project owner approved the official Awaaz-e-Awam brand identity featuring a solid deep maroon background (`#761D30`) with a pure white letter **`آ`** (Alif with Madda) centered inside:
- **Geometry:** 512×512 square with corner radius `rx="112"` (21.875% curvature for squircle aesthetic).
- **Typography Source:** Exact glyph path extracted mathematically from **Noto Sans Arabic Bold (SIL Open Font License v1.1)** using OpenType font parsing in headless Chrome CDP via `tools/ai_factory/generate_brand_assets.mjs`.
- **Glyph Positioning:** Pure font-independent SVG `<path>` centered at coordinates (256, 256), bounding box width 121.46px, height 310.00px.

### Generated Asset Inventory
All 12 required brand assets were generated and verified:
1. `public/logo.svg` (512×512 master vector logo)
2. `src/assets/logo.svg` (Source asset for Vite imports)
3. `public/favicon.svg` (SVG browser favicon)
4. `public/pwa-icon.svg` (PWA application icon)
5. `public/pwa-icon-maskable.svg` (PWA maskable icon with safe-zone margin)
6. `public/favicon-16x16.png` (16×16 standard favicon)
7. `public/favicon-32x32.png` (32×32 standard favicon)
8. `public/apple-touch-icon.png` (180×180 iOS home screen icon)
9. `public/android-chrome-192x192.png` (192×192 Android launcher icon)
10. `public/android-chrome-512x512.png` (512×512 Android launcher icon)
11. `public/favicon.ico` (Multi-layer ICO container)
12. `public/og-image.png` (1200×630 OpenGraph / Twitter preview card)

### Application Components Updated
- `src/components/common/AwaazLogo.tsx` (New unified branded logo component supporting sizes `xs`, `sm`, `md`, `lg`, `xl`, standalone icon or lockup with bilingual Urdu/English typography)
- `src/components/common/CivicEmblem.tsx` (Updated to render official maroon vector logo)
- `src/components/layout/PublicHeader.tsx` (Integrated `AwaazLogo`)
- `src/features/department/auth/StaffRoleChoiceGateway.tsx` (Updated brand header)
- `src/features/department/auth/HodLoginPage.tsx` (Updated brand emblem)
- `src/features/department/auth/OfficerLoginPage.tsx` (Updated brand emblem)
- `src/features/department/auth/StaffDepartmentSelection.tsx` (Updated brand emblem)
- `index.html` (Linked SVG favicon, apple-touch-icon, and OpenGraph metadata)
- `public/manifest.json` & `public/manifest.webmanifest` (Updated PWA branding and theme color `#761D30`)

---

## 2. SUPABASE ENVIRONMENT VERIFICATION (OBJECTIVE 2)

- **Production Project Reference:** `akbwiedtmxjxcjscgitw` (`awaaz-e-awam-db`)
- **Staging Project Reference:** `jvbulmmdwovtgaxojxhn` (`awaaz-e-awam-staging`)
- **Environment State Truth:**
  - In `D:\RomanUrdu_V13_19_Review`, no `.env.local` exists. The application functions in unconfigured demonstration mode when environment variables are omitted.
  - When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided, `isSupabaseConfigured()` evaluates to `true`.
  - In production (`import.meta.env.PROD = true`), unconfigured state safely halts authentication with `'Staff sign-in is not configured'` rather than falling back to demo records.

---

## 3. DATABASE SCHEMA RECONCILIATION (OBJECTIVE 3)

### Migration Details
- **File:** `supabase/migrations/20261208000000_v23_0b_database_reconciliation.sql`
- **Safety:** Completely additive, lock-safe, idempotent, with `IF NOT EXISTS` / `OR REPLACE` semantics.

### Reconciled Components
1. **Operational Model Truth:**
   - Formalized `department_work_orders` as the authoritative operational model for V16, V19, and V23.
   - Retained legacy `incident_cases` table for backward compatibility without breaking foreign keys.
   - Created `v23_operational_cases_view` bridging work orders with complaint references.
2. **Storage Path Traversal Protection:**
   - Added regex CHECK constraints `chk_complaint_evidence_storage_path` and `chk_department_work_evidence_storage_path` preventing directory traversal (`..`) and enforcing UUID format keys.
3. **Multi-Department Partial Resolution Synchronization:**
   - Implemented `v23_sync_multi_dept_complaint_status(p_complaint_id)` and trigger `trg_v23_work_order_status_sync`.
   - When one department approves their work order, parent complaint updates to `'partly_resolved'`. When all linked orders are verified, parent status updates to `'resolved'`.
4. **Server-Side Proximity Calculation:**
   - Implemented `v23_haversine_distance_meters(lat1, lon1, lat2, lon2)` using exact spherical Earth radius 6,371,000 meters.
5. **Secure Administrative HOD Provisioning:**
   - Implemented `v23_admin_provision_initial_hod(user_id, department_id, full_name, email)` with `is_main_admin` caller verification, atomic profile and `department_memberships` creation, and `access_audit_log` audit entries.
6. **Private Storage Buckets & Policies:**
   - Created buckets `complaint-evidence-private` (5MB), `department-work-proof-private` (5MB), `staff-profile-photos-private` (2MB) with `public = false`.
   - Added RLS policies restricting profile photo uploads to the authenticated user and downloads to active Department Heads or Main Admins.

---

## 4. REAL AUTHENTICATION & LIVE MOCK FALLBACK PREVENTION (OBJECTIVES 4, 5, 6, 9)

### Citizen Authentication (`LoginPage.tsx`)
- Directly connected to `supabase.auth.signInWithPassword({ email, password })`.
- Role verification checks `profiles.role === 'citizen'`. Department staff attempting citizen login are immediately signed out and directed to the staff login portal.
- All network or authentication errors are displayed cleanly to the user. No fallback bypass.

### Department Head Authentication (`HodLoginPage.tsx` / `staffAuthService.ts`)
- Department Head signs in with departmental username or official email.
- Boundary checks verify `department_memberships.staff_role === 'head'` and `department_memberships.status === 'active'`.
- Officer credentials attempting HOD login are rejected with:
  > *"This sign-in is reserved for Department Heads. Your account belongs to the Field Officer workspace and is not authorized for the Department Head workspace."*
- Cross-department login attempts (e.g. KMC head logging into KW&SC) are rejected at the server boundary with `'wrong_department'`.

### Field Officer Authentication (`OfficerLoginPage.tsx` / `staffAuthService.ts`)
- Field Officer signs in with username/email and access key.
- Boundary checks verify `department_memberships.staff_role === 'officer'` and `department_memberships.status === 'active'`.
- Head credentials attempting Officer login are rejected with:
  > *"This sign-in is for Field Officers. Your account belongs to the Department Head workspace and is not authorized for the Field Officer workspace."*
- Suspended or revoked accounts are blocked and signed out immediately with the documented reason displayed.

### Elimination of Live Mock Fallback
- In `staffAuthService.ts`:
  - When `isSupabaseConfigured() && supabase` is true, all authentication requests execute against Supabase GoTrue and PostgreSQL RPCs.
  - Failures (network errors, invalid credentials, suspended status) return immediately.
  - The code path to `localSupabaseAdapter` is completely bypassed.
  - In production builds (`import.meta.env.PROD = true`), unconfigured environments safely return `'unavailable'` rather than demo simulation.

---

## 5. OFFICER PROVISIONING & ONBOARDING OTP TRUTH (OBJECTIVES 7 & 8)

### Provisioning Mechanism: Option A (Server-Side Edge Function)
- Implemented in `supabase/functions/manage-department-officers/index.ts`.
- The browser client **NEVER** holds or accesses the Supabase `service_role` key.
- The active Department Head calls the function with their user JWT.
- The function verifies:
  1. Caller JWT validity and AAL2 MFA status.
  2. Caller has an active `head` membership in the specified department.
  3. Rate limiting (max 20 mutations per minute).
- The function invokes `admin.auth.admin.createUser` server-side:
  - Generates high-entropy 18-character temporary access key.
  - Sets synthetic email `staff+{dept}.{employeeId}@awaaz-e-awam.org`.
  - Sets `must_change_password: true`.
- Atomically creates `profiles` record and `department_memberships` record with rollback on failure.
- Returns temporary access key once in memory to the HOD for physical handover.

### Honest First-Login OTP Assessment
- **Default Supabase SMTP:** Free tier allows only 3-4 emails/hour. Completely insufficient for multi-officer onboarding.
- **Custom SMTP Providers (Brevo, Resend, SendGrid):**
  - Brevo free tier: 300 emails/day, no credit card required.
  - Resend free tier: 100 emails/day, requires custom domain DNS (SPF/DKIM/DMARC).
- **SMS / WhatsApp Gateways:** All providers (Twilio, infobip) require paid accounts and credit card billing.
- **Honest System Architecture:**
  - The Edge Function now handles `action: 'verify_onboarding_otp'`.
  - When external SMTP is not configured, onboarding falls back to temporary access key + immediate forced password reset (`complete_first_login_password`), which is 100% functional, secure, and card-free.
  - No fake claims of SMS/email delivery are presented to the user.

---

## 6. CLASSIFIER EDGE-HOSTING FEASIBILITY (OBJECTIVE 12)

### Empirical Benchmark Results
Benchmarked using `scripts/benchmark_classifier_edge.mjs` and verified through `src/test/V13_2_Benchmark.test.ts`:

| Metric | Run004 (Baseline) | Run006 (Enhanced Candidate) | Supabase Deno Limit | Feasibility Status |
| :--- | :--- | :--- | :--- | :--- |
| **File Size** | 1.89 MB (1,981,209 B) | 5.49 MB (5,756,571 B) | 20.00 MB Bundle | **Feasible (27.5% of limit)** |
| **JSON Parse Time** | 6.19 ms | 14.92 ms | 50.00 ms CPU | **Feasible (29.8% of limit)** |
| **Heap Memory Delta**| 2.91 MB | 6.75 MB | 150.00 MB Free Tier | **Feasible (4.5% of limit)** |
| **Mean Inference Time**| 2.95 ms (full engine) | 2.89 ms (full engine) | 50.00 ms CPU | **Ultra-Fast (<3 ms)** |
| **p95 Latency** | 5.35 ms | 3.34 ms | 50.00 ms CPU | **Ultra-Fast (<4 ms)** |
| **Holdout Exact Acc**| 83.8% (500 cases) | **88.6% (500 cases)** | N/A | **+4.8% Superiority** |
| **Holdout Macro F1** | 93.57% | **95.42%** | N/A | **+1.85% Superiority** |

**Conclusion:** Hosting Run006 directly inside a Supabase Deno Edge Function without a separate Python backend is **100% feasible, production-ready, and incurs $0.00 hosting cost**.

---

## 7. RESOLUTION OF OUTSTANDING DOCUMENTATION INCONSISTENCIES (OBJECTIVE 13)

1. **Sindh vs Karachi Municipal Scope:**
   - *Clarification:* The operational service pilot encompasses the Karachi metropolitan area (KMC, KW&SC, K-Electric, SSGC, SSWMB, SBCA) under the governance authority of the Government of Sindh (GoS). The backend boundary system (`sindh-boundary.json`) is designed for province-wide expansion, but current operational routing applies to Karachi municipal jurisdictions.
2. **Server-Side GPS Verification vs Physical Spoofing:**
   - *Clarification:* Server-side Haversine verification prevents client-side logic tampering (i.e. clients cannot bypass proximity thresholds or alter distance calculations in JavaScript). However, mathematical calculations rely on device-reported coordinates. True physical presence verification requires physical operational countermeasures (dual photo evidence, supervisor verification, and timestamp verification).
3. **Multi-Department Complaint Lifecycle:**
   - *Clarification:* Multi-department complaints maintain independent work orders per department. The parent complaint transitions to `'partly_resolved'` when at least one department verifies work, and transitions to `'resolved'` only when all assigned departments confirm verification.

---

## 8. PORTAL DEPLOYMENT ARCHITECTURE SUMMARY (OBJECTIVE 11)

- Three independent deployment targets:
  - `awaaz-e-awam.pages.dev` (Citizen Portal)
  - `aea-management.pages.dev` (Department Head Console)
  - `aea-fieldwork.pages.dev` (Field Officer Console)
- Supported via Vite environment targeting (`VITE_PORTAL_TARGET`) or domain-aware routing.
- Complete Cloudflare Pages deployment configuration and rewrite rules documented in `docs/V23_0B_PORTAL_DEPLOYMENT_ARCHITECTURE.md`.

---

## 9. VERIFIED COMMIT AUDIT TRAIL

| Commit Hash | Commit Type & Subject | Key Files Affected |
| :--- | :--- | :--- |
| `fd06e99` | Baseline Tag `checkpoint/before-v23-0b-database-auth` | Clean git baseline before V23.0B |
| `880c581` | `feat(v23.0b): add approved awaaz-e-awam brand assets` | 12 logo assets, `AwaazLogo.tsx`, auth screens, index.html |
| `a8905d9` | `fix(v23.0b): reconcile database schema and migration dependencies` | `20261208000000_v23_0b_database_reconciliation.sql` |
| `1af157f` | `feat(v23.0b): connect citizen and staff authentication` | `src/lib/supabase.ts`, `src/services/staffAuthService.ts` |
| `d2e5fe9` | `feat(v23.0b): secure officer provisioning and onboarding` | `supabase/functions/manage-department-officers/index.ts` |
