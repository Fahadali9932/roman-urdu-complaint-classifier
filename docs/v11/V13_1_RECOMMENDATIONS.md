# AWAAZ-E-AWAM — PHASE V13.1
## Engineering Recommendations & V13.2 Roadmap

**Date:** 20 November 2026  
**Audience:** Principal Engineering, NLP Research, Civic Stakeholders  
**Evaluation Reference:** `data/v11/eval_v13_1/v13_1_evaluation_summary.json`  

---

### 1. Executive Recommendations

Phase V13.1 has conclusively established the true baseline of our active classifier on 2,000 genuinely unseen, adversarial Roman Urdu complaints. Based on empirical evidence, we recommend:

1. **Maintain Frozen Run004 at the Production Boundary for Phase V13.1:**
   In accordance with project governance rules, **never promote a candidate model without explicit user authorization**. Run004 remains the active runtime model in `supabase/functions/submit-classified-complaint/v11_model.json`.
2. **Present Run006 as a Validated Candidate for Formal Promotion Review:**
   Run006 demonstrates statistically significant improvements over Run004 across every major metric:
   - Full-set exact accuracy: **55.30% vs 49.95% (+5.35%)**, non-overlapping 95% Wilson CIs.
   - Selective auto-routing accuracy: **63.61% vs 57.56% (+6.05%)**.
   - Macro F1: **83.34% vs 79.85% (+3.49%)**.
   - SBCA canonical accuracy: **72.0% vs 32.0% (+40.0%)**.
   - False extra assignments: **373 vs 472 (-20.9% error reduction)**.
   - Zero-cost, local-only inference: Run006 inference latency is 20.56 ms.
   - *Recommendation:* Seek Fahad's explicit approval to promote Run006 to the active runtime slot in Phase V13.2.
3. **Execute Targeted Relation-Engine & Threshold Repairs in Phase V13.2:**
   Retraining alone cannot resolve causal chain confusion or spatial anchor words. Algorithmic enhancements to the pre-classifier relation engine are required.

---

### 2. Actionable Technical Roadmap for Phase V13.2

To bridge the gap between 55% adversarial accuracy and our operational target of high-reliability auto-routing, we recommend four targeted engineering initiatives:

#### Initiative 1: Causal Connective Discourse Parsing (Fahad's Rule Enforcement)
- **Problem:** When a water leak causes road damage (`"pipeline burst ki wajah se road toot gaya"`), both KWSC and KMC fire.
- **Solution:** Implement a lightweight causal discourse parser in `_shared/v11-engine.ts`.
- Identify explicit causal markers:
  - Cause indicators: `ki wajah se`, `ke sabab`, `is liye ke`, `ke natijay mein`, `ke bais`.
  - Consequence patterns: `road toot gayi`, `khadda par gaya`, `traffic jam ho gaya`, `andhera chha gaya`.
- When a causal marker links Clause A (root cause) to Clause B (consequence), mask or down-weight features from Clause B unless Clause B reports an independent, pre-existing defect.

#### Initiative 2: Spatial & Location Anchor De-biasing for KMC
- **Problem:** KMC precision is only 65.59% (213 false positives) because road names and generic street terms (`sadak`, `gali`, `chowrangi`) carry positive KMC weights.
- **Solution:**
  - Introduce an entity-aware pre-processing step that tags location prepositional phrases (`... mein`, `... par`, `... ke samnay`).
  - Require affirmative defect verbs (`tooti hui`, `khadda`, `tameer`, `malba`) in direct syntactic proximity to road nouns before allowing KMC feature activation.
  - Penalize KMC when road nouns appear solely as the location of another agency's defect (e.g. *"sadak par gutter ubal raha hai"*).

#### Initiative 3: Temporal Contrast Masking (False Secondary Mentions)
- **Problem:** Historical repairs mentioned by citizens (`"pehle K-Electric ne theek kiya tha ab SSGC ka masla hai"`) trigger multi-routing (26.7% accuracy).
- **Solution:**
  - Enhance temporal scope detection for contrastive clauses introduced by `pehle`, `guzishta hafte`, `sabqa`, `theek kar diya tha`, `hal ho chuka hai`.
  - Automatically zero out agency activations in clauses governed by past-completion predicates followed by adversative connectives (`magar`, `lekin`, `ab asal masla`).

#### Initiative 4: Adaptive Multi-Fault Re-ranking
- **Problem:** In 3-fault and 4-fault complaints, individual defect n-grams are diluted by long paragraphs.
- **Solution:**
  - Segment long paragraphs (>80 words) into independent sentence clauses.
  - Run clause-level scoring in addition to full-document scoring.
  - If a clause demonstrates high localized confidence for an agency (e.g. `p > 0.70`), prevent document-level length dilution from suppressing the prediction below threshold.

---

### 3. Economic & Zero-Cost Feasibility Confirmation

All proposed enhancements for Phase V13.2 adhere strictly to the Greenwich University $0 operational budget:
- **No external paid LLMs or APIs:** Operates 100% locally using existing TypeScript and Python engines.
- **No hardware expansion:** Inference remains under 25 ms on commodity CPUs.
- **No data loss or privacy exposure:** Preserves full PII redaction and department isolation at the server boundary.

---

### 4. Implementation Readiness & Transition Plan

| Step | Action Item | Target Phase | Dependency / Approval Required |
| :---: | :--- | :---: | :--- |
| **1** | Retain Run004 as runtime active; archive V13.1 reports. | V13.1 | Complete |
| **2** | Submit Run006 promotion evaluation to Fahad. | Transition | User explicit approval |
| **3** | Implement Causal Connective Parser in `v11-engine.ts`. | V13.2 | Code review |
| **4** | Implement Location Anchor De-biasing for KMC. | V13.2 | Code review |
| **5** | Re-evaluate on frozen `adversarial_benchmark_2000.jsonl`. | V13.2 | Verified exit codes |
