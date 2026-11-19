# AWAAZ-E-AWAM — PHASE V13.1
## Discrepancy & Failure Root-Cause Analysis (2,000-Complaint Adversarial Benchmark)

**Date:** 20 November 2026  
**Evaluation Scope:** 2,000 adversarial Roman Urdu complaints  
**Failures Analyzed:** 1,001 failures in Run004; 894 failures in Run006  
**Source Log:** `data/v11/eval_v13_1/failures_run_004.jsonl`  

---

### 1. Executive Failure Overview

The 2,000-complaint evaluation revealed three primary structural bottlenecks that explain why exact-set accuracy drops from 98% on simple development sets to ~50% on realistic civic discourse:

1. **Multi-Label Combinatorial Degradation:** Accuracy degrades precipitously as independent faults increase ($63.1\% \rightarrow 42.8\% \rightarrow 28.3\% \rightarrow 15.0\%$).
2. **Causal Chain & Consequence Entanglement (Fahad's Rule Violations):** When defect A (e.g. water pipe burst) causes secondary damage B (e.g. road crater), the classifier frequently routes to **both** departments ($40.0\%$ exact accuracy), violating Fahad's root-cause routing rule.
3. **Severe Agency Asymmetry (KMC Over-Prediction vs SBCA Under-Prediction):**
   - **KMC:** 213 False Positives (Precision: $65.59\%$). KMC is over-predicted whenever road, street, or debris terms appear.
   - **SBCA:** 227 Missed Mentions (Recall: $58.35\%$). High decision threshold ($0.52$) suppresses valid illegal building complaints into empty predictions.
   - **K-Electric:** 211 Missed Mentions (Recall: $62.72\%$). Subdued activation on multi-clause narratives.

---

### 2. The Multi-Fault Scaling Cliff

In single-fault complaints, the model only has to determine whether the dominant signal exceeds a threshold. In multi-fault complaints ($N \ge 2$), exact-set accuracy requires **simultaneous correct classification of all $N$ independent issues without any spurious false positives**.

$$\text{Exact Set Accuracy} = P\left(\bigcap_{i=1}^{6} (\hat{y}_i = y_i)\right)$$

| Independent Fault Count | Sample Volume | Run004 Exact | Run004 Accuracy | Run006 Accuracy |
| :---: | :---: | :---: | :---: | :---: |
| **0 Faults** (Out of Scope / Ambiguous) | 120 | 87 | 72.50% | **90.83%** |
| **1 Fault** (Single Dept / Canonical) | 880 | 555 | 63.07% | **67.61%** |
| **2 Faults** (Dual Independent) | 600 | 257 | 42.83% | **48.50%** |
| **3 Faults** (Triple Independent) | 300 | 85 | 28.33% | **31.00%** |
| **4 Faults** (Quad Independent) | 100 | 15 | 15.00% | **18.00%** |

#### Why Multi-Fault Accuracy Degrades:
1. **Bag-of-Words Normalization Loss:** In longer paragraphs describing 3 or 4 defects, TF-IDF term weights for secondary and tertiary defects are diluted by the length of the document (sublinear term frequency damping).
2. **Independent Thresholding vs Joint Inference:** The linear SVM treats each department as an independent binary classification task. When $N=4$, all 4 independent classifiers must simultaneously fire above their conservative thresholds, leading to compounding recall decay.

---

### 3. Causal Chains & Historical Secondary Confusion

#### Failure Category A: Causal Consequence Confusion (Fahad's Rule)
- **Benchmark Family:** `CAUSAL_CONSEQUENCE` (70 complaints)
- **Run004 Exact Accuracy:** 40.0% (28/70)
- **Observed Behavior:** The classifier identifies the root cause but **also** assigns the consequence department.

**Case Study 1 (ID: `v13_1_eval_0612`):**
> *"Awaam ki faryad suniye Buffer Zone Sector 15-B se. Water board ki underground main water supply line burst hone ki wajah se hazaron gallon peenay ka paani sadak par beh raha hai aur is shadeed paani ke bahaao ki wajah se poora road toot gaya hai aur har taraf gehre khadday par gaye hain rasta block hai..."*
- **Ground Truth:** `['kwsc']` (Root fault: KWSC water line burst; road crater is merely the secondary consequence).
- **Run004 Output:** `['kmc', 'kwsc']` (Extra: `kmc`).
- **Root Cause:** The presence of terms `road toot gaya` and `khadday par gaye` triggered KMC's TF-IDF features above threshold. The relation engine detected KMC keywords but failed to recognize that the clause was syntactically governed by the causal connective `ki wajah se`.

#### Failure Category B: Historical / Solved Secondary Mention
- **Benchmark Family:** `FALSE_SECONDARY` (60 complaints)
- **Run004 Exact Accuracy:** 26.7% (16/60)
- **Observed Behavior:** A citizen mentions a previously solved repair to contrast with a new problem. The classifier routes to both.

**Case Study 2 (ID: `v13_1_eval_0681`):**
> *"Janab aala Ancholi society near ancholi imambargah ke maslay par tawajjoh dein. Guzishta maah K-Electric walon ne naya transformer laga kar load shedding ka masla hal kar diya tha magar ab hamara ahem tareen masla yeh hai ke SSGC ki gas bilkul band hai chulhay thanday hain..."*
- **Ground Truth:** `['ssgc']` (K-Electric issue was resolved last month).
- **Run004 Output:** `['kelectric', 'ssgc']` (Extra: `kelectric`).
- **Root Cause:** Temporal adverbials (`guzishta maah`, `hal kar diya tha`) were present, but the relation engine's historical clause scope did not span across the compound sentence barrier, leaving the K-Electric n-grams active in the feature vector.

---

### 4. Per-Agency Asymmetry Analysis

#### A. KMC False Positive Inflation (65.59% Precision, 213 False Positives)
KMC is the platform's largest source of false assignments.
- **Root Cause:** In Karachi civic discourse, citizens almost universally mention the street or road as their location anchor (e.g. *"sadak par kachra para hai"*, *"gali mein gutter ubal raha hai"*).
- Words like `sadak`, `gali`, `chowrangi`, and `rasta` have residual positive coefficients for KMC.
- Without strict syntactic subject-verb extraction, generic location references trigger KMC routing.

#### B. SBCA False Negative Suppression (58.35% Recall, 227 Missed)
SBCA has the highest precision ($94.93\%$) but lowest recall ($58.35\%$).
- **Root Cause:** In Run004, the SBCA decision threshold was set to $0.52$ (the highest among all agencies).
- While this successfully prevents false SBCA routing on ordinary housing discussions, it aggressively suppresses genuine complaints describing structural cracks, illegal commercial builders, or unauthorized floor additions.
- When SBCA falls below threshold, complaints with no other agency trigger generic `DESCRIBE_ISSUE` ambiguity prompts rather than routing to SBCA.
- **Run006 Progress:** In Run006, where SBCA threshold was optimized to $0.40$ and training samples expanded, SBCA canonical accuracy jumped from $32.0\%$ to $72.0\%$, and overall recall reached $67.71\%$.

#### C. K-Electric Under-Prediction (62.72% Recall, 211 Missed)
K-Electric is frequently missed in multi-department complaints where it appears alongside prominent water or sanitation issues.
- **Root Cause:** Citizens often mention power outages or voltage drops in brief subordinate clauses (e.g. *"aur bijli bhi bar bar trip karti hai"*).
- In long paragraphs (126-200 words), these short clauses are mathematically overpowered by repetitive paragraphs describing sewage or garbage.

---

### 5. Summary of Root-Cause Categories

```
================================================================================
FAILURE MODE                                      COUNT     % OF TOTAL FAILURES
================================================================================
1. Multi-agency dilution (compounding recall drop)  443            44.3%
2. KMC over-prediction on location anchor words     213            21.3%
3. Causal chain & consequence misattribution         42             4.2%
4. Historical / resolved contrast misattribution     44             4.4%
5. SBCA conservative threshold suppression          176            17.6%
6. Generic ambiguity fallback on vague drafts        83             8.3%
================================================================================
TOTAL DISCREPANCIES ANALYZED                       1,001           100.0%
================================================================================
```

These findings pinpoint the exact algorithmic repairs required for the next phase.
