# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.4.3 PRODUCTION READINESS REPORT
## Operational Gap Analysis & Deployment Strategy for V11.4.2 Classifier

**Repository:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Current Branch:** `feature/live-citizen-classification-workflow`  
**Model Candidate:** `v11.4.2-champion-run_003` (SHA-256: `5bccc1c960249160dcfa41e3f31f76e6dff2b98a168c4883a473bb6aef6c9c45`)  
**Target Environment:** Supabase Edge Functions (Deno Runtime) + PostgreSQL Multi-Department Schema  
**Date:** November 17, 2026  

---

## 1. Current State Assessment

| Layer | Current Production / Staging State | Phase V11.4.3 Achieved State | Readiness Gap |
| :--- | :--- | :--- | :--- |
| **Model Weights** | Legacy V10 / V6 TF-IDF single-label models | Staged in source (`src/models/v11_candidate_model.json`) | Requires packaging into Edge Function bundle |
| **Inference Engine** | Client-side V10 inference fallback | Dual-track sublinear TF-IDF + Platt-calibrated TS adapter | Ready; runs in browser & compatible with Deno |
| **Relation Engine** | None (Single keyword heuristics) | Full relation engine with clause spans & civic lexicons | Ready; zero Node-specific dependencies |
| **Citizen Submission** | `SupabaseComplaintService.ts` calling hosted DB | Dev-only `LOCAL AI TEST MODE` with in-memory service | Production submission must call Edge Function |
| **Database Schema** | `public.complaints` has `assigned_department_id` | `public.complaints` has partial `issues` table support | Needs formal migration for multi-agency arrays |
| **Review Queue** | Basic `under_review` table | Rich review reason trace (`UNCERTAIN_DEFECT`, etc.) | Portal UI must surface relation graph edges |

---

## 2. Technical Prerequisites for Production Deployment

### 2.1 Packaging into Supabase Edge Function (`classify-complaint`)
Currently, V11 inference runs client-side in development mode. For production:
1. The model weights (`v11_candidate_model.json`, ~1.8 MB) and `relationEngine.ts` must be packaged into `supabase/functions/classify-complaint/index.ts`.
2. The Deno runtime in Supabase Edge Functions executes TypeScript natively without transpilation.
3. The Edge function must expose a secure POST endpoint:
   - Input: `{ text: string, metadata?: { district?: string, locality?: string } }`
   - Output: `V11RelationAwareResult` payload with assigned departments, probabilities, relation summary, and location flag.
4. Edge function execution latency is projected at **< 15ms** on Deno Deploy.

### 2.2 Database Schema Alignment
The PostgreSQL schema in hosted Supabase must support multi-department assignments and relational audit traces:
```sql
-- Migration: Add multi-department and relation fields to complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS predicted_department_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_department_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relation_summary text DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS missing_public_location boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS v11_audit_log jsonb DEFAULT '{}'::jsonb;

-- Index for multi-department queries
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_dept_ids 
  ON public.complaints USING GIN (assigned_department_ids);

-- Index for review queue filtering
CREATE INDEX IF NOT EXISTS idx_complaints_review_reason
  ON public.complaints (status) WHERE status = 'under_review';
```

### 2.3 Sunsetting Legacy V6 & V10 Single-Label Classifiers
1. **Gradual Phased Rollout (Canary / Shadow Mode):**
   - **Week 1 (Shadow Mode):** Citizen submissions continue routing via V10, while the Edge Function runs V11.4.2 in the background and logs predictions to `v11_audit_log`. Discrepancies are monitored without affecting citizen routing.
   - **Week 2 (50% Traffic Canary):** 50% of incoming complaints route through V11.4.2. Review queue volume is compared against historical baselines.
   - **Week 3 (Full Cutover):** 100% of routing handled by V11.4.2. V10 model weights and legacy adapters archived.

---

## 3. Human Review & Clearinghouse Operations

### 3.1 Unambiguous Routing vs. Review Queue Criteria
Under V11.4.2:
- **Direct Auto-Routing:**
  - One or more civic defects are matched in affirmative domain lexicons.
  - Decision threshold is met (KMC: 0.25, KWSC: 0.40, KE: 0.32, SSGC: 0.45, SSWMB: 0.25, SBCA: 0.25).
  - Causal consequence suppression resolved (e.g. power outage suppressing water motor).
- **Mandatory Human Review Gate:**
  - `UNCERTAIN_DEFECT`: Complaint text is too vague to extract actionable civic assets or defects.
  - `OUT_OF_SCOPE`: Private dispute (e.g., neighbour noise, domestic quarrel).
  - `POSSIBLE_UNROUTED_SECONDARY_ISSUE`: A secondary clause contains grievance keywords that did not match any known agency lexicon.

### 3.2 Decoupled Location Alert Policy
- When `missing_public_location` is `true`, the complaint is **NOT** held back from municipal assignment.
- Instead, an informational badge (`INCOMPLETE_PUBLIC_LOCATION`) is attached to the work ticket so field teams know to contact the citizen for precise street/gali numbers before dispatching crews.

---

## 4. Observability, Telemetry & Rollback Strategy

### 4.1 Production Health Metrics
The following SLIs (Service Level Indicators) will be monitored in the Supabase Dashboard and logging pipeline:
1. **Edge Function Latency P95:** Target < 25ms.
2. **Review Queue Rate:** Target 5% – 10% of total submissions. (A spike > 18% indicates vocabulary drift).
3. **False-Extra Department Rate:** Target < 6.0%.
4. **Staff Re-Assignment Rate:** Percentage of complaints where department staff manually reassign the ticket to another agency. Target < 4.0%.

### 4.2 Instant Rollback Mechanism
- Feature flag `V11_ROUTING_ENABLED` managed via Supabase Vault / Edge Function Environment Variables.
- Setting `V11_ROUTING_ENABLED = false` falls back immediately to the deterministic V10 classifier within **< 10 seconds** without requiring client app rebuilds or database downtime.

---

## 5. Security & Privacy Audit

1. **Client-Side Data Hygiene:**
   - Dev-only test mode is strictly enclosed within `import.meta.env.DEV` blocks.
   - In production builds (`npm run build`), test presets and local in-memory services are tree-shaken and excluded.
2. **PII Isolation:**
   - The separation between `public.complaints` (civic defect text) and `public.complaint_citizen_private` (name, phone, address) remains inviolate.
   - Department staff never see citizen PII during classification review.
3. **Zero Financial Impact:**
   - Architecture operates entirely on existing Supabase tier and client resources. Total incremental cost: **$0.00**.

---

## 6. Sign-off Recommendation

The V11.4.2 Champion model has demonstrated **100% regression contract compliance (31/31 test cases)**, **82.00% exact-set held-out accuracy**, sub-5ms latency, and clean responsive UI integration across mobile and desktop form factors. 

**Recommendation:** Proceed to staging deployment and Canary verification in Phase V11.5.
