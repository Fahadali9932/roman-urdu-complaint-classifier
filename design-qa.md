# Design QA — V13.15.3

## Source evidence

- User screenshot: mobile How It Works heading and huge blank first card.
- User screenshot: desktop registration with flat burgundy promotional card.
- Reference: existing `mazar-e-quaid-monochrome.jpg` and
  `mazar-e-quaid-mobile.jpg` used by the site footer.

## Changes to verify

- Mobile four-step cards: no giant empty area; heading and short description
  remain visible at 320 and 390 widths; native sticky sheet transitions do not
  jump, trap scrolling, or cause side-to-side movement.
- Register: original Mazar-e-Quaid photo renders behind readable copy on desktop
  and mobile, with correct crop and no competing red illustration panel.
- All citizen routes: no horizontal overflow, white screens, clipped navigation
  or fuzzy perspective-transformed text at 320/390/768/1280 widths.
- Reduced motion: static readable flow without forced sticky staging.

## Evidence status

- Source screenshots supplied by user: yes.
- Code and unit tests: passed; see project handoff document.
- Headless browser screenshots from this workspace: **not available**. Local
  Vite started, but Chrome could not launch in the sandbox and the cloud browser
  could not reach the local service.
- Antigravity real-browser QA: **required**. Run
  `node tools/ai_factory/v13_15_3_browser_qa.mjs` against Vite; inspect output
  screenshots and mobile touch-scroll movement before GitHub push.

**Final result: blocked — browser rendering and mobile motion not yet verified.**
