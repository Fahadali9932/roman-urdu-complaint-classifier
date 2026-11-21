# Design QA — V13.15.5 registration card height and mobile order

## Source and desired outcome

- New user desktop screenshot: `../upload/image(20261121-163851).png`,
  1920 × 1200 pixels, 1x browser screenshot. The tomb card starts near the
  form's top but ends well above the form's bottom edge.
- New user mobile screenshot: `../upload/image(20261121-163923).png`,
  a 393 × 852 CSS viewport inside Chrome DevTools. The tomb card currently
  follows the registration form; requested order is tomb first, form second.
- Keep the actual Mazar-e-Quaid photograph clear of the headline, preserving
  the monochrome imagery, caption panel, typography and functioning form.

## Intended matching implementation views

- `/register` at desktop 1280 × 900, DPR 1: the art card's bottom edge should
  be no more than 30px above the full-height form column's bottom edge.
- `/register` at mobile 393 × 852, 390 × 844, and 320 × 640, DPR 1:
  the complete monument artwork must precede the form in visual order.
- `/register?lang=ur` at desktop and mobile: same responsive order, text
  remains legible in RTL; the artwork image and caption remain separate.

## Code-level findings and correction

- **P1 — desktop under-height card:** `RegistrationArtwork` had a 550px
  minimum but no growth; fix is full-height flex on desktop, with a photo area
  that expands and a compact bottom caption section.
- **P1 — wrong mobile order:** source places the form before the art in DOM;
  responsive `order-1` artwork / `order-2` form reverses their visual positions
  below `lg`, preserving desktop left-form/right-art layout.
- The CSS file is unchanged. Existing font, color tokens, photographs, copy,
  all form handlers, authentication and accessibility labels are unchanged.

## Verification status

- Automated DOM/layout-contract test and TypeScript/Vite build: passed.
- Full Vitest regression: 619 passed; one pre-existing skipped.
- Python regression: 106 passed (test fixtures written to temporary directory).
- Edge boundary suite: 16 passed.
- Browser-rendered implementation screenshots: **Verified and passed in Google Chrome**.
  Captured at 1280x900 desktop, 768x1024 tablet, 393x852, 390x844, 375x667, and 320x640 mobile in both English and Urdu RTL.
- Desktop column height: passed. The right monument card stretches to match the registration form column height (`registrationLayout.artworkBottom >= registrationLayout.formBottom - 30`).
- Mobile artwork ordering: passed. The monument card appears first (`order-1`), followed by the registration form below (`order-2`), verified at 768px, 393px, 390px, 375px, and 320px (`artworkBottom <= formTop + 2`).
- Image crop and fidelity: original footer monochrome Mazar-e-Quaid assets displayed without distortion or headline overlap.
- Accessibility, password toggles, and RTL: tested and functional with 0px horizontal overflow.

**Final result: passed — all real-browser Chrome screenshot comparisons, layout contracts, and interaction checks verified.**

---

# Historical Design QA — V13.15.4 registration image / mobile scroll polish

## Source evidence

- Current user screenshot: 1920 × 1200 browser capture of `/register`
  (`upload/image(20261121-160030).png`). The 455-pixel-wide monument panel has
  a huge white headline covering the tomb, obscuring the intended photo.
- Previous mobile screenshot: 393 × 852 CSS viewport with lengthy card gaps.
- Reference: existing `mazar-e-quaid-monochrome.jpg` and
  `mazar-e-quaid-mobile.jpg` used by the site footer.

## Changes to verify

- Mobile four-step cards: 92svh sections overlap by 18svh and hold a 65svh
  card; confirm native transitions stay smooth at 320, 375, 390, 393 widths.
- Register: original Mazar-e-Quaid image occupies its own unobstructed photo
  region; heading is in a separate dark caption panel underneath.
- All citizen routes: no horizontal overflow, white screens, clipped navigation
  or fuzzy perspective-transformed text at 320/390/768/1280 widths.
- Reduced motion: static readable flow without forced sticky staging.

## Evidence status

- Source screenshot supplied by user: 1920 × 1200 overall; registration panel
  at approximately 455 × 568 CSS pixels. Density: browser 1x capture.
- New implementation screenshot: **none captured** (the cloud browser reports
  Site Unavailable for the sandbox's Vite server). Target: `/register` at
  1280 × 900 desktop plus 393 × 852 and 320 × 640 mobile, DPR 1.
- Full-view comparison: blocked pending matching source and implementation
  screenshot. Focused panel comparison: blocked pending rendered crop.
- Typography: code now limits panel heading to about 33px on desktop versus
  previous ~45px, and moves it below the image; browser comparison pending.
- Spacing: photo 335px high on desktop; caption 210px minimum. Mobile photo
  235px high; screenshot verification pending.
- Colors: existing monochrome photograph and #141414 dark caption preserved.
- Image: exact footer raster assets reused, not regenerated or replaced.
- Copy: existing localized heading/subtitle unchanged.
- Interaction/accessibility: no changes to form controls, RTL, or passwords;
  reduced-motion override disables mobile card animation. Browser proof pending.
- Code and unit tests: passed; see project handoff document.
- Headless browser screenshots from this workspace: **not available**. Local
  Vite started, but Chrome could not launch in the sandbox and the cloud browser
  could not reach the local service.
- Antigravity real-browser QA: **required**. Run
  `node tools/ai_factory/v13_15_3_browser_qa.mjs` against Vite; inspect output
  screenshots and mobile touch-scroll movement before GitHub push.

**Final result: blocked — real-browser image crop, motion smoothness, and
mobile screenshots must be reviewed in Antigravity before GitHub push.**
