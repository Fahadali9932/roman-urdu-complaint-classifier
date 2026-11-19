# AWAAZ-E-AWAM — PHASE V13.2 LOCALHOST TESTING & AUDIT GUIDE
## Local Verification, Model Provenance, and Probability Clarification

**Phase:** V13.2  
**Date:** 20 November 2026  
**Audience:** Fahad (Lead Project Owner & Stakeholder), QA Engineers  
**Target Submission Deadline:** 5 December 2026  
**Budget:** Strictly $0

---

## 1. Localhost Investigation: Why the UI Showed `V11.4.2 Champion (run_003)`

### Finding & Root Cause
During local testing, Fahad observed the banner in Local AI Test Mode displaying:
`V11.4.2 Champion (run_003)`.

We performed an exhaustive cryptographic and codebase audit:
1. **Model Weight Audit:**
   - Active runtime file: `src/models/v11_candidate_model.json`
   - File SHA-256 Hash: `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56`
   - Historical Run004 Hash: `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` (100% Exact Match)
   - Historical Run003 Hash: `ADD9DD0B2F0122ADB50FD92982F2476249CD0C30B7B97C3F3A2114D6B386DAF4`
2. **Edge Function Model Audit:**
   - Supabase Edge file: `supabase/functions/submit-classified-complaint/v11_model.json`
   - File SHA-256 Hash: `E4D042937CF8C3E1E3C70F147A707B33A629D463DB34485766C98DA21C2E3A56` (Run004)
3. **The Root Cause:**
   The browser was loading **Run004** all along. However, the UI badge text in `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx:515` was hardcoded to `'V11.4.2 Champion (run_003)'` when Local AI Test Mode was originally scaffolded in Phase V11.4.2. When Run004 was trained and deployed in Phase V11.4.4, the weights file was updated, but the visual text string was never changed.

### The Fix
In Phase V13.2, this text has been corrected:
- Badge displays: `V11 Champion (Run004 • SHA: E4D04293)`
- A dynamic **Model Candidate Selector** dropdown has been added to Local AI Test Mode:
  - `V13.2 Candidate (Enhanced Issue Understanding & Normalization)`
  - `V11 Champion (Run004 - Active Runtime Baseline)`

---

## 2. Clarification on Probability Scoring

Fahad noted seeing probability scores such as 88% or 75% on individual department bars and asked how these relate to overall model accuracy.

### What the Scores Actually Mean
The percentages shown in the analysis modal are **Platt-calibrated sigmoid posterior probabilities**:
$$P(D_i = 1 \mid X) = \frac{1}{1 + e^{-(A \cdot f_i(X) + B)}}$$

Where:
- $X$ is the specific complaint submitted by the citizen.
- $f_i(X)$ is the TF-IDF dot product for department $i$.
- $A, B$ are Platt scaling parameters fitted via 3-fold cross-validation.
- **Interpretation:** The score indicates the classifier's statistical certainty that department $i$ is responsible for an actionable fault in *this specific complaint*. For example, `K-Electric: 89%` means the model is 89% certain that this text describes an electricity failure.

### What the Scores Do NOT Mean
- They do **not** indicate overall historical model benchmark accuracy across datasets (e.g., 68.20% on the adversarial benchmark or 83.60% on the V13.2 holdout).
- They do **not** imply that 11% of the complaint was ignored.

---

## 3. How to Run and Test on Localhost

### 3.1 Start the Development Server
In your terminal, navigate to the repository directory and run:

```powershell
npm run dev
```

The Vite dev server will start at:
`http://localhost:5173`

### 3.2 Access Local AI Test Mode
Open your browser and navigate directly to:
```
http://localhost:5173/write-complaint?mode=local-ai-test
```
*(Or navigate to `/write-complaint` and flip the "LOCAL AI TEST MODE" toggle switch at the top to ENABLED.)*

### 3.3 Test with V13.2 Presets

Click any of the quick-fill buttons in the amber test banner:

1. **Preset 7: Basia Bungalows (`v13_2_basia_typos`)**
   - Click **"7. Basia Bungalows (KE+KMC+SSWMB Typos)"**.
   - The form will auto-fill with:
     > `"Salam janab Basia Banglows Block 4 Gulshan me bejli ka tranforma jal gya he kal rat se andhera he or sth wali rod b tuti hoi he kachra b para he"`
   - Click **"Submit Complaint"**.
   - **Expected Result:**
     - Status: `Verified & Auto-Assigned`
     - Authorities Assigned: `KELECTRIC`, `KMC`, `SSWMB`
     - Typos normalized: `bejli` -> `bijli`, `tranforma` -> `transformer`, `rod` -> `road`, `tuti` -> `toot`.
     - Zero departments dropped.
2. **Preset 8: Gas Outage with Anger & Emotion (`v13_2_anger_gas`)**
   - Click **"8. Gas Outage with Anger & Noise"**.
   - Auto-fills:
     > `"Lanat ho tum sab pe gas nahi arahi subah se chulha nahi chala bache bhooke hain pagal samjha hai kya hume gas ka pressure bilkul zero hai"`
   - Click **"Submit Complaint"**.
   - **Expected Result:**
     - Status: `Verified & Auto-Assigned`
     - Authority Assigned: `SSGC` only.
     - Anger/profanity tolerated without routing penalty or administrative hold.
3. **Compare Candidates:**
   - In the "Model Candidate" dropdown, switch from `V13.2 Candidate` back to `V11 Champion (Run004 Baseline)`.
   - Submit Preset 7 again.
   - Notice how Run004 Baseline drops K-Electric because of `bejli` and `tranforma`. Switch back to V13.2 to see K-Electric immediately restored!

---

## 4. Guarantees During Localhost Testing

- **Zero Supabase API Calls:** All inference runs purely in the client browser memory using Web APIs.
- **Zero Database Records Written:** No fake complaints are stored in the hosted database.
- **Ephemeral Session Only:** Storage is in-memory only; reloading resets test state cleanly.
