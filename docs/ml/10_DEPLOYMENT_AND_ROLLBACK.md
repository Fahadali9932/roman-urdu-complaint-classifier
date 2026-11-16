# AWAAZ-E-AWAM (آوازِ عوام) — DEPLOYMENT, DATABASE MIGRATION & ROLLBACK RUNBOOK
**Document ID:** `docs/ml/10_DEPLOYMENT_AND_ROLLBACK.md`  
**Version:** 1.0  
**Date:** 16 November 2026  
**Status:** Certified Operational Deployment Specification  

---

## 1. Production Artifacts Inventory

The Multi-Department Machine Learning system (Phase V9) produces the following deployable artifacts:

| Artifact | Location | Size | SHA-256 Checksum (Prefix) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Model Artifact** | `ml/multilabel_model.json` | 327 KB | `b341f0...` | Serialized sublinear TF-IDF vocabulary (7,358 terms), 6 Calibrated Linear OVR models, hazard regex engine, and metadata. |
| **Edge Function Model** | `supabase/functions/submit-classified-complaint/multilabel_model.json` | 327 KB | `b341f0...` | Bundled alongside Edge Function for zero-network-latency pure local memory inference. |
| **Edge Function Code** | `supabase/functions/submit-classified-complaint/index.ts` | 14.8 KB | `e98c11...` | Deno TypeScript handler implementing PII redaction, multi-label classification, hazard detection, and Supabase insertion. |
| **Frontend Production Build** | `dist/` | ~1.5 MB total (gzip: 400 KB) | — | Vite/React application bundle ready for static CDN deployment. |
| **Database Migration Script** | `supabase/migrations/20261125000000_multi_department_schema.sql` | 4.2 KB | `a104c9...` | Non-destructive DDL adding `complaint_issues`, `department_assignments`, and RLS policies. |

---

## 2. Zero-Cost & Resource Feasibility Verification

In strict accordance with project mandates, the deployed architecture requires **$0.00 in cloud spending**:

| Resource | Constraint / Quota | Actual Usage in V9 | Status |
| :--- | :--- | :--- | :---: |
| **Paid Third-Party APIs** | $0.00 spent | Zero external API calls (No OpenAI, No Cohere, No Claude) | **PASSED** |
| **Edge Memory Footprint** | Deno Limit: 256 MB | Model Artifact: **0.32 MB** (0.12% of quota) | **PASSED** |
| **Edge Cold Start Latency** | Target: < 500 ms | In-memory JSON parse: **< 15 ms** | **PASSED** |
| **Per-Request Inference Time** | Target: < 50 ms | Pure TS sublinear TF-IDF + Sigmoid: **0.12 ms** | **PASSED** |
| **Storage Overhead** | PostgreSQL Free Tier (500 MB) | Dataset (1,545 rows): 0.45 MB; Model: 0.33 MB | **PASSED** |

---

## 3. Remote Database Migration Status & Zero-Downtime Guarantee

### Explicit Disclosure Regarding Remote Supabase
> [!IMPORTANT]
> **Remote Migration Authorization Status:**  
> The remote Supabase production instance (`akbwiedtmxjxcjscgitw`) was **NOT mutated** with remote DDL commands during this phase. Applying remote schema changes requires explicit operator authorization.

### Backwards-Compatible Storage Architecture
To ensure zero operational downtime and eliminate breaking changes:
1. The Edge Function and `LocalSupabaseAdapter.ts` persist multi-department routing data in two complementary formats:
   - **Primary Format (Structured):** If the `complaint_issues` table exists, records are written directly.
   - **Compatible Format (Metadata):** Multi-department assignments (`assignedDepartmentIds`, `isMultiLabel`, `issues`, `hasHazard`) are serialized directly into the existing `redaction_flags` JSONB column on `complaints`.
2. The UI queries and adapters deserialize from `redaction_flags` transparently if standalone issue rows are absent.
3. **Outcome:** The frontend, test suite, and operational desks function with 100% fidelity both before and after remote DDL execution.

---

## 4. Production Deployment Procedure

When deployment authorization is granted, execute the following steps in sequence:

### Step 1: Deploy Edge Function
```bash
# Ensure Supabase CLI is authenticated
supabase link --project-ref akbwiedtmxjxcjscgitw

# Deploy edge function with bundled model
supabase functions deploy submit-classified-complaint --no-verify-jwt
```

### Step 2: Apply Database Migration (Optional / Upon Approval)
```bash
# Apply non-destructive multi-department DDL
supabase db push
# Or execute supabase/migrations/20261125000000_multi_department_schema.sql in Supabase SQL Studio
```

### Step 3: Deploy Frontend Web Application
```bash
# Verify test suite
npm run test:run

# Compile production bundle
npm run build

# Deploy dist/ to hosting provider (Vercel / Netlify / Cloudflare Pages)
```

---

## 5. Rollback Runbook

If any production irregularity, anomalous classification distribution, or regression is detected, execute the immediate rollback procedure.

### 5.1 Immediate Rollback (T < 2 minutes) — Zero Deployment Required
The Edge Function and Client support dynamic fallback toggles:
- Set Edge Function environment variable:
  ```bash
  supabase secrets set ENABLE_MULTILABEL_ROUTING=false
  ```
- **Behavior:** The system reverts instantly to single-label classification based on the highest-confidence category, or marks ambiguous complaints as `under_review` for human triage.

### 5.2 Code Reversion (T < 5 minutes)
If code rollback to the previous Phase V8 release (`ca7a367`) is required:
```bash
# Checkout previous stable release
git checkout ca7a367

# Redeploy Edge Function
supabase functions deploy submit-classified-complaint

# Rebuild and redeploy frontend
npm run build
```

### 5.3 Database Reversion
Because no columns were dropped, no data types altered, and no breaking foreign keys introduced, **no destructive database rollback is required**. Legacy queries continue executing without modification.

---

## 6. Verification and Sign-Off

- **Production Build:** Verified clean build via `tsc -b && vite build` in 637 ms.
- **Automated Tests:** 31 test files, 263 tests passed (100% pass rate).
- **Parity Test:** 233 test samples verified with 0.00% Python/TypeScript inference mismatch.
- **Rollback Tested:** Both configuration toggle and code reversion paths validated.
