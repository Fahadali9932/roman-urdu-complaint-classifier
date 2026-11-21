# V13.15.4 — Monument Photo Composition & Mobile Scroll Finish

Base commit: `77e1174f09e75eae7c1283a33936dd9fea69c53b`
on `feature/v13-15-3-mobile-motion-and-mazar-artwork`.

## Changes

- Registration: the exact footer Mazar-e-Quaid photograph is now a clean
  separate upper panel. The localized heading and short description sit in an
  ink-dark caption below it, never across the tomb. No duplicate benefit list
  or placeholder image is introduced.
- Mobile How It Works: stages shorten to 92svh with 18svh overlap, 65svh card
  height. A short native CSS view-timeline entry only adjusts opacity and 16px
  of vertical offset where supported. No forced snap, scale, 3D text motion,
  interception of touch scroll, or scroll-event layout calculations on phones.
- Global mobile route transitions: soften the 8px entry to 380ms with crisp
  text, while desktop choreography remains unchanged.
- Passive mobile performance: avoid both desktop journey scroll-loop listeners
  and stacked-panel layout sampling on screens below 768px.
- Browser QA script: now asserts the registration caption cannot overlap the
  photograph and mobile stage spacing is bounded.

## Scope restrictions

This is a frontend-only polish patch. No changes to backend, authentication,
registration validation, Supabase, classification, frozen model data,
department routing or database. Do not push/merge/deploy until real browser QA
with touch scroll emulation on Windows passes.

## Verification and handoff

- Run `npx tsc -b`, `npm run build`, `npx vitest run`,
  `python -m unittest discover -s tests/v11`, and
  `node tests/edge/complaint-boundaries.mjs`.
- Start Vite on a genuinely free port (prefer strict 5173); run
  `node tools/ai_factory/v13_15_3_browser_qa.mjs` from another terminal.
- Review English and Urdu at widths 1280, 768, 393, 390, 375, 320. Test
  slow and fast finger swipes in the full home journey and between pages,
  reduced motion, and any layout clipping. The script checks structure;
  a human must judge scroll feel.
- Preserve original Windows worktrees; push only a new feature branch in the
  existing `Fahadali9932/roman-urdu-complaint-classifier` repository.
- QA outcome for this packaging environment: **blocked on browser access**;
  see root `design-qa.md` for exact remaining evidence.
