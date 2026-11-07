# Frontend UI/UX & Accessibility Audit (Phase 1B Baseline)
**Project:** Roman Urdu Complaint Classifier (*Awaaz-e-Awam*)  
**Institution:** Greenwich University, Karachi, Pakistan  
**Audit Date:** November 7, 2026  
**Audited Branch:** `feature/frontend-polish`  
**Evaluation Scope:** Visual hierarchy, typography, responsiveness (1440px, 1024px, 768px, 390px, 320px), English/Urdu RTL layout, accessibility (WCAG 2.2 AA), and prototype transparency.

---

## 1. Executive Summary

The Phase 1 foundation provides a solid modular React + TypeScript architecture with 16 passing automated tests and clean separation of concerns. However, a rigorous design and usability audit reveals several areas that require refinement to achieve university-showcase and production-grade civic-tech caliber:

- **Urdu Typography & RTL Directionality:** When toggled to Urdu, certain directional indicators (arrows, progress bars, timeline lines) required CSS margin/padding adjustments to avoid misaligned layouts. Reference codes (`KHI-2026-XXXX`) and Roman Urdu passages must be explicitly forced to `dir="ltr"` so Latin strings do not render inverted or fractured in RTL mode.
- **Hero & Landing Section Composition:** The landing hero had strong typography but lacked a tangible visual representation of the core value proposition (how a messy Roman Urdu grievance is structured and categorized into municipal tickets).
- **Complaint Form Information Architecture:** The submission form was functional, but its three logical sections (Contact Info, Location & Jurisdiction, Grievance Details) needed clearer visual grouping, higher-contrast labels, and the instructional Roman Urdu prompt required by Greenwich project specifications: *"Do din se bijli nahi aa rahi aur pani ki motor bhi band hai."*
- **Dashboard Usability & Filtering:** The citizen dashboard had basic status filter buttons, but lacked live search-by-keyword/reference and explicit prototype demonstration tags on individual cards.
- **Tracking Timeline Fidelity:** The vertical timeline needed distinct styling for completed, current active, and future workflow stages, and strict privacy masking for confidential citizen PII.
- **Auth Screen Prototype Transparency:** Login and registration screens lacked password visibility toggles and needed a clear, direct "Explore Demo Portal" option to eliminate any illusion of fake security storage.

---

## 2. Issues Discovered & Classification

### Critical Severity (Broken Functionality or Inaccessible Interfaces)
*None discovered.* (All 16 Vitest automated tests pass; dev server and routing function reliably.)

### High Severity (Major Usability, Accessibility or Responsive Layout Issues)
1. **[HIGH-01] RTL Roman Urdu & Reference Number Inversion:**
   - **Screen:** All screens displaying Roman Urdu text and reference numbers (`LandingPage`, `ComplaintTracker`, `ComplaintCard`, `ComplaintForm`).
   - **Problem:** When Urdu mode is active (`dir="rtl"`), Latin strings with hyphens or punctuation (such as `KHI-2026-7842` or mixed Roman Urdu text) can suffer bidirectional reordering bugs.
   - **Solution:** Wrap reference codes and Roman Urdu quote blocks in `dir="ltr"` and `text-left` / `text-start` with explicit Latin typography (`font-sans`).
2. **[HIGH-02] Touch Target Sizes on Narrow Mobile Viewports (320px–390px):**
   - **Screen:** `PublicHeader`, `CitizenSidebar`, `ComplaintTracker` quick-sample buttons.
   - **Problem:** Small filter chips and mobile buttons were slightly under 44px touch targets on mobile viewports.
   - **Solution:** Increase padding, min-height, and hit areas to meet WCAG 2.2 touch-target criteria.

### Medium Severity (Inconsistent Design, Confusing Interactions, Incomplete States)
1. **[MED-01] Missing Search Filter on Citizen Dashboard:**
   - **Screen:** `CitizenDashboard.tsx`
   - **Problem:** Citizens could only filter by status buttons. There was no way to search complaints by reference code, area, or title snippet.
   - **Solution:** Add an integrated real-time search input that filters in-memory mock complaints alongside the status filters.
2. **[MED-02] Password Input Visibility Controls on Auth Pages:**
   - **Screen:** `LoginPage.tsx`, `RegisterPage.tsx`
   - **Problem:** Password fields lacked a reveal/hide toggle, reducing usability on mobile devices.
   - **Solution:** Add an accessible eye toggle (`Eye` / `EyeOff`) with keyboard support.
3. **[MED-03] Prototype Transparency & One-Click Demo Access:**
   - **Screen:** `LoginPage.tsx`, `RegisterPage.tsx`, `ComplaintForm.tsx`
   - **Problem:** Forms could be confused with live production services.
   - **Solution:** Add explicit "Explore Demo Portal" button and prominent notice explaining that Phase 1/1B is a client prototype with live Supabase authentication scheduled for Phase 2.
4. **[MED-04] Hero Visual Composition & Pakistani Civic Context:**
   - **Screen:** `LandingPage.tsx`
   - **Problem:** The hero section had only text and buttons. It lacked a visual cue demonstrating Roman Urdu triage.
   - **Solution:** Design an interactive/visual civic workflow card mockup showcasing Roman Urdu ingestion (*"Bijli ka pole jhuka hua hai..."*) -> automated categorization -> municipal dispatch to K-Electric.
5. **[MED-05] Roman Urdu Instructional Copy in Form:**
   - **Screen:** `ComplaintForm.tsx`
   - **Problem:** The example copy did not match the official prompt recommendation.
   - **Solution:** Update to: *"Do din se bijli nahi aa rahi aur pani ki motor bhi band hai."*

### Low Severity (Minor Visual Refinements & Spacing)
1. **[LOW-01] Urdu Font Stack Optimization:**
   - **Screen:** Global (`index.css`)
   - **Problem:** Default fallback to Arial in Urdu mode lacks authentic Nastaliq elegance.
   - **Solution:** Expand system font stack to prioritize `Noto Nastaliq Urdu`, `Urdu Typesetting`, `Segoe UI Historic`, with graceful fallbacks.
2. **[LOW-02] Focus Rings for Keyboard Navigation:**
   - **Screen:** Global form inputs and buttons
   - **Problem:** Default focus rings needed higher contrast on dark/light backgrounds.
   - **Solution:** Enhance `focus-visible:ring-2` with `--civic-teal` and clear offset.

---

## 3. Responsive Breakpoint Inspection Matrix

| Viewport Width | Device Category | Status & Observations | Priority Refinement |
| :--- | :--- | :--- | :--- |
| **1440 px** | Desktop Monitor | Generous whitespace, clean 4-column features and 3-column department directory. | Add hero mockup preview widget. |
| **1024 px** | Small Laptop | Grid wraps gracefully; navigation menu remains desktop-friendly. | Adjust padding inside complaint cards. |
| **768 px** | Tablet Portrait | Sidebar in dashboard becomes collapsible hamburger; stats cards 2x2. | Ensure filter pills wrap smoothly without line breaks. |
| **390 px** | Standard Mobile (iPhone/Pixel) | Stacked layouts, responsive form groups. | Optimize touch targets; prevent modal overflow. |
| **320 px** | Compact Mobile | Narrow boundary; ensure reference numbers do not overflow container. | Add `break-all` and flexible padding (`px-3`). |

---

## 4. Implementation Priorities

1. **Phase 1B.1:** Design system & typography enhancement in `src/index.css` (Urdu font stack, focus ring polish, RTL directional utility rules).
2. **Phase 1B.2:** Landing Page refinement (rich civic hero mockup, clearer 4-step process cards, interactive department badges).
3. **Phase 1B.3:** Citizen Dashboard refinement (live search input + status filter tabs, polished metric cards, responsive mobile list).
4. **Phase 1B.4:** Complaint Submission Form refinement (sectioned card layout, official Roman Urdu prompt example, word limit gauge, transparent simulation modal).
5. **Phase 1B.5:** Tracking UI refinement (clear timeline stages: Completed, Active, Upcoming; PII masking; invalid reference help).
6. **Phase 1B.6:** Login & Registration refinement (password reveal toggle, "Explore Demo" fast-track, transparent security notice).
7. **Phase 1B.7:** Bilingual translation review & automated test expansion.

---

## 5. Phase 1B Refinement Verification & Outcomes

All identified audit items have been systematically resolved, verified across desktop and mobile viewports, and backed by automated unit and integration tests:

| Issue ID | Severity | Status | Verification & Resolution Method |
| :--- | :--- | :--- | :--- |
| **HIGH-01** | High | **Resolved** | Added `.roman-urdu-text` and `.ref-code` CSS utility rules with `unicode-bidi: isolate; direction: ltr;`. Verified across Urdu RTL mode. |
| **HIGH-02** | High | **Resolved** | Enforced minimum 44px touch targets on mobile for `Button`, `Input`, `Select`, `Textarea`, `PublicHeader` mobile links, and `CitizenSidebar`. |
| **MED-01** | Medium | **Resolved** | Integrated live real-time search box into `CitizenDashboard.tsx` with instant multi-field substring matching and "Clear Filters" fallback. |
| **MED-02** | Medium | **Resolved** | Added accessible password visibility toggles (`Eye` / `EyeOff` with `aria-label`) to `LoginPage.tsx` and `RegisterPage.tsx`. |
| **MED-03** | Medium | **Resolved** | Added prominent "Explore Demo Workspace" button and explicit prototype security disclaimers indicating Supabase auth is reserved for Phase 2. |
| **MED-04** | Medium | **Resolved** | Built tangible "Live Grievance Preview" card mockup in `LandingPage.tsx` showing Roman Urdu ingestion, AI triage, and municipal routing. |
| **MED-05** | Medium | **Resolved** | Updated instructional Roman Urdu placeholder to *"Do din se bijli nahi aa rahi aur pani ki motor bhi band hai."* in `ComplaintForm.tsx`. |
| **LOW-01** | Low | **Resolved** | Configured authentic Nastaliq font stack (`Noto Nastaliq Urdu`, `Urdu Typesetting`, `Segoe UI Historic`) in `src/index.css`. |
| **LOW-02** | Low | **Resolved** | Enhanced high-contrast WCAG 2.2 AA focus rings (`--civic-teal`, `focus-visible:outline-2`) and added `prefers-reduced-motion` compliance. |

### Test Suite Evolution
- **Phase 1 Baseline:** 4 test files, 16 passing tests.
- **Phase 1B Final:** 6 test files, **21 passing tests** (added `CitizenDashboard.test.tsx` and `LoginPage.test.tsx`).
- **Build Status:** Clean production build with Vite (`0 errors`), strict TypeScript compilation (`0 errors`), and Oxlint (`0 errors`).

