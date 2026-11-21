# V13.15.3 — Mobile Motion and Monument Artwork Handoff

## Scope

Base: `b09b3e2eabe0ed2d2cbb2a3df1f28c7f0dc9a451`, branch `feature/v13-15-2-citizen-mobile-and-tracking`.

The citizen site keeps its desktop visual direction. The mobile How It Works
sequence uses compact native sticky cards instead of 135svh cards with large
empty regions. Mobile page transitions and reveal effects avoid GPU perspective
on live type, so the labels remain sharp while users scroll. Tablet and desktop
cinematic section choreography stays intact.

The account-registration promotional panel uses the same Mazar-e-Quaid image
assets as the existing footer, with a contrast overlay for the localized copy.
The form, authentication rules, complaint routing, Supabase functions and frozen
AI model artifacts are unchanged.

## Local verification

- `npx vitest run`: 618 passed, 1 skipped (58 test files).
- `python -m unittest discover -s tests/v11`: 106 passed.
- `node tests/edge/complaint-boundaries.mjs`: 16 passed.
- `npm run build`: passed TypeScript and Vite build.
- `node --check tools/ai_factory/v13_15_3_browser_qa.mjs`: passed.

## Required Antigravity browser gate before pushing

The execution environment could not start Chrome, so live rendering and smooth
touch scrolling remain **unverified**. Start the Vite server and run:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Then, in a **second** terminal:

```powershell
node tools/ai_factory/v13_15_3_browser_qa.mjs
```

The script checks each public page at 1280, 768, 390 and 320 pixels, captures
the registration image and all four mobile steps, checks overflow and the
reduced-motion fallback. Manually test scroll feel using Chrome touch emulation
or a real phone and verify Urdu layouts; a screenshot alone cannot measure
smoothness. Any failure must be investigated before the remote push.

No Supabase migration, live deployment or model promotion belongs to this phase.
