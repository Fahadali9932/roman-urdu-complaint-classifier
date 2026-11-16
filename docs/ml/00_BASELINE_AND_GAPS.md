# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V9 BASELINE AUDIT AND GAP SPECIFICATION
**Document ID:** `docs/ml/00_BASELINE_AND_GAPS.md`  
**Date:** 16 November 2026  
**Status:** Audited Baseline & Empirical Gap Analysis  
**Repository Branch:** `feature/live-citizen-classification-workflow`  
**Base Commit:** `ca7a367`  

---

## 1. Executive Summary & Inventory

This document establishes the verified baseline state of the Awaaz-e-Awam Roman Urdu complaint classification, data model, and departmental routing subsystem prior to Phase V9 execution.

### 1.1 Environment & Tooling Inventory
* **Local Codebase Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth`
* **Active Git Branch:** `feature/live-citizen-classification-workflow` (Clean tree at commit `ca7a367`)
* **Node & Runtime:** Node v20+, Vite 5.1, Vitest 5.1.0, TypeScript 5.5
* **Supabase Client & CLI:** `@supabase/supabase-js` 2.45, Supabase CLI v3.1.0 (local via npx)
* **Python Runtime:** Python 3.14.5 (Windows x64)
* **Python ML Stack:** `scikit-learn 1.7.2`, `numpy 2.5.2`, `scipy 1.18.1`, `joblib 1.6.0`, `onnxruntime 1.28.0` (Note: PyTorch / Hugging Face Transformers are not installed in the global environment; Transformer challenger B2 is evaluated under resource-constrained feasibility guidelines)
* **Baseline Test Suite Status:** 30 test files, 235 Vitest tests passing cleanly (100% pass rate).

### 1.2 Verified Active Municipal Taxonomy
The system operates across six (6) authoritative municipal service agencies in the Karachi metropolitan region:
1. `kwsc` — Karachi Water & Sewerage Corporation (Water supply outages, water main bursts, sewage overflows, contaminated water)
2. `kelectric` — K-Electric (Power outages, transformer faults, sparking wires, fallen electric poles, low voltage)
3. `sswmb` — Sindh Solid Waste Management Board (Garbage accumulation, uncleaned dumpsters, municipal debris, street sweeping)
4. `ssgc` — Sui Southern Gas Company (Gas pipeline leakage, low gas pressure, gas outages, illegal suction pumps)
5. `kmc` — Karachi Metropolitan Corporation / DMCs (Road potholes, broken footpaths, flyover joint damage, street lighting, public park maintenance, storm drain clearinghouse)
6. `sbca` — Sindh Building Control Authority (Illegal construction, unauthorized extra floors, structural cracks, hazardous dilapidated buildings)

---

## 2. Baseline Architecture Audit (As-Is)

### 2.1 Citizen Submission Flow
1. **Entry Points:**
   - Authenticated Citizen: Via `SimplifiedComplaintForm.tsx` / `ComplaintFormContainer.tsx`.
   - Guest Citizen: Via Guest complaint flow producing an unauthenticated cryptographic 24-digit tracking number (`guest_tracking_number`) and private claim digest (`claim_code`).
2. **Inference Execution:**
   - Live flow invokes Supabase Edge Function `submit-classified-complaint` (`supabase/functions/submit-classified-complaint/index.ts`).
   - The Edge Function loads `model.json` (exported single-label multinomial logistic regression).
   - In-memory pure TypeScript tokenizer extracts word unigrams and bigrams (`\b\w\w+\b`).
   - Features are weighted by precomputed IDF and L2-normalized.
   - Decision scores are computed via linear combination: $\text{score}_c = \text{intercept}_c + \sum_i w_{c, i} \cdot x_i$.
   - Probabilities are generated via standard softmax: $P(c) = \frac{\exp(\text{score}_c)}{\sum_k \exp(\text{score}_k)}$.
   - Thresholding: If `confidence < 0.50` or `margin < 0.15`, the complaint is marked `needsReview = true`, assigned department is set to `NULL`, and status is set to `under_review`. Otherwise, it routes to `top1_department` with status `assigned`.
3. **Database Insertion:**
   - The Edge Function calls `public.submit_citizen_complaint` RPC (`supabase/migrations/20261121000000_intelligent_privacy_and_sanitization.sql`).
   - Public data (`reference_number`, `sanitized_description`, `generated_heading`, `factual_summary`, `incident_district`, `incident_locality`, `incident_public_location`, `assigned_department_id`, `status`) is inserted into `public.complaints`.
   - Sensitive private citizen details (`citizen_name`, `citizen_phone`, `citizen_email`, `residential_address`, `raw_description`) are strictly isolated in `public.complaint_citizen_private` with RLS restricting access exclusively to the owning citizen.

### 2.2 Baseline Model Specifications & Measured Performance
* **File:** `ml/train_and_export_final_model.py`
* **Artifact:** `ml/model.json` (294 KB)
* **Dataset:** `ml/data/full_dataset_780.csv` (780 samples, 130 per class across 6 classes)
  - Train/Dev: `ml/data/train_dev_set.csv` (600 samples, 100 per class)
  - Frozen Test: `ml/data/frozen_test_set.csv` (180 samples, 30 per class)
* **Evaluation on Frozen Test Set (Single-Label Multi-Class):**
  - **Overall Accuracy:** 90.56% (163 / 180 correct) — 95% Bootstrap CI: [85.56%, 95.00%]
  - **Macro-F1 Score:** 0.9044 — 95% Bootstrap CI: [0.8524, 0.9491]
  - **Per-Class Breakdown:**
    - `kelectric`: Precision 90.00%, Recall 90.00%, F1 0.9000 (Support 30)
    - `kmc`: Precision 85.29%, Recall 96.67%, F1 0.9062 (Support 30)
    - `kwsc`: Precision 90.32%, Recall 93.33%, F1 0.9180 (Support 30)
    - `sbca`: Precision 96.67%, Recall 96.67%, F1 0.9667 (Support 30)
    - `ssgc`: Precision 89.66%, Recall 86.67%, F1 0.8814 (Support 30)
    - `sswmb`: Precision 92.59%, Recall 83.33%, F1 0.8772 (Support 30)
  - **Review Threshold Effectiveness:** Of the 17 classification errors, 12 (70.6%) fell below the confidence/margin threshold and were correctly flagged for human review.

---

## 3. High-Risk Architectural Unknowns & Identified Gaps

### 3.1 Gap 1: Single-Label Softmax Constraint vs. Multi-Department Reality
* **Current State:** The classifier utilizes a single softmax normalization $\sum_{c=1}^6 P(c) = 1.0$. If a citizen submits a compound complaint describing two genuine municipal emergencies (e.g., *"Gali mein gutter ka ganda pani bhara hua hai aur bijli ka khamba bhi tedha ho kar taar zameen par gir gaya hai"*), the softmax forces a zero-sum competition between `kwsc` and `kelectric`. One department receives a high or split probability; the other is completely suppressed or discarded.
* **Phase V9 Requirement:** Transition to a **multi-label architecture** utilizing independent sigmoid heads with binary cross-entropy loss:
  $$\sigma(z_c) = \frac{1}{1 + \exp(-z_c)}$$
  Each department receives an independent calibrated probability $p_c \in [0, 1]$, allowing detection of $0, 1, 2,$ or more concurrent municipal service issues.

### 3.2 Gap 2: Character N-Gram & Spelling Variation Vulnerability
* **Current State:** The baseline vectorizer relies exclusively on word-level unigrams and bigrams (`ngram_range=(1, 2)`). In Roman Urdu, informal phonetic transliteration produces extreme orthographic variance (e.g., `bijli`, `bijlee`, `bijlii`, `bijly`; `paani`, `pani`, `pany`; `khadda`, `khada`, `gadda`, `ghada`; `gutter`, `gutar`, `guttere`). Words with unregistered spelling variations become out-of-vocabulary (OOV) tokens, dropping feature weight to zero.
* **Phase V9 Requirement:** Incorporate **sub-word character n-grams** (3–5 grams within word boundaries) alongside word unigrams and bigrams. This ensures morphologically related Roman Urdu transliterations retain substantial cosine similarity and fire appropriate feature weights.

### 3.3 Gap 3: Calibrated Per-Department Thresholds vs. Arbitrary Heuristic
* **Current State:** The current system applies an arbitrary static threshold (`confidence < 0.50` or `margin < 0.15`). In multi-label classification, different municipal departments have different base rates, token distributions, and cost asymmetries (e.g., high-risk electrical hazards vs. routine street sweeping).
* **Phase V9 Requirement:** Fit independent probability thresholds $\tau_c$ per department on a held-out validation split, optimizing for $\ge 0.95$ precision on auto-routed predictions while maintaining audited coverage.

### 3.4 Gap 4: Decoupled Safety / Hazard Escalation
* **Current State:** Safety flags are mixed with redaction flags in `privacy-engine.ts`. If an open live wire is detected, it does not reliably trigger an urgent priority workflow or notify the clearinghouse unless the department classifier also happens to route it. Furthermore, conversational negations (*"shukar hai koi taar nahi toota"*) risk tripping simple keyword-based hazard triggers.
* **Phase V9 Requirement:** Implement a dedicated, explainable safety and hazard detector that isolates affirmative life-safety hazards (fallen electric wires, high-pressure gas leaks, impending building collapses) while respecting syntactic negations.

### 3.5 Gap 5: Issue Clause Extraction & Multi-Department Data Contract
* **Current State:** In `public.complaints`, each complaint record has a single `assigned_department_id` and a single `status`. There is no first-class relational entity representing distinct actionable issues under a shared parent complaint.
* **Phase V9 Requirement:** Formalize three distinct concepts:
  1. **Complaint:** One citizen-authored report with one public reference (`KHI-2026-XXXXXXXX`) and immutable receipt.
  2. **Actionable Issue:** One distinct municipal service defect extracted from the text with evidence spans and proposed department.
  3. **Department Assignment:** A jurisdiction-authorized work item assigned to an agency, with its own lifecycle (`assigned`, `accepted`, `in_progress`, `completed`, `rejected`).
  Citizen tracking must synthesize a single truthful aggregate status without violating departmental privacy boundaries.

### 3.6 Gap 6: Deno Edge Runtime Feasibility & Zero Route-Label Parity
* **Current State:** Python models cannot run inside Supabase Deno Edge Functions (256 MB memory limit, no native Python runtime). The TypeScript inference in `submit-classified-complaint/index.ts` must exactly mirror Python's feature extraction, tokenization, IDF scaling, sigmoid activation, and decision thresholds.
* **Phase V9 Requirement:** Export an audited `multilabel_model.json` artifact and engineer an isomorphic TypeScript inference engine in `src/services/multiLabelClassifier.ts`. Parity must be mathematically verified across a minimum of 200 held-out examples with zero unexplained route-label discrepancies.

---

## 4. Key Architectural Risks (Top 5)

1. **Remote Schema Mutation Constraints:**
   - Public-hosted Supabase database at `akbwiedtmxjxcjscgitw` has strict migration policies. Uncontrolled remote migrations are prohibited.
   - *Mitigation:* Design the multi-department issue data contract such that it functions seamlessly within existing schema columns (using structured JSON/array metadata on `complaints` and `complaint_timeline_events`) while providing a clean relational migration path for staging/local environments.
2. **Multi-Label Dataset Provenance & Grouped Split Leakage:**
   - Real Roman Urdu multi-department municipal complaints are scarce in public corpora. Concatenating templates can introduce artificial correlations and severe split leakage if sibling variants cross train/val/test splits.
   - *Mitigation:* Implement strict `template_family_id` grouping in dataset curation, preventing sibling templates from appearing across partitions. Maintain full provenance tracking.
3. **Over-Segmentation vs. Causal Consequences:**
   - Citizens frequently describe causal downstream effects (e.g., *"Bijli band hone ki wajah se pani ki motor nahi chal rahi"*). An uncalibrated model might wrongly generate tasks for both K-Electric and KWSC.
   - *Mitigation:* Implement strict causal consequence vs. independent defect rules in the annotation guidelines and evaluation matrix.
4. **Independent Status Lifecycle Reconciliation:**
   - When a complaint spawns tasks for both KMC and KWSC, KMC may accept its pothole repair while KWSC rejects the drainage ticket as private property.
   - *Mitigation:* Implement a deterministic aggregate status reconciliation function for citizen tracking (`partly_resolved`, `in_progress`, etc.).
5. **Deno Edge Function Memory & CPU Budget:**
   - Complex tokenizers with large char-ngram vocabularies (e.g. >20,000 features) can exceed memory and latency limits during Edge Function cold starts.
   - *Mitigation:* Feature selection capping total vocabulary to a compact size (<6,000 features) maintaining sub-15ms inference latency in pure TypeScript.

---
*End of Baseline Audit Document.*
