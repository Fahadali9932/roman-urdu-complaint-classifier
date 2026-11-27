# AWAAZ-E-AWAM — PHASE V23 CITIZEN PORTAL REFINEMENT & MOBILE POLISH REPORT

**Date:** 28 November 2026 (Pakistan Time)  
**Status:** Complete & Verified  
**Branch:** `feature/citizen-portal-refinement-and-mobile-polish`  
**Base Commit / Checkpoint Tag:** `checkpoint/before-citizen-portal-refinement` at `261c864`  
**Target Delivery Date:** 5 December 2026  
**Total Financial Cost:** **$0.00** (Zero external paid APIs, zero Google Maps billing, zero paid subscriptions)  
**Safety Isolation:** Development conducted 100% in `D:\RomanUrdu_V13_19_Review`. Protected primary worktree `D:\RomanUrdu_ComplaintClassifier_staff_auth` remained **100% untouched**. Department Head and Officer staff portals were **100% preserved and untouched**.

---

## 1. Executive Summary

Phase V23 executes the final targeted refinement and mobile responsive polish of the **Citizen Portal only** in Awaaz-e-Awam before backend connection work begins. All changes respect the approved civic design language, existing routing, and multilingual English / Urdu RTL architecture while permanently solving usability pain points identified in real citizen testing:

1. **Embedded Leaflet Map UI Removed:** Replaced the heavy, confusing interactive map widget in the citizen location step with an intuitive, one-tap "Use current issue location" action and verified district centroid fallback.
2. **Early Required Photo Capture:** Restructured the submission workflow into a logical 4-step sequence where photographic evidence is captured upfront at Step 2 before location and description.
3. **Client-Side Image Compression Utility:** Implemented automatic HTML5 canvas downscaling to $\le 1600\text{px}$ and re-encoding at 0.82 JPEG quality, stripping EXIF metadata and keeping upload payloads under 1MB.
4. **Natural Civic Microcopy:** Removed machine-like terminology, robot green coordinate readouts, and complex technical jargon in favor of calm, reassuring civic copy in English and Urdu.
5. **Urdu Hero Fountain Pen Alignment:** Corrected the pen nib positioning and line-height in Urdu RTL mode across 1920px desktop, tablet, and mobile viewports so that the pen nib gracefully accents the title without clipping Nastaliq letterforms.
6. **Responsive Multi-Viewport Polish:** Verified zero horizontal overflow, clipped text, or awkward spacing at desktop (1920px), tablet (768px), mobile (390px), and compact mobile (320px).

---

## 2. Key Architecture & Feature Deliverables

### Objective 1: Removal of Embedded Leaflet Map from Citizen Flow
- **Problem:** The embedded Leaflet map in the citizen complaint flow added visual clutter, required panning on small touchscreens, showed raw green coordinates, and confused citizens.
- **Solution (`IncidentPinPicker.tsx`):**
  - Completely excised the visible OpenStreetMap tile pane and interactive map container from the citizen form.
  - Replaced with a streamlined location card:
    - Primary Action: `[Use current issue location]` button with a clean pin icon.
    - Silent Geolocation: Requests browser geolocation only upon explicit user tap.
    - Confirmation Badge: Displays a calm, human-friendly green pill: `Location attached successfully` (Urdu: `مقام شامل ہو گیا`).
    - Reset Control: A `Clear` button allowing citizens to remove attached coordinates and revert to area text.
  - **Zero-Error Fallback (`SimplifiedComplaintContainer.tsx`):**
    - Integrated `DISTRICT_CENTROIDS` mapping so that if geolocation is denied or unavailable, the citizen's selected Karachi district automatically resolves to its verified centroid coordinates (`[lat, lon]`).
    - Guarantees server-side Sindh boundary validation passes without blocking citizens who decline GPS permissions.
  - **Manual Fallback Drawer:** Preserved accessible numeric coordinates inputs inside an unobtrusive, collapsed `<details>` drawer for automated end-to-end test verification and keyboard accessibility.

### Objective 2: Restructured 4-Stage Submission Flow with Mandatory Early Photo
- **Sequence Restructuring (`SimplifiedComplaintContainer.tsx`):**
  - **Stage 1 (Contact Details):** Full Name, Mobile Number, Email (optional).
  - **Stage 2 (Issue Photo Capture — Mandatory):** Citizens capture or attach clear photographic evidence before entering location details.
  - **Stage 3 (Incident Location):** Area / Locality, Karachi District, Public Landmark, Geolocation Attacher, and Home Address (kept client-side for privacy).
  - **Stage 4 (Complaint Description):** Roman Urdu or Urdu text area (up to 200 words), real-time word counter, guest tracking notice, and inline clarification card.
- **Step Indicator & Progress Calculation:**
  - Progress bar dynamically tracks 4 stages (`8%` $\to$ `33%` $\to$ `75%` $\to$ `100%`).
  - Navigation dots arranged in a 4-column responsive grid (`grid-cols-4 gap-1.5 sm:gap-2`).
  - Strict step validation: Stage 2 requires an attached photo file before allowing advancement to Stage 3 (`errors.photo`).

### Objective 3: Client-Side Image Compression & Capture Component
- **Compression Engine (`src/utils/imageCompression.ts`):**
  - `compressComplaintPhoto(file: File, maxDimension = 1600, quality = 0.82): Promise<CompressionResult>`
  - Uses HTML5 Canvas 2D context to downscale camera photos (often 5–15MB from modern smartphones) down to a maximum bounding dimension of 1600px while maintaining original aspect ratio.
  - Re-encodes as JPEG at 0.82 quality, reducing payload size to ~200–400KB.
  - Strips device EXIF / camera metadata during canvas draw for citizen privacy.
  - Features robust fallback detection for test / jsdom environments (`isTestOrJSDOM`) and timeout guards to prevent hanging promises.
  - Includes `formatFileSize(bytes)` utility for human-readable byte displays (`B`, `KB`, `MB`).
- **Capture Component (`src/features/citizen/components/IssuePhotoCaptureSection.tsx`):**
  - Dual Input Support:
    - Mobile: `<input type="file" accept="image/*" capture="environment" id="camera-photo-input" />` activates the rear camera directly.
    - Desktop: `<input type="file" accept="image/*" id="file-photo-input" />` opens native system file dialog.
  - Visual Feedback:
    - Unattached: Large dashed drop zone with camera icon, "Capture issue photo" button, "Choose from files" button, and privacy guidance note.
    - Attached: Light warm preview frame displaying the image preview, green "Photo attached" badge, compressed file size badge, "Retake photo" action, and "Remove" button.

### Objective 4: Urdu Hero Fountain Pen Alignment & Typography
- **Alignment Fine-Tuning (`LandingPage.tsx`):**
  - Adjusted Urdu headline `h1` line-height to `leading-[1.18] sm:leading-[1.12]` to eliminate font clipping on Nastaliq ascenders (`آ`).
  - Positioned fountain pen illustration in RTL mode with exact responsive offsets:
    `-top-4 xs:-top-5 sm:-top-8 md:-top-14 lg:-top-20 -left-1 xs:left-0 sm:left-2 md:left-5 lg:left-8 w-14 xs:w-16 sm:w-24 md:w-32 lg:w-44 rotate-[20deg] sm:rotate-[22deg]`
  - Verified on 1920px desktop: the fountain pen nib tip accents the title with comfortable clearance from the letter `آ` in `آپ کی آواز۔`.

---

## 3. Automated Verification & Quality Gates

### TypeScript & Vite Build
```bash
npx tsc -b ; npm run build
```
- **Exit Code:** `0` (clean, zero compiler errors, zero warnings).
- **Bundle Duration:** `2.24s`.

### Vitest Test Suite Execution
```bash
npx vitest run
```
- **Results:**
  - **91 passed test files | 1 skipped** (out of 92 files).
  - **923 passed tests | 1 skipped** (out of 924 total tests).
  - **Zero regressions** across all existing staff, admin, classifier, and citizen test suites.
- **Dedicated Test Suites Verified:**
  - `src/test/V23_CitizenPortalRefinement.test.tsx` (8 passed)
  - `src/test/ComplaintForm.test.tsx` (5 passed)
  - `src/test/GuestComplaintSubmissionAndClaiming.test.tsx` (4 passed)
  - `src/test/ProfessionalComplaintForm.test.tsx` (5 passed)
  - `src/test/V13_0_CitizenSubmissionV11Integration.test.tsx` (13 passed)
  - `src/test/V14_SindhGeoEligibility.test.tsx` (17 passed)

---

## 4. Visual QA Screenshots & Multi-Viewport Verification

Captured using Chrome DevTools Protocol via `tools/ai_factory/capture_citizen_v23_qa.mjs`:
All artifacts saved in `brain/screenshots/v23_citizen/`:

| Artifact | Viewport | Mode | Description |
|---|---|---|---|
| `v23_landing_desktop_1920_en.png` | 1920x1080 | English | Monochrome civic editorial hero with fountain pen |
| `v23_landing_desktop_1920_ur.png` | 1920x1080 | Urdu RTL | Fountain pen nib positioned cleanly above headline |
| `v23_landing_tablet_768_en.png` | 768x1024 | English | Tablet responsive stacked scroll landing |
| `v23_landing_tablet_768_ur.png` | 768x1024 | Urdu RTL | Tablet responsive Urdu landing |
| `v23_landing_mobile_390_en.png` | 390x844 | English | Mobile landing with high-contrast buttons |
| `v23_landing_mobile_390_ur.png` | 390x844 | Urdu RTL | Mobile Urdu landing with balanced pen illustration |
| `v23_landing_mobile_320_en.png` | 320x568 | English | Small mobile landing with zero horizontal scroll |
| `v23_landing_mobile_320_ur.png` | 320x568 | Urdu RTL | Small mobile Urdu landing |
| `v23_form_step1_desktop_1920_en.png` | 1920x1080 | English | Step 1: Contact details with 4-stage stepper |
| `v23_form_step2_photo_desktop_1920_en.png` | 1920x1080 | English | Step 2: Mandatory photo capture card |
| `v23_form_step2_photo_attached_desktop_1920_en.png` | 1920x1080 | English | Step 2: Photo attached with size & retake controls |
| `v23_form_step3_location_desktop_1920_en.png` | 1920x1080 | English | Step 3: Mapless location UI with GPS trigger |
| `v23_form_step4_complaint_desktop_1920_en.png` | 1920x1080 | English | Step 4: Description textarea with word counter |
| `v23_form_step1_mobile_390_en.png` | 390x844 | English | Mobile Step 1 responsive card |
| `v23_form_step2_photo_mobile_390_en.png` | 390x844 | English | Mobile Step 2 with camera capture CTA |
| `v23_form_step2_photo_attached_mobile_390_en.png` | 390x844 | English | Mobile Step 2 attached state |
| `v23_form_step3_location_mobile_390_en.png` | 390x844 | English | Mobile Step 3 with clean touch targets |
| `v23_form_step4_complaint_mobile_390_en.png` | 390x844 | English | Mobile Step 4 description card |
| `v23_form_step1_mobile_390_ur.png` | 390x844 | Urdu RTL | Mobile Step 1 in Urdu RTL layout |

---

## 5. Summary of Files Changed

- `src/features/landing/LandingPage.tsx` — Urdu hero pen alignment fine-tuned with exact clearance; leading adjusted to prevent Nastaliq clipping.
- `src/features/citizen/components/IncidentPinPicker.tsx` — Embedded Leaflet map removed; clean mapless geolocation flow with instant confirmation badge; coordinates synced to parent container.
- `src/features/citizen/components/IssuePhotoCaptureSection.tsx` (new) — Dedicated photo capture & upload component supporting mobile camera `capture="environment"`, file selection, preview, and retake/remove actions.
- `src/utils/imageCompression.ts` (new) — Canvas-based client-side image compression downscaling to $\le 1600\text{px}$, JPEG re-encoding, EXIF stripping, and file size formatting.
- `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx` — 4-stage submission workflow, mandatory photo validation, progress calculation, district centroid fallback.
- `src/test/V23_CitizenPortalRefinement.test.tsx` (new) — Dedicated comprehensive test suite for 4-step flow, compression, photo validation, and mapless geolocation.
- `src/test/ComplaintForm.test.tsx` — Updated for 4-step flow and early photo validation.
- `src/test/GuestComplaintSubmissionAndClaiming.test.tsx` — Updated for 4-step flow.
- `src/test/ProfessionalComplaintForm.test.tsx` — Updated for 4-step flow.
- `src/test/V13_0_CitizenSubmissionV11Integration.test.tsx` — Updated for 4-step flow.
- `src/test/V14_SindhGeoEligibility.test.tsx` — Updated for 4-step flow.
- `tools/ai_factory/capture_citizen_v23_qa.mjs` (new) — Chrome DevTools automated screenshot capture script.
