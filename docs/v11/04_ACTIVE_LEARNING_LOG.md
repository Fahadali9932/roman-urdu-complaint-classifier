# AWAAZ-E-AWAM (آوازِ عوام) — PHASE V11
## 04. ACTIVE LEARNING AUDIT LOG & ACQUISITION MANIFEST

**Document Version:** 2.0.0 (Post-V11.1 Forensic Audit & V11.2A Remediation)  
**Phase:** V11 / V11.2A  
**Execution Timestamp:** 2026-11-16  
**Registry Path:** `tools/ai_factory/registry/cycles/`  
**Status:** ⚠️ **CYCLES 1–3 INVALIDATED DUE TO TRAINING DATA LEAKAGE**

---

> [!CAUTION]
> ### FORMAL INVALIDATION NOTICE
> The synthetic metrics reported for Active Learning Cycles 1, 2, and 3 in the original V11 run are **INVALID FOR MODEL SELECTION** due to training data leakage.
>
> **Root Cause:**
> In the original `run_cycle` implementation, new synthetic training records were acquired using global `generate_dataset(synthetic_increment)` across the entire scenario catalog. This allowed samples from held-out validation and test scenario families to infiltrate the training set, causing synthetic test accuracy to artificially inflate to 94.71% and validation to 100.0%.
>
> In Phase V11.2A, the generator and learner were refactored to enforce strict `authorized_train_families` isolation with immediate automated assertion failures if any family overlap or shingle Jaccard similarity $\ge 0.88$ is detected.

---

### 1. Reconciling the Human-Gold Decline (72.73% to 54.55%)

During original active learning, synthetic exact match rose from 87.65% to 94.71%, but performance on the 33 historical developer test fixtures dropped sharply from **72.73% (24/33)** down to **54.55% (18/33)**.

#### Sample-Level Forensic Audit of Errors:

| Metric | Initial Baseline (B1_B) | Cycle 1 Model | Cycle 2 Model | Cycle 3 Model | V11.2A with Context Engine |
|---|---:|---:|---:|---:|---:|
| **Exact Match** | **24 / 33 (72.73%)** | 19 / 33 (57.58%) | 18 / 33 (54.55%) | **18 / 33 (54.55%)** | **27 / 33 (81.82%)** |
| **Total Prediction Errors** | 9 | 14 | 15 | 15 | **6** |
| **False Extra Departments** | 3 / 33 (9.09%) | 6 / 33 (18.18%) | 8 / 33 (24.24%) | **8 / 33 (24.24%)** | **3 / 33 (9.09%)** |
| **False Negative Drops** | 6 / 33 (18.18%) | 8 / 33 (24.24%) | 7 / 33 (21.21%) | 7 / 33 (21.21%) | **3 / 33 (9.09%)** |

#### Why the Synthetic Model Degraded on Natural Phrasing:
1. **Threshold Collapse on Overfit Training Data:**  
   Because training data leaked held-out scenario templates, the optimizer lowered per-department decision thresholds to 0.25 (the minimum search boundary). At $t = 0.25$, unigram keyword associations caused an explosion of phantom secondary departments on natural phrasing.
2. **The 3 Primary False Extra Failure Modes (24.24% False Extra Rate):**
   - **Water Pressure triggering SSGC:** In complaints like *"water supply ka low pressure hai"*, the token `pressure` triggered SSGC because the model lacked cross-domain disambiguation between piped water and gas pressure.
   - **Building Excavation triggering SSGC:** In complaints like *"building ki illegal basement excavation ho rahi hai"*, the token `excavation` triggered SSGC without any gas leak evidence.
   - **Electrical Wire on Footpath triggering KMC:** In complaints like *"footpath par bijli ki taar giri hui hai"*, the spatial location token `footpath` triggered KMC road repair despite zero road structural defect.
3. **V11.2A Contextual Remediation:**  
   Implementing `CivicRelationResolver` suppresses these 3 phantom secondary assignments, dropping the false extra rate from 24.24% down to 9.09% and restoring exact match on the developer fixtures to 81.82%.

---

### 2. Contaminated Cycle Manifests (Audit Archive)

The manifests below are preserved solely for forensic reproducibility:

#### Cycle 1 Manifest (`cycle_01_manifest.json`):
- **Status:** INVALIDATED_DUE_TO_DATA_LEAKAGE
- **Seed:** 59 | **Train Size:** 1,094 records
- **Tuned Thresholds:** `kmc`: 0.45, `kwsc`: 0.57, `kelectric`: 0.43, `ssgc`: 0.35, `sswmb`: 0.25, `sbca`: 0.25
- **Contaminated Synthetic Test Exact Match:** 87.65%
- **Historical Developer Fixtures Exact Match:** 57.58% (19/33)

#### Cycle 2 Manifest (`cycle_02_manifest.json`):
- **Status:** INVALIDATED_DUE_TO_DATA_LEAKAGE
- **Seed:** 76 | **Train Size:** 1,344 records
- **Tuned Thresholds:** `kmc`: 0.30, `kwsc`: 0.28, `kelectric`: 0.25, `ssgc`: 0.25, `sswmb`: 0.25, `sbca`: 0.25
- **Contaminated Synthetic Test Exact Match:** 94.71%
- **Historical Developer Fixtures Exact Match:** 54.55% (18/33)

#### Cycle 3 Manifest (`cycle_03_manifest.json`):
- **Status:** INVALIDATED_DUE_TO_DATA_LEAKAGE
- **Seed:** 93 | **Train Size:** 1,594 records
- **Contaminated Synthetic Test Exact Match:** 94.71% (Plateaued)
- **Historical Developer Fixtures Exact Match:** 54.55% (18/33)

---

### 3. V11.2A Bounded Retraining Prerequisites

Before executing any retraining in Phase V11.2B:
1. `authorized_train_families` must be strictly derived from `set(train_families) - set(val_families) - set(test_families)`.
2. Split manifests with SHA-256 hashes must be verified prior to every cycle.
3. The 33 developer fixtures must NOT be used for parameter tuning.
4. An authentic, human-reviewed citizen gold dataset must be curated under double-annotation review.
