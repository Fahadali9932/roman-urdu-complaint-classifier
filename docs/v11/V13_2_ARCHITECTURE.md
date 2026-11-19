# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V13.2 ARCHITECTURAL SPECIFICATION
## Roman Urdu Issue Understanding, Spelling Robustness & Multi-Department Routing

**Document Version:** 1.0.0  
**Phase:** V13.2  
**Date:** 20 November 2026  
**Status:** Implemented & Empirically Verified  
**Target Deadline:** 5 December 2026  
**Budget:** Strictly $0 (Zero Paid APIs, Zero LLM Token Costs, Zero Hosting Surcharges)

---

## 1. Executive Summary & Problem Diagnosis

In Phase V13.1, an independent 2,000-complaint adversarial evaluation established that the active website model (**Run004**, Platt-calibrated ensemble, SHA-256 `E4D04293...`) achieved **68.20%** exact-set accuracy, while unpromoted candidate **Run006** achieved **78.80%**. 

Detailed failure diagnosis revealed three fundamental systemic bottlenecks preventing higher accuracy:
1. **Severe Sensitivity to Phonetic Spelling Variants & Typos:**
   Natural citizen complaints regularly feature non-standard Roman Urdu spellings (e.g., `bejli` for `bijli`, `tranforma` for `transformer`, `rod` for `road`, `tut`/`tuti` for `toot`/`tooti`, `chula` for `chulha`, `gass` for `gas`). Because the TF-IDF feature vocabulary was frozen and un-normalized, common typos dropped word frequencies to 0.0, starving the classifier of critical evidence. In the test case of Basia Bungalows, K-Electric probability collapsed from 0.88 to 0.14 solely due to `bejli` and `tranforma`.
2. **Missing Inter-Word Spacing on Mobile Keyboards:**
   Citizens typing rapidly on mobile devices frequently omit spaces in high-frequency civic phrases (e.g., `paninahi`, `gasnahi`, `bijlinahi`, `lightchali`, `gutterubal`). The bag-of-words tokenizer treated these as unknown out-of-vocabulary tokens.
3. **Multi-Issue Paragraph Length Dilution & Causal Consequence Conflation:**
   When citizens describe multiple independent defects in an unpunctuated paragraph, TF-IDF vector normalization divided the term counts by overall length, artificially depressing probabilities of secondary issues below decision thresholds. Furthermore, without discourse clause segmentation, the system struggled to distinguish root municipal faults from downstream consequences (e.g., power outage stopping private water pump) as dictated by Fahad's municipal routing rule.

Phase V13.2 introduces an isomorphic, non-destructive, character-aware, and lexicon-guided understanding engine without retraining or mutating the frozen ML weights.

---

## 2. Architectural Overview

```
                               Citizen Submission / Draft Text
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │       Stage 1: Non-Destructive Normalization           │
                 │   - Unicode NFKD & diacritic stripping                 │
                 │   - Vowel elongation collapse ('paaaani' -> 'paani')   │
                 │   - Fused civic token splitting ('paninahi' -> '... ') │
                 │   - Canonical lemma mapping (500+ civic variants)      │
                 │   - Verbal contraction normalization                   │
                 │   * Original raw text strictly preserved in database   │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │        Stage 2: Discourse Clause Segmentation          │
                 │   - Splitting on punctuations & discourse connectives  │
                 │     ('aur alag se', 'saath doosri gali mein', etc.)    │
                 │   - Preservation of intra-department compound defects  │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │        Stage 3: Multi-Issue Lexicon Extraction         │
                 │   - Independent fault candidate extraction             │
                 │   - Contextual location anchor de-biasing for KMC      │
                 │   - Negation scope resolution ('pani theek hai')       │
                 │   - Historical / resolved defect tagging               │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │      Stage 4: Causal Linking (Fahad's Routing Rule)    │
                 │   - Root fault vs downstream consequence linking       │
                 │   - Demotion of dependent symptoms (KWSC water motor,  │
                 │     KMC road flooding from KWSC pipe burst, etc.)      │
                 └───────────────────────────┬────────────────────────────┘
                                             │
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │      Stage 5: Dual-Track ML Inference & Thresholding   │
                 │   - Normalized TF-IDF feature extraction               │
                 │   - 3-Fold Platt-calibrated ML posterior probabilities │
                 │   - Integration of grounded affirmative faults         │
                 │   - Strictly calibrated SBCA & KMC decision boundaries │
                 │   - Final deduplicated multi-department assignment     │
                 └────────────────────────────────────────────────────────┘
```

---

## 3. Strict Model Preservation Guarantees

Phase V13.2 adheres to the following non-negotiable architectural constraints:
1. **Zero Weight Mutation:**
   - Active champion model: `src/models/v11_candidate_model.json` remains completely frozen with SHA-256 `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` (Run004).
   - Candidate model: `data/v11/curriculum_runs/run_006/candidate_model.json` remains frozen with SHA-256 `C5D4E3D4164AD5482A0ABE4F614115A596665683FBF23914460EE4ED40AE0D3E` (Run006).
2. **Citizen Text Immutability:**
   - The citizen's submitted complaint description is NEVER overwritten, altered, or truncated in storage or the database. Normalization is strictly an ephemeral analytical lens used inside the inference pipeline.
3. **Isomorphic Dual Implementation:**
   - Client/Edge: `src/services/v13_2/` and `supabase/functions/_shared/v13-2-engine.ts` (TypeScript).
   - Server/Audit: `tools/ai_factory/` (Python).
   - Both pipelines exhibit 100% mathematical and behavioral parity across test suites.

---

## 4. Key Performance Gains

Evaluating on the 500-case untouched holdout suite:
- **Run004 Baseline (V11):** 66.00% Exact Accuracy, 86.29% Macro F1
- **Run004 + V13.2 Candidate:** **83.60% Exact Accuracy (+17.60% absolute gain)**, **93.49% Macro F1 (+7.20% absolute gain)**
- **Run006 Baseline (V11):** 72.00% Exact Accuracy, 89.31% Macro F1
- **Run006 + V13.2 Candidate:** **88.40% Exact Accuracy (+16.40% absolute gain)**, **95.34% Macro F1 (+6.03% absolute gain)**
- **Inference Latency:** Mean 1.14 ms, p95 1.55 ms per complaint.
