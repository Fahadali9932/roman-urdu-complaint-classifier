# AWAAZ-E-AWAM — PHASE V13.1
## Production-Path Verification & Real Runtime Integration Report

**Date:** 20 November 2026  
**Status:** VERIFIED & PASSING  
**Active Runtime Model:** Run004 (`E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56`)  
**Target Environment:** Greenwich University Awaaz-e-Awam Civic Intelligence Platform  

---

### 1. Executive Summary

Phase V13.1 rigorously verified the end-to-end production path of the Awaaz-e-Awam complaint classification pipeline. Rather than testing isolated mock functions, this verification audited the authoritative server-side Edge Function (`submit-classified-complaint`), the relation-aware V11 classification and clarification engine (`_shared/v11-engine.ts`), the browser-side client submission flow (`SimplifiedComplaintContainer.tsx`), real HTTP socket transactions, and responsive rendering across 4 standard viewports.

All 28 Edge tests, 696 Vitest tests, and 116 Python curriculum tests passed without a single failure or regression. Model weights for Run004 were verified against their authoritative SHA-256 hash before and after all tests.

---

### 2. Runtime Integrity & Model Checksum Verification

The active model weights were audited across both production and archive directories:

| Component | Path | Verified SHA-256 Checksum | Status |
| :--- | :--- | :--- | :--- |
| **Server Edge Runtime** | `supabase/functions/submit-classified-complaint/v11_model.json` | `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` | MATCH / FROZEN |
| **Model Archive** | `data/v11/curriculum_runs/run_004/candidate_model.json` | `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` | MATCH / FROZEN |
| **Candidate Run006** | `data/v11/curriculum_runs/run_006/candidate_model.json` | `C5D4E3D4164AD5482A0ABE4F614115A596665683FBF23914460EE4ED40AE0D3E` | UNPROMOTED / FROZEN |

**Verification Rules Enforced:**
1. Zero retraining or weight updates occurred during this phase.
2. The active runtime model remains strictly pinned to frozen Run004.
3. Candidate Run006 remains unpromoted in read-only evaluation storage.

---

### 3. Real Local HTTP Socket Integration Testing

To guarantee that the Edge Function operates correctly under real network conditions, a local HTTP integration test suite (`tests/edge/local-http-integration.mjs`) was executed using Node 24 native `node:http` sockets bound to ephemeral localhost ports (`127.0.0.1:0`) and real `fetch()` calls.

#### Verified Scenarios (5/5 Passing):
1. **Fahad Complaint Submission (200 OK):**
   - Natural Roman Urdu complaint describing low gas pressure and unlit stoves.
   - HTTP Status: `200 OK`.
   - Classification: Assigned exclusively to `ssgc` (Sui Southern Gas Company).
   - Review flag: `needsReview: false`.
2. **Clarification Answer Over HTTP (200 OK):**
   - Ambiguous water motor issue submitted with clarification answer `{ questionId: 'water_power_relation', choice: 'power_caused_motor' }`.
   - Classification: Correctly resolves to `kelectric` (K-Electric) only, removing `kwsc`.
   - Review flag: `needsReview: false`.
3. **Ambiguous Draft Without Clarification (200 OK):**
   - Vague water motor draft submitted without answering the prompt.
   - Server holds complaint for administrative triage: `status: under_review`, `needsReview: true`, `reviewReason: UNRESOLVED_AMBIGUITY`.
4. **Word Limit Boundary Validation (400 Bad Request):**
   - Submissions containing > 200 words are rejected at the HTTP boundary before database ingestion.
   - Response: `400 Bad Request` (`INVALID_COMPLAINT_PAYLOAD`).
5. **Expired Session Security Boundary (401 Unauthorized):**
   - Bearer token representing an expired citizen session is rejected.
   - Prevents stale sessions from silently defaulting to guest complaints.

---

### 4. Client / Server Classification Parity

Parity between client-side advisory classification (`src/services/v11InferenceAdapter.ts`) and server-side authoritative classification (`supabase/functions/_shared/v11-engine.ts`) was audited across representative civic complaints:

```
[Parity Test Suite: V11InferenceParity.test.ts]
- Single department canonical complaints: 100% agreement.
- Causal chains (water pipe leak causing road crater): 100% agreement -> KWSC primary.
- Multi-department independent faults: 100% agreement.
- Negated mentions ("bijli theek hai, gas band hai"): 100% agreement -> SSGC only.
- Clarification prompts generated: 100% identical question IDs and choices.
```
Both engines share the identical Roman Urdu normalization pipeline, clause segmentation, defect dictionary, and linear SVM coefficients.

---

### 5. Multi-Viewport Layout & Accessibility Verification

The citizen submission UI (`src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx`) was verified across all 4 mandatory device form factors in `src/test/V13_1_ViewportAndAccessibility.test.tsx`:

| Viewport Profile | Width | Layout Behavior & Verification Findings | Status |
| :--- | :--- | :--- | :--- |
| **Desktop** | 1280px | Two-column responsive container (`max-w-5xl`), full progress bar, sticky navigation footer, ample horizontal margins. | PASSED |
| **Tablet** | 768px | Single-column fluid composition, responsive padding (`sm:px-6`), accessible touch targets (min 44px). | PASSED |
| **Mobile** | 390px | Stacked card layout (`px-4`), full-width text inputs, responsive font scaling (`text-sm sm:text-base`). | PASSED |
| **Small Mobile** | 320px | Zero horizontal overflow, wrapped badge pills, compact header typography (`text-3xl`), auto-wrapping buttons. | PASSED |

#### Accessibility & Localization Audit:
- **English / Urdu Bilingual Rendering:** Dynamic string translation verified via `useLanguage` context.
- **RTL Layout Support:** Full `dir="rtl"` support with right-aligned icons (`isRTL ? 'right-4' : 'left-4'`) and flipped padding (`pr-11 pl-4`).
- **Keyboard Navigation:** Full tab order preserved across input elements, form fields, and clarification option cards.
- **Reduced Motion:** Verified CSS classes `motion-reduce:static` and `motion-reduce:transition-none` disable animations when user preferences demand it.
- **Clarification Dialogs:** Inline clarification card wraps cleanly on 320px viewports without horizontal clipping or scrollbar trapping.

---

### 6. Test Suite Execution Summary

```
--------------------------------------------------------------------------------
TEST SUITE                                PASS    FAIL    TOTAL    DURATION
--------------------------------------------------------------------------------
Node Edge Runtime Contracts & HTTP          28       0       28      0.54s
Python Autonomous V11 Curriculum Suite     116       0      116     23.39s
Vitest Frontend & Service Test Suite       696       0      696     21.66s
TypeScript Production Build (tsc -b)         0       0        0      1.88s
Oxlint Linter                              277 files, 0 errors, 101 warnings
--------------------------------------------------------------------------------
TOTAL INTEGRATED TESTS                     840       0      840     ~47.5s
--------------------------------------------------------------------------------
```

All integration prerequisites for Phase V13.1 independent adversarial evaluation have been verified and confirmed.
