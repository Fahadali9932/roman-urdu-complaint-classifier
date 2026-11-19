# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.5 COMPLETION REPORT
## AI Control Center, Live Training Telemetry & Human-Verified Continuous Learning

**Target Audience:** Fahad (Technical Lead & Academic Supervisor)  
**Project:** Awaaz-e-Awam (Roman Urdu Municipal Complaint Classification System)  
**Repository Branch:** `feature/v11-5-ai-control-center-and-continuous-learning`  
**Git Checkpoint Commit:** `051cb2878ca8e713d318076bcc2ae5cf8867e35a`  
**Active Runtime Champion:** `src/models/v11_candidate_model.json` (Run 004 Champion)  
**Active SHA-256:** `e4d04293f9c6d4826b5c3ff3ec327e53f1947b198888e2cb2ad4cfcf7ef98457`  
**Test Suite Status:** **38 Vitest Suites (352 tests) PASSED** · **82 Python Tests PASSED** (100% Pass Rate)  
**Budget Status:** Strictly $0.00 Spent · Zero Paid APIs · Zero Hosted DB Mutations  
**Storage Invariant:** C: 46.85 GB free (>= 20 GB safe) · D: 156.67 GB free (>= 30 GB safe)

---

## 1. Executive Summary

Phase V11.5 safely transitions Awaaz-e-Awam from a static adversarial prototype into a durable, multi-label, human-correctable municipal intelligence platform equipped with a private Administrator AI Control Center (`/admin/ai`).

Key deliverables achieved:
1. **Hybrid Decision Policy Repaired (Phase 1 & 2):** Diagnosed and fixed the historical baseline gap where the citizen website achieved only 44.20% accuracy while the statistical ML engine achieved 69.50%. The new hybrid policy unifies calibrated Platt probabilities with causal/negation filters, increasing website benchmark accuracy to **52.55%** (+8.35% absolute gain) and Macro F1 to **0.7283**, while maintaining zero false positives on causal consequences.
2. **Department Staff "Flag Incorrect Department" (Phase 7):** Integrated a direct flagging action into `ComplaintDetailView.tsx`. Department staff can flag misclassified complaints, routing them to `under_review` for central administrative review while strictly preserving municipal role isolation.
3. **PII-Scrubbed Human Review Queue (Phase 4):** Created `aiReviewService.ts` to sanitize phone numbers, CNICs, and emails before queuing complaints for administrative review and exporting verified corrections into `.jsonl` curriculum training batches.
4. **Live Telemetry & Dev Bridge (Phase 5 & 6):** Engineered an atomic status engine (`telemetry.py`), custom dev server middleware in `vite.config.ts`, and a client polling service (`aiTelemetryService.ts`). The new `/admin/ai` dashboard updates training telemetry, stage progress, and heartbeats every 5 seconds **automatically without manual browser refreshes**, with tab-visibility pause/resume and stale heartbeat detection (> 25s).
5. **Slow Diagnostic Telemetry Runner:** Implemented a bounded 30-sample non-destructive dry-run script (`slow_diagnostic_telemetry_runner.py`) running over ~25 seconds for safe verification of real-time progress streaming.
6. **Strict Governance & Model Safety:** Preserved Run 004 Champion as the active runtime model in `src/models/v11_candidate_model.json`. Candidate models Run 005 and Run 006 remain safely isolated in the model registry awaiting Fahad's explicit written authorization for runtime promotion.

---

## 2. Root Cause & Hybrid Decision Policy Repair

### 2.1 The 44.20% Website vs. 69.50% ML Accuracy Mismatch
During Phase V11.4.8 evaluation, a sharp performance divergence was observed:
- **Python ML Pipeline (`classifyV11`):** 69.50% exact set accuracy on Run 006.
- **Website Pipeline (`classifyV11RelationAware`):** 44.20% exact set accuracy on the same benchmark.

**Root Cause Analysis:**
In `src/services/v11InferenceAdapter.ts`, `classifyV11RelationAware` previously returned `relationResult.proposed_departments` directly. When novel colloquial Roman Urdu or adversarial phrasing did not match static regexes in `relationEngine.ts`, `proposed_departments` was empty. This triggered `UNCERTAIN_DEFECT` and routed the complaint to `Needs Review` (`departments = []`), while clamping probabilities below `< thresh * 0.4`. The statistical ML probabilities from LinearSVC + TF-IDF were completely discarded.

### 2.2 The Hybrid Decision Solution
The hybrid policy implements a synergistic multi-stage filter:
- **Out-of-Scope Protection:** Private tenancy/rent disputes, domestic fights, banking fraud, and traffic police issues immediately route to `needsReview = true, reviewReason = 'OUT_OF_SCOPE'` with zero municipal assignment.
- **Causal Consequence Suppression:** Downstream secondary symptoms (e.g. domestic water motor stopped due to power outage) are identified via relation edges and candidate mention types, preventing false tickets to secondary departments (e.g. KWSC).
- **Domain Evidence Keyword Gating:** Departments passing statistical threshold without rule grounding are checked for supporting domain keywords (`hasDomainKeywordSupport`). This prevents low-threshold agencies (e.g. KMC at 0.25) from receiving false tickets on short electricity complaints like `"bijli nhi aarhi waja se motor h band"`.

---

## 3. Architecture of the AI Control Center (`/admin/ai`)

The AI Control Center is integrated into the authenticated Main Administrator portal (`/admin/ai`) with six segmented views:

| View | Purpose | Key Features |
| :--- | :--- | :--- |
| **1. System Overview** | Live model health & configuration | Active model SHA-256, active status, calibrated thresholds, accuracy, Macro F1, and pending review counts. |
| **2. Live Training Telemetry** | Real-time progress monitoring | Live state badges (`LIVE`, `IDLE`, `STALE`, `COMPLETED`), progress bar, elapsed/remaining time, C: & D: disk space telemetry, streaming terminal event log, and start/stop controls. |
| **3. Human Review Queue** | Misclassified complaint triage | Interactive table with PII-scrubbed resident narratives, staff flag justifications, multi-label assignment checkboxes, and approve/dismiss actions. |
| **4. Continuous Learning History** | Training data provenance | Audit log of human-verified corrections with reviewer IDs and timestamps, plus one-click `.jsonl` export for curriculum fine-tuning. |
| **5. Model Registry & Rollback** | Candidate model governance | Inventory of Run 004, Run 005, and Run 006 models with SHA-256 hashes, thresholds, and rollback verification. |
| **6. 2,000-Case Evaluation** | Rigorous blind benchmarking | Comparative performance metrics, single/dual/triple issue slices, and Wilson 95% confidence intervals. |

---

## 4. Durable Training Telemetry & Live Status Stream

### 4.1 Atomic Status Serialization (`telemetry.py`)
To prevent race conditions and partial reads from the frontend during file writes, `tools/ai_factory/telemetry.py` writes to a temporary file via `tempfile.mkstemp` and applies atomic replacement via `os.replace`.

### 4.2 Vite Dev Server Bridge (`vite.config.ts`)
The Vite dev server exposes two endpoints directly through middleware:
- `GET /api/ai/training-telemetry`: Returns current snapshot from `active_status.json`. If `state === 'LIVE'` and last update was > 25 seconds ago, automatically returns `state = 'STALE'`.
- `POST /api/ai/training-control`: Accepts `{ action: 'start_diagnostic' | 'stop' }`. Spawns `python tools/ai_factory/slow_diagnostic_telemetry_runner.py` as a non-blocking child process.

### 4.3 Client Telemetry Poller (`aiTelemetryService.ts`)
- **Interval:** Polls every 5,000 ms.
- **Tab Visibility Awareness:** Hooks into `document.visibilitychange`. Pauses polling when the tab is hidden to conserve resources; triggers an immediate fetch upon regaining focus.
- **Automatic UI Reactivity:** Components subscribe via `aiTelemetryService.subscribe(callback)`. The UI updates smoothly without full page reloads.

---

## 5. Human-Verified Continuous Learning & Department Flagging

### 5.1 Department Staff Flagging Action (Phase 7)
In `ComplaintDetailView.tsx`, staff members reviewing an assigned complaint now have an authenticated **"⚠️ Flag Incorrect Department"** button:
- Opens `FlagIncorrectDepartmentModal.tsx`.
- Displays case reference number and current department.
- Staff selects suggested department (or "Out of Municipal Scope") and enters an explanation note.
- Submitting updates status to `under_review`, records the staff audit note, and routes the complaint into the central AI Review Queue.
- **Strict Role Boundaries:** Department staff remain strictly restricted to their assigned department and cannot access other departments' complaints or administrative training controls.

### 5.2 PII-Safe Queue & Retraining Log (`aiReviewService.ts`)
Before persisting flagged complaints for continuous training, `aiReviewService.ts` scrubs:
- Pakistani mobile numbers: `03\d{2}[-.\s]?\d{7}` -> `[PHONE REDACTED]`
- CNIC numbers: `\d{5}-\d{7}-\d` -> `[CNIC REDACTED]`
- Personal emails: `[\w.-]+@[\w.-]+\.\w+` -> `[EMAIL REDACTED]`

When an administrator approves a triage item in `/admin/ai`:
1. Status is marked `resolved`.
2. Verified multi-label departments and admin notes are permanently recorded in local continuous learning storage (`verified_corrections.jsonl`).
3. The dataset can be exported with one click for future curriculum training.

---

## 6. Official 2,000 Unseen Complaint Benchmark Results

Evaluated on the locked 2,000-case blind benchmark (`data/v11/eval_v11_4_8/benchmark_2000.jsonl`):

| Model Bundle | Pipeline Mode | Exact Set Accuracy | Wilson 95% CI | Macro F1 | Micro F1 | Single Issue | Dual Issue | Triple Issue | Latency (P95) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run 004 (Active Champion)** | **Hybrid Relation-Aware** | **52.55%** | **[50.4%, 54.7%]** | **0.7283** | **0.7349** | **54.20%** | **42.40%** | **21.33%** | **31.73 ms** |
| Run 004 (Historical Broken) | Legacy Proposed Only | 44.20% | [42.0%, 46.4%] | 0.6980 | 0.7010 | 45.10% | 36.80% | 14.50% | 34.10 ms |
| Run 005 (Curriculum Batch) | Hybrid Relation-Aware | 62.30% | [60.2%, 64.4%] | 0.7925 | 0.8009 | 63.20% | 58.40% | 34.67% | 32.33 ms |
| Run 006 (Cycle 2 Checkpoint) | Hybrid Relation-Aware | 68.15% | [66.1%, 70.2%] | 0.8409 | 0.8444 | 67.80% | 69.20% | 48.67% | 33.80 ms |
| Run 006 (Cycle 2 Checkpoint) | Civic ML Pipeline | 69.50% | [67.5%, 71.5%] | 0.8347 | 0.8419 | 73.67% | 68.80% | 20.67% | 3.43 ms |

---

## 7. Regression Verification & System Integrity

### 7.1 Vitest Full Regression Suite (All 38 Files)
```
Test Files  38 passed (38)
Tests       352 passed (352)
Duration    12.77s
```

### 7.2 Python Test Suite
```
Ran 82 tests in 13.049s
OK (Status: PASSED)
```

### 7.3 TypeScript Strict Typecheck
```powershell
npx tsc --noEmit
# Exit Code 0 (0 errors)
```

---

## 8. Governance & Academic Constraints Compliance

1. **Active Model Unchanged:** `src/models/v11_candidate_model.json` remains pinned to Run 004 Champion (`e4d04293f9c6d4826b5c3ff3ec327e53f1947b198888e2cb2ad4cfcf7ef98457`).
2. **Zero Unapproved Promotion:** Run 005 and Run 006 remain safely in candidate status. No runtime swap was performed.
3. **Budget Invariant:** Strictly $0.00 spent. Zero third-party LLM APIs, zero credit card charges, zero paid cloud hosting.
4. **Storage Safeguards:**
   - C: drive free space: 46.85 GB (threshold: >= 20 GB).
   - D: drive free space: 156.67 GB (threshold: >= 30 GB).
5. **Git Push Invariant:** Zero unauthorized remote pushes performed. Working directory is cleanly committed to local branch `feature/v11-5-ai-control-center-and-continuous-learning`.
