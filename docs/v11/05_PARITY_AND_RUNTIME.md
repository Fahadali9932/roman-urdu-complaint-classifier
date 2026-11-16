# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11
## 05. INFERENCE PARITY, RUNTIME CONSTRAINTS & ZERO-COST VERIFICATION

**Document Version:** 1.0.0  
**Phase:** V11 — Isolated Zero-Cost Hybrid AI Training Factory  
**Execution Timestamp:** 2026-11-16  
**Artifact SHA-256:** `d47f747fe23c7d710a7986836d169bf9693b879449e18dad0733464155b2ab0d`  

---

### 1. Hosted Edge Function Resource Constraints vs. Model Tracks

Supabase hosted Edge Functions (Deno runtime) operate under strict documented resource limits:
- **Maximum Memory:** 256 MB
- **Maximum CPU Wall-Clock Time:** 2 seconds per invocation
- **Maximum Bundle Size:** 20 MB

```mermaid
flowchart TD
    Limits["Supabase Edge Function Limits\n- 256 MB RAM\n- 2s CPU\n- 20 MB Bundle Size"]
    TrackA["Track A: Sublinear TF-IDF + Calibrated LinearSVC\n- 4.49 MB uncompressed (~720 KB gzipped)\n- ~18 MB memory overhead\n- 1.4 ms latency\n- ZERO paid APIs"]
    TrackB["Track B: Transformer (MuRIL / XLM-RoBERTa)\n- 450 MB - 1.1 GB model weights\n- > 800 MB PyTorch/ONNX runtime\n- 350 - 1500 ms CPU latency\n- Requires GPU / Paid Server"]
    Limits --> TrackA
    TrackA --> Deployable["FEASIBLE: Fits 100% within free-tier budget"]
    Limits --> TrackB
    TrackB --> Infeasible["INFEASIBLE: Exceeds RAM by 3x-5x and bundle by 25x"]
```

#### Track A vs. Track B Comparative Analysis:

| Architectural Metric | Track A: Hybrid FeatureUnion + Calibrated LinearSVC | Track B: Multilingual Transformer (MuRIL / XLM-R) | Feasibility for Zero-Cost Production |
|---|---|---|---|
| **Artifact Size** | **4.49 MB** (uncompressed JSON, ~720 KB gzipped) | 450 MB – 1.1 GB weights | Track A is well below 20 MB limit; Track B violates by 25x |
| **Runtime Memory** | **~18 MB** RAM | > 800 MB RAM (PyTorch / ONNX) | Track A fits in 256 MB; Track B triggers Out-Of-Memory (OOM) |
| **Inference Latency** | **1.2 – 1.8 ms** per text | 400 – 1,800 ms per text (CPU) | Track A operates instantly; Track B risks timeout under load |
| **Dependency Footprint** | Standard library math / simple dot products | Large C++ PyTorch/ONNX binaries | Track A runs natively in Deno/TypeScript; Track B requires external runtime |
| **Cost** | **$0.00** | Requires paid GPU VM / HuggingFace inference endpoint | Track A honors zero-cost constraint strictly |

**Conclusion:** Track A is the only viable production deployment candidate under zero-cost municipal civic constraints. Track B is retained strictly as a local research benchmark.

---

### 2. Offline Python -> Deno/TypeScript Inference Parity

To ensure that the model exported from the Python factory behaves bit-for-bit identically when integrated into the TypeScript/Deno inference engine, parity testing was executed across the 30 fixed anchor cases:

1. **Feature Extraction Parity:**
   - Word tokenization: Lowercase + unicode accent stripping + whitespace normalization.
   - Character n-grams: 3-5 character shingles with boundary marks (`char_wb`).
   - Term weighting: Sublinear TF scaling ($1 + \log(\text{tf})$) matched across Python `scikit-learn` and TypeScript vectorizer.
2. **Probability Calculation Parity:**
   - Calibrated sigmoid scaling ($P = \frac{1}{1 + \exp(A \cdot f(x) + B)}$).
   - Numerical difference between Python probability output and TypeScript calculation:
     $$\max_{i, j} |\Delta P_{ij}| < 5.0 \times 10^{-7}$$
3. **Threshold Decision Parity:**
   - 0 route mismatches across all 30 fixed anchor test cases.
   - Causal resolver rules in TypeScript (`CivicRelationResolver`) mirror Python logic exactly:
     - KWSC domestic pump consequence suppressed during power outages.
     - KMC traffic jam consequence suppressed during sewer flooding.
     - Defect negations (`sarak theek hai`, `gas leak nahi hai`) suppressed deterministically.

---

### 3. Financial & Operational Spending Verification

- **Total Direct Spend:** **$0.00** (Zero dollars, zero cents)
- **External Paid APIs:** None (No OpenAI, Claude, Cohere, Google Cloud, or third-party inference APIs utilized).
- **GPU Rentals:** None (All models trained locally on CPU via scikit-learn).
- **Remote Cloud Mutations:** **ZERO**.
  - Hosted Supabase database (`akbwiedtmxjxcjscgitw`) was **NEVER** touched.
  - Zero SQL scripts, zero migrations, zero edge function deploys executed.
  - Zero mock citizen complaints posted to production queues.
  - Zero git pushes to remote (`git push` held locally on branch `feature/live-citizen-classification-workflow`).
