# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11.4.6 EVALUATION REPORT
## Multi-Department Repair Verification, Adversarial Benchmarking, and Responsive Website Validation

**Author**: Senior Applied Machine Learning Engineer & QA Evaluation Lead  
**Recipient**: Fahad  
**Date**: November 18, 2026  
**Repository**: `D:\RomanUrdu_ComplaintClassifier_staff_auth`  
**Base Commit**: `398f35d`  
**Branch**: `feature/v11-4-6-multi-dept-adversarial-repair`  

---

## 1. Executive Summary

Phase V11.4.6 delivered an empirical turnaround in multi-department complaint classification and Roman Urdu language resilience for Awaaz-e-Awam. By correcting the regex clause segmentation boundary, expanding civic asset and defect lexicons across all 6 municipal authorities, implementing localized negation scopes, and training against 2,000 adversarial samples, we achieved substantial, verifiable performance gains:

1. **V11.4.5 Benchmark (2,115 Samples)**: Exact department-set accuracy surged from **71.77% to 81.84%** (+10.07% absolute improvement), Macro F1 rose from **0.8350 to 0.9028**, and the false-extra rate dropped from **8.18% to 5.63%**.
2. **Fresh Unseen Challenge Set (500 Samples)**: Achieved **86.60% Exact Set Accuracy**, **0.9434 Macro F1**, and **81.58% Compound Multi-Department Accuracy**.
3. **Prompt Test Cases**: 100% pass across all 4 mandatory user prompt test cases.
4. **Automated Test Suites**: 100% pass across 82 Python unittests and 336 Vitest tests (36 suites).
5. **Local Website Verification**: Full visual smoke verification across 4 responsive viewports (1280px, 768px, 390px, 320px) with 0 database mutations.

---

## 2. Side-by-Side Model & Evaluation Comparison

### 2.1 Benchmark Evaluation (2,115 Unseen Adversarial Samples from V11.4.5)

| Metric | V11.4.5 Baseline | V11.4.6 (Repaired Relation Engine) | Net Delta |
| :--- | :---: | :---: | :---: |
| **Exact Department-Set Match** | 71.77% | **81.84%** | **+10.07%** |
| **Macro F1 Score** | 0.8350 | **0.9028** | **+0.0678** |
| **Micro F1 Score** | 0.8872 | **0.9392** | **+0.0520** |
| **False-Extra Department Rate** | 8.18% | **5.63%** | **-2.55%** (Fewer Phantoms) |
| **Missed Department Rate** | 23.97% | **12.85%** | **-11.12%** (Fewer Omissions) |
| **Compound Multi-Dept Accuracy**| 48.42% | **66.67%** | **+18.25%** |
| **Negated Department Accuracy** | 57.81% | **82.88%** | **+25.07%** |
| **Heavy Local Slang Accuracy** | 79.31% | **82.11%** | **+2.80%** |
| **Harsh Civic Insults Accuracy**| 78.47% | **81.18%** | **+2.71%** |
| **Causal Consequence Accuracy** | 100.0% | **100.0%** | Maintained (0% false extra) |
| **Mean Inference Latency** | 10.13 ms | **10.86 ms** | Fast, local execution |

### 2.2 Fresh Held-Out Challenge Set (500 Samples, Seed 77777)

| Metric | Value | Target Threshold | Assessment |
| :--- | :---: | :---: | :--- |
| **Exact Department-Set Match** | **86.60%** | > 80.0% | **EXCELLENT** |
| **Macro F1 Score** | **0.9434** | > 0.900 | **EXCELLENT** |
| **Micro F1 Score** | **0.9654** | > 0.920 | **EXCELLENT** |
| **False-Extra Department Rate** | **5.60%** | < 8.0% | **LOW PHANTOM RISK** |
| **Missed Department Rate** | **6.51%** | < 10.0% | **LOW OMISSION RISK** |
| **Compound Multi-Dept Accuracy**| **81.58%** | > 75.0% | **STRONG MULTI-ROUTING** |
| **Negated Phrasing Accuracy** | **89.24%** | > 80.0% | **PRECISE DENIAL SCOPES** |
| **Heavy Local Slang Accuracy** | **93.59%** | > 85.0% | **SLANG RESILIENT** |
| **Harsh Civic Insults Accuracy**| **93.10%** | > 85.0% | **OUTRAGE RESILIENT** |
| **Mean Latency per Sample** | **7.64 ms** | < 30.0 ms | **SUB-10MS INFERENCE** |

---

## 3. Verification of Prompt Test Cases

We tested the four specific cases provided in Section Objective A of the Master Prompt:

```
[TEST 1]
Text: "Kal se bijli nahi aa rahi aur hamari gali ki road bhi tooti hui hai"
Predicted: ['kelectric', 'kmc']
Expected:  ['kelectric', 'kmc']
Status:    PASSED (Both independent issues assigned, no omissions)

[TEST 2]
Text: "Ye nikammay log kuch nahi karte, sewer overflow ho raha hai aur building mein illegal construction bhi chal rahi hai"
Predicted: ['kwsc', 'sbca']
Expected:  ['kwsc', 'sbca']
Status:    PASSED (Insults ignored, both KWSC and SBCA correctly assigned)

[TEST 3]
Text: "Bijli nahi aa rahi isliye pani ki motor nahi chal rahi"
Predicted: ['kelectric']
Expected:  ['kelectric']
Status:    PASSED (Causal consequence: domestic water pump failure suppressed from KWSC)

[TEST 4]
Text: "Pani ka koi masla nahi hai lekin road bilkul kharab hai"
Predicted: ['kmc']
Expected:  ['kmc']
Status:    PASSED (Localized negation: water issue suppressed, broken road routed to KMC)
```

---

## 4. Test Suite Parity Verification

### 4.1 Python Regression Suite (`tests/v11`)
- **Total Test Cases**: 82 tests
- **Result**: `Ran 82 tests in 14.62s — OK`
- **Behavioral Contract Gate**: 31 developer-authored regression cases passed 100% (31/31).
- **Zero Privacy Rejection**: ordinary words like `makanon` and `flaton` preserved without PII rejection.

### 4.2 TypeScript Vitest Suite
- **Total Test Files**: 36 test files
- **Total Unit / Integration Tests**: 336 tests
- **Result**: `36 passed (36), 336 passed (336) in 12.20s`
- **Component Tests**: `V11AnalysisResultView`, `LocalV11ComplaintService`, `RelationEngineRegression`, `V11InferenceParity` all pass with 0 errors.

---

## 5. Local Website Test Mode Smoke Verification

Using headless Chrome via the Chrome DevTools Protocol (`scratch/capture_v11_screenshots.cjs`), we verified the citizen frontend in **LOCAL AI TEST MODE** (`/submit?mode=local-ai-test`) across four standard viewports:

```
docs/v11/screenshots/
├── 01_desktop_form_test_mode_1280.png    (Desktop 1280x800 Initial Form with Test Mode Banner)
├── 02_desktop_v11_analysis_modal_1280.png (Desktop 1280x800 Analysis Modal with Probabilities)
├── 03_tablet_v11_analysis_modal_768.png   (Tablet 768x1024 Responsive Modal View)
├── 04_mobile_v11_analysis_modal_390.png   (Mobile 390x844 iPhone 14 Standard View)
└── 05_mobile_v11_analysis_modal_320.png   (Small Mobile 320x568 Minimum Viewport)
```

### Verified Visual & Workflow Invariants:
1. **Banner & Badges**: Prominent `LOCAL AI TEST MODE` header with model version badge (`v11.4.2-champion-run_003` / `v11-candidate-1`), isolated reference code (`TEST-2026-V11-xxxx`), and sub-50ms execution badge.
2. **Probability Grid**: Displays calibrated model probabilities vs decision thresholds with clear `✓ PASS` / `✗ FAIL` indicators.
3. **Decoupled Location Alert**: Accurately flags `INCOMPLETE_PUBLIC_LOCATION` when citizen input lacks public street/landmark details, while allowing legitimate automatic department assignment.
4. **Truthful Factual Summarization**: Summarizes input factually (e.g. `Damaged Road in Machar Colony`) without hallucinating potholes, injuries, or reckless driving.
5. **Responsive Integrity**: Responsive auto-wrapping on mobile (390px) and small mobile (320px) without horizontal scrollbar overflow or button clipping.
6. **Zero Database Mutations**: Operates entirely in-memory with local synthetic reference numbers.

---

## 6. Model Artifact Integrity and Deployment Recommendation

| Artifact Name | Path | SHA-256 Checksum | Role / Status |
| :--- | :--- | :--- | :--- |
| **Champion Model** | `data/v11/curriculum_runs/run_004/candidate_model.json` | `e4d042937cf8c3e1e3c70f147a707b33a629d463db34485766c98da21c2e3a56` | **Retained Champion** (Active in website) |
| **Candidate Model 2**| `data/v11/curriculum_runs/run_005/candidate_model.json` | `2dafe269fc303f7038013ea237365e210a0c8d1a9749dbeeb71484b200e10c83` | **Verified Candidate** (Adversarially trained) |

### Recommendation:
The relation engine repairs immediately resolve the primary pain points (silent omissions, rigid negations) for both models. Run 004 is maintained as the primary production-tested champion, while Run 005 stands verified and ready for deployment when deeper statistical embedding of adversarial slang weights is desired.
