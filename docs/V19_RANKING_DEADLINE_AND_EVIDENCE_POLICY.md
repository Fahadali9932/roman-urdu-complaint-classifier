# AWAAZ-E-AWAM — PHASE V19 RANKING, DEADLINES & EVIDENCE POLICY

## 1. Commencement-Based Deadlines

### 1.1 The Operational Problem
In municipal field operations, assigning a work order does not mean an officer is actively at the site. Field officers may be off-duty, engaged in emergency response elsewhere, or awaiting specialized machinery. If the resolution deadline starts immediately upon HOD assignment, innocent delays in shift scheduling unfairly penalize the officer's performance scorecard.

### 1.2 Mathematical Formulation
Under V19, the authoritative deadline is defined strictly upon **field commencement**:

$$\text{effective\_deadline\_at} = \text{started\_at} + (\text{assigned\_duration\_hours} \times 3600 \text{ seconds})$$

Where:
- $\text{started\_at}$: The timestamp when the officer taps **Start Working** in their assigned tasks queue.
- $\text{assigned\_duration\_hours}$: The duration configured by the HOD at dispatch time (defaults to 72 hours).
- Prior to commencement, the order is in `assigned` status, and the timer is held at full duration.
- After commencement, the status moves to `in_progress`, and the live countdown ticks down in real time.

---

## 2. 30-Meter Haversine GPS Proximity Verification

### 2.1 The Verification Problem
To prevent "armchair resolution" (field officers falsely claiming completion from the depot or home), every submitted resolution proof must include device hardware coordinates taken at the moment of evidence capture.

### 2.2 Haversine Distance Formula
Given the incident coordinates $(\phi_1, \lambda_1)$ and the officer's device coordinates $(\phi_2, \lambda_2)$:

$$\Delta \phi = (\phi_2 - \phi_1) \cdot \frac{\pi}{180}$$
$$\Delta \lambda = (\lambda_2 - \lambda_1) \cdot \frac{\pi}{180}$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\left(\phi_1 \cdot \frac{\pi}{180}\right) \cdot \cos\left(\phi_2 \cdot \frac{\pi}{180}\right) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

Where $R = 6,371,000 \text{ meters}$ (Earth radius).

### 2.3 Verdict Thresholds
- **Within 30.0 meters ($d \le 30.0$m):** Automatically tagged with green `30m Proximity Verified` badge (`gps_verified = true`, `location_result = 'near'`).
- **Outside 30.0 meters ($d > 30.0$m):** Tagged with amber warning badge (`gps_verified = false`, `location_result = 'needs_review'`). Flagged in HOD verification queue for mandatory supervisory scrutiny.
- **Missing Baseline:** If citizen submitted without GPS pins, coordinates are recorded and audited without blocking resolution.

---

## 3. Dual Proof Verification & Watermarking

Evidence submission requires photographic evidence before closure:
1. **Citizen Reference Photo:** The original photograph submitted by the citizen during complaint intake.
2. **Resolution Work Photo:** The photo captured by the field officer upon completing repairs.
3. **Dual Inspection Lightbox:** HODs view both photographs side-by-side or toggled in an optical zoom lightbox to visually corroborate that the exact physical defect (e.g. pothole, broken water main, open manhole) has been restored.
4. **Anti-Tamper Stamping:** High-resolution evidence includes cryptographic hash verification and camera EXIF timestamping.

---

## 4. Officer Performance Ranking Engine

An officer's performance rating is computed transparently:

$$\text{Rating} = 1.0 + 4.0 \times \left(0.70 \times \frac{\text{on\_time\_cases}}{\text{verified\_cases}} + 0.30 \times \left(1.0 - \frac{\text{disputed\_cases}}{\text{verified\_cases}}\right)\right)$$

### Rules:
1. **Minimum Volume Threshold:** Officers with fewer than 5 verified cases receive an "Establishing Standing" rating to avoid volatile initial scores.
2. **On-Time Weight (70%):** Timely completions relative to `effective_deadline_at` dominate the rating.
3. **Dispute Penalty (30%):** Citizen dissatisfaction or supervisor rejection subtracts from the score.
4. **Scale:** Bounded strictly between 1.0 and 5.0 stars, rounded to one decimal place.
