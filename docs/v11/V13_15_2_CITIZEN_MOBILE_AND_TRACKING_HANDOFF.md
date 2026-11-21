# V13.15.2 — Citizen tracking, registration and mobile design handoff

Base: `8d2a74b20e7411e67e61e62485ffdb500073c67a` (V13.15.1).  This is an isolated citizen-facing patch; no migrations, Edge Function changes, model retraining, database writes, or production deployments are included.

## Behavior changed

- The public `/track` route accepts only the private 24-digit receipt number. The old claim-to-account tab is removed, as is the unusable claim-code modal on the citizen dashboard. Historical server-side claim functionality remains intact for old data.
- Tracker results show one **recorded** status and a short next action. `assigned` and `accepted` do **not** imply work has started; `in_progress`, `partly_resolved`, `resolved`, and `rejected` are distinct. Department names appear only when the record and issue indicate confirmed routing. Real updates are collapsed into an optional disclosure. No fabricated progress stages.
- The submission receipt uses the single guest tracking secret (and no additional code for guests). If routing is pending or unconfirmed, the receipt shows a neutral **relevant department** message, not an unverified department name. The optional registration link does not imply an account is needed to track.
- Registration uses minimum eight characters plus uppercase, number, and special character; both form controls and client submit validation agree. The giant empty illustration is replaced by a compact service-information panel. Mobile inputs are at least 16px to avoid platform zoom.
- The mobile *How It Works* journey presents four full-viewport overlapping sticky sheets. On reduced-motion devices they become ordinary accessible document-flow cards. The desktop journey remains unchanged. The mobile homepage hero and write transition use safe viewport units.
- The department inbox already distinguishes assigned/accepted/in-progress statuses truthfully, so no department-side state behavior was changed.

## Verification performed here

- `npm run build`: PASS (TypeScript 0 errors, Vite bundle successful; existing large-chunk advisory remains).
- `npx vitest run`: 618 PASS, 1 skipped, 0 failures across 58 test files.
- `python -m unittest discover -s tests/v11`: 106 PASS; no model weights changed.
- `node tests/edge/complaint-boundaries.mjs`: 16 PASS.
- Focused tracking, mobile journey, and registration unit tests: PASS.
- Browser visual QA: **NOT VERIFIED on this execution host.** Chromium failed to create its process socket (`Operation not permitted`). The reproducible read-only screenshot/overflow script is `tools/ai_factory/v13_15_2_browser_qa.mjs` and must run in Antigravity on Windows with a Vite server. It checks `/`, `/track`, and `/register` at 1280, 768, 390 and 320 pixels and the mobile pinned stages, and writes temporary PNGs. Human review is required for scroll pin/overlap and modal appearance.

## Release acceptance for Antigravity

1. In a **clean isolated worktree** created from the base SHA, apply the one-commit patch using `git am`.
2. Run `npm ci`, `npx tsc -b`, `npx vitest run`, `npm run build`, `python -m unittest discover -s tests/v11`, and `node tests/edge/complaint-boundaries.mjs`.
3. Start a local Vite server on an **available port**, then set `AWAAZ_QA_URL` accordingly and run `node tools/ai_factory/v13_15_2_browser_qa.mjs`. Check screenshots at 1280/768/390/320 and real manual phone emulation. Verify scroll forward/back, keyboard focus, Urdu RTL, reduced motion, modal receipt, long department names and 24-digit wrapping. Do **not** submit real complaints during visual QA.
4. If tests, screenshots or security checks fail, fix them on the new feature branch and document the failures honestly; do not promote or deploy. Avoid exposing real phone, password, tracking secret or live auth credentials in screenshots/commit history.
5. Push the **new feature branch only** to the existing GitHub repository. Never merge to `main`, run migrations or deploy without explicit separate approval.

## Known boundaries

The signup policy is validated in the app; a hosted Supabase password policy can impose additional constraints and must be confirmed separately. If live registration shows “not configured,” this patch does not invent Supabase credentials. The guest tracking token must remain non-enumerable and private; server-side privacy and rate-limiting still require staging verification before launch.
