# AWAAZ-E-AWAM — V22.4.1 FINAL CITIZEN PORTAL CORRECTIONS REPORT

**Date:** 28 November 2026 (Pakistan Time)  
**Branch:** `fix/v22-4-1-citizen-camera-location-responsive`  
**Base Commit:** `58155cc`  
**Safety Checkpoint Tag:** `checkpoint/before-v22-4-1-citizen-corrections`  
**Primary Protected Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` (**100% UNTOUCHED**)  
**Active Development Worktree:** `D:\RomanUrdu_V13_19_Review`  
**Staff Portals (HOD & Officer):** **100% PRESERVED AND UNTOUCHED**  
**Total Financial Cost:** **$0.00** (Zero external paid APIs, zero Google Maps billing, zero paid cloud services)  
**Delivery Target:** 5 December 2026  

---

## 1. Executive Summary

In Phase V22.4.1, all three defects identified by the project owner in the Citizen Portal have been resolved in one coordinated, production-ready implementation cycle:

1. **Complaint Photograph Section:** Completely eliminated all file uploads, gallery selection, desktop file pickers, drag-and-drop zones, and visual clutter. Implemented a **live camera capture flow only** via `navigator.mediaDevices.getUserMedia()` with real-time video preview, single-frame capture, client-side canvas downscaling ($\le 1600\text{px}$), progressive compression loop ($< 1\text{MB}$ JPEG), metadata (EXIF) stripping, explicit state progression (`idle` $\to$ `streaming` $\to$ `processing` "Preparing photo..." $\to$ `reviewing` $\to$ `accepted` "Photo captured."), stream track cleanup on accept/cancel/unmount, retake capability, and strict progression blocking if no photo is accepted.
2. **Mandatory Live Location Section:** Completely removed embedded maps, manual coordinate input fields (`#incident-lat-input`, `#incident-lon-input`), `<details>` fallback toggles, paste fields, and silent centroid substitution (`DISTRICT_CENTROIDS`). Implemented **mandatory live geolocation only** via `navigator.geolocation.getCurrentPosition()`. Rendered concise civic copy: Heading *"Issue location"* (Urdu: *"مسئلے کا مقام"*), Supporting *"Attach your location while at the issue site."* (Urdu: *"مسئلے کی جگہ پر موجود ہوتے ہوئے اپنا مقام منسلک کریں۔"*), and Primary Action *"Add location"* (Urdu: *"مقام شامل کریں"*). Configured strict button state: the Continue button in Step 3 is **disabled** until live coordinates within Sindh/Karachi are attached; step dots block skipping to Step 4; and submission fails if live coordinates are absent. Handled permission denied (*"Allow location access to continue."*) and out-of-service area (*"This location is outside our service area."*) without clearing citizen data.
3. **Mobile & Responsive Optimization:** Corrected navigation drawer anchoring in `PublicHeader.tsx` so the dropdown dynamically anchors beneath the trigger button in English (right-aligned) and Urdu RTL (left-aligned). Validated responsive layout, spacing, touch targets ($\ge 44\text{px}$), and text wrapping across 1920px (Desktop), 768px (Tablet), 390px (Mobile), and 320px (Compact Mobile) viewports in both English and Urdu.

---

## 2. Detailed Technical Implementation

### Objective 1: Complaint Photograph Section (Live Camera Only)

- **Source File:** `src/features/citizen/components/IssuePhotoCaptureSection.tsx`
- **Utility File:** `src/utils/imageCompression.ts`
- **Elimination of File Uploads:**
  - Removed `<input type="file">`, `accept="image/*"`, `id="file-photo-input"`, and all references to "Choose from files" or file picking.
  - Removed decorative informational boxes, file size badges, and confusing secondary upload paths.
- **Camera Workflow & States:**
  - `idle`: Displays heading *"Issue photo"*, instruction *"Take a clear photo of the issue."*, primary button *"Capture photo"* (Urdu: *"تصویر کھینچیں"*), and privacy note *"Avoid including faces or personal documents."*.
  - `streaming`: Activates device camera via `navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })`. Displays real-time `<video>` element with *"Capture"* and *"Cancel"* buttons.
  - `processing`: While frame is extracted and compressed, displays only *"Preparing photo..."* (Urdu: *"تصویر تیار ہو رہی ہے…"*) with subtle spinner.
  - `reviewing`: Renders captured photo preview with *"Use photo"* (Urdu: *"تصویر استعمال کریں"*) and *"Retake"* (Urdu: *"دوبارہ لیں"*).
  - `accepted`: Shows confirmation badge *"Photo captured."* (Urdu: *"تصویر محفوظ ہو گئی۔"*) with maroon checkmark, thumbnail, and *"Retake photo"* action.
- **Client-Side Compression (`compressCanvasFrame`):**
  - Draws frame onto HTML5 Canvas, automatically stripping EXIF tags and device metadata.
  - Downscales maximum dimension to 1600px maintaining aspect ratio.
  - Progressive compression loop: tests initial JPEG quality at 0.80; if payload exceeds 1MB, reduces quality by 0.15 down to 0.50.
  - Safe headless/JSDOM fallback prevents hanging promises during automated testing.
- **Resource Cleanup:**
  - `stopStream()` safely halts all media stream tracks (`track.stop()`) on photo accept, cancel, unmount, or page leave.

### Objective 2: Mandatory Live Location

- **Source File:** `src/features/citizen/components/IncidentPinPicker.tsx`
- **Container File:** `src/features/citizen/simplified-complaint/SimplifiedComplaintContainer.tsx`
- **Complete Elimination of Maps & Manual Coordinates:**
  - Excised all embedded maps, Leaflet containers, and static tile layers.
  - Excised `<details>` manual coordinate fallback, `#incident-lat-input`, `#incident-lon-input`, and "Verify location" buttons.
  - Excised all raw latitude, longitude, and precision meters numbers from the citizen UI.
  - Excised silent `DISTRICT_CENTROIDS` fallback: coordinates are strictly required from live device geolocation.
- **Presentation & Typography:**
  - Heading: *"Issue location"* (Urdu: *"مسئلے کا مقام"*)
  - Supporting text: *"Attach your location while at the issue site."* (Urdu: *"مسئلے کی جگہ پر موجود ہوتے ہوئے اپنا مقام منسلک کریں۔"*)
  - Primary button: *"Add location"* (Urdu: *"مقام شامل کریں"*)
  - In progress: *"Getting your location..."* (Urdu: *"آپ کا مقام حاصل کیا جا رہا ہے…"*) with subtle spinner.
  - Attached state: Status badge *"Location attached."* (Urdu: *"مقام منسلک ہو گیا۔"*) with maroon `#681822` checkmark icon on `#F7EFF0` background. Secondary actions: *"Update location"* (Urdu: *"مقام تبدیل کریں"*) and *"Clear"* (Urdu: *"مقام ہٹائیں"*).
- **Error States:**
  - Permission Denied (`code: 1`): Displays *"Allow location access to continue."* (Urdu: *"جاری رکھنے کے لیے مقام کی اجازت دیں۔"*).
  - Out of Service Area: Displays *"This location is outside our service area."* (Urdu: *"یہ مقام ہماری سروس کے دائرہ کار سے باہر ہے۔"*).
  - General Unavailable: Displays *"Unable to get your location. Please try again."* (Urdu: *"مقام حاصل نہیں ہو سکا۔ براہِ کرم دوبارہ کوشش کریں۔"*).
- **Enforcement & Validation:**
  - `complete[2]` in `SimplifiedComplaintContainer.tsx` requires `incidentPin` to be present.
  - Step 3 Continue button is strictly disabled (`disabled={!incidentPin || isLocatingLocation}`).
  - Step navigation dots block clicking Step 4 if `!incidentPin`.
  - Form submission rejects submission if `incidentPin` is missing or outside Sindh boundaries.

### Objective 3: Mobile Optimization & PublicHeader Dropdown Alignment

- **Source File:** `src/components/layout/PublicHeader.tsx`
- **Dropdown Alignment Fix:**
  - In English (LTR), the navigation menu trigger button is on the right. Corrected `updateDropdownPosition` to calculate `right = window.innerWidth - btnRect.right`, anchoring the dropdown directly under the trigger button extending inward to the left.
  - In Urdu (RTL), the navigation menu trigger button is on the left. Corrected `updateDropdownPosition` to calculate `left = btnRect.left`, anchoring the dropdown directly under the trigger button extending inward to the right.
- **Multi-Viewport Audit:**
  - Desktop (1920px), Tablet (768px), Mobile (390px), and Compact Mobile (320px) inspected and verified.
  - Fountain pen illustration in Urdu hero verified with comfortable negative clearance and zero text collision.
  - All touch targets meet WCAG 2.2 AAA guidelines ($\ge 44\text{px}$).

---

## 3. Automated Quality Gates & Test Verification

| Test Suite / Quality Gate | Result | Status |
| :--- | :--- | :--- |
| **TypeScript Compilation (`tsc -b`)** | 0 errors | **PASS** |
| **Vite Production Bundle (`vite build`)** | Bundle generated in 3.45s (0 errors) | **PASS** |
| **`V22_4_1_CitizenCameraLocation.test.tsx`** | 10 passed (10 tests) | **PASS** |
| **`ComplaintForm.test.tsx`** | 5 passed (5 tests) | **PASS** |
| **`ProfessionalComplaintForm.test.tsx`** | 5 passed (5 tests) | **PASS** |
| **`GuestComplaintSubmissionAndClaiming.test.tsx`** | 3 passed (3 tests) | **PASS** |
| **`V14_SindhGeoEligibility.test.tsx`** | 17 passed (17 tests) | **PASS** |
| **`V23_CitizenPortalRefinement.test.tsx`** | 6 passed (6 tests) | **PASS** |
| **`V13_0_CitizenSubmissionV11Integration.test.tsx`** | 13 passed (13 tests) | **PASS** |
| **Full Vitest Test Suite** | 921 passed (921 tests, 0 regressions) | **PASS** |

---

## 4. Playwright Visual QA Screenshot Artifacts

All visual QA screenshots were captured across viewports (1920px, 768px, 390px, 320px) in both English and Urdu and saved to `screenshots/v22_4_1_citizen/`:

1. `v22_4_1_landing_desktop_1920_en.png` — English desktop hero and navigation dock.
2. `v22_4_1_landing_desktop_1920_ur.png` — Urdu desktop hero with aligned fountain pen nib.
3. `v22_4_1_landing_tablet_768_en.png` — English tablet layout.
4. `v22_4_1_landing_tablet_768_ur.png` — Urdu tablet layout.
5. `v22_4_1_landing_mobile_390_en.png` — English mobile (390px) hero.
6. `v22_4_1_landing_mobile_390_ur.png` — Urdu mobile (390px) hero with aligned pen.
7. `v22_4_1_landing_mobile_320_en.png` — English compact mobile (320px).
8. `v22_4_1_landing_mobile_320_ur.png` — Urdu compact mobile (320px).
9. `v22_4_1_mobile_menu_open_390_en.png` — English mobile navigation drawer anchored under menu button.
10. `v22_4_1_mobile_menu_open_390_ur.png` — Urdu mobile navigation drawer anchored under menu button.
11. `v22_4_1_form_step1_desktop_1920_en.png` — Step 1 Contact Details (1920px).
12. `v22_4_1_form_step2_camera_idle_desktop_1920_en.png` — Step 2 Camera idle state with zero file inputs.
13. `v22_4_1_form_step2_photo_captured_desktop_1920_en.png` — Step 2 Photo captured confirmation badge and retake button.
14. `v22_4_1_form_step3_location_idle_desktop_1920_en.png` — Step 3 Location idle state with Add location button and disabled Continue.
15. `v22_4_1_form_step3_location_attached_desktop_1920_en.png` — Step 3 Location attached confirmation badge, update, and clear.
16. `v22_4_1_form_step4_complaint_desktop_1920_en.png` — Step 4 Description and submission card.
17. `v22_4_1_form_step1_mobile_390_en.png` — Step 1 on mobile 390px.
18. `v22_4_1_form_step2_camera_idle_mobile_390_en.png` — Step 2 Camera idle on mobile 390px.
19. `v22_4_1_form_step2_photo_captured_mobile_390_en.png` — Step 2 Photo captured on mobile 390px.
20. `v22_4_1_form_step3_location_idle_mobile_390_en.png` — Step 3 Location idle on mobile 390px.
21. `v22_4_1_form_step3_location_attached_mobile_390_en.png` — Step 3 Location attached on mobile 390px.
22. `v22_4_1_form_step4_complaint_mobile_390_en.png` — Step 4 Description on mobile 390px.
23. `v22_4_1_form_step1_mobile_390_ur.png` — Urdu Step 1 on mobile 390px.
24. `v22_4_1_track_mobile_390_en.png` — Track Complaint page on mobile 390px.
25. `v22_4_1_login_mobile_390_en.png` — Citizen Login page on mobile 390px.

---

## 5. Git Safety & Worktree Audit

- **Authorized Review Worktree:** `D:\RomanUrdu_V13_19_Review`
- **Branch:** `fix/v22-4-1-citizen-camera-location-responsive`
- **Protected Primary Worktree:** `D:\RomanUrdu_ComplaintClassifier_staff_auth` remained **100% untouched** (verified by `git status`).
- **Staff Portals:** HOD and Officer staff portals were untouched and preserved.
- **Cost:** $0.00 expenditure.
