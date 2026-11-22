# V13.19 — administration and field-operations review

**Review date:** 22 November 2026 (PKT)
**Work branch:** `feature/v13-19-admin-ux-security-audit`
**Base:** `b951e2232a3d7c6ce8eecb03114ad5e8ae5909b3` (isolated V13.18 QA worktree)
**Production/main:** not modified or deployed by this work.

## Design intent

Treat Awaaz-e-Awam as a serious Karachi municipal operations system, not a marketing or AI-analytics dashboard. An operator should see the *next action*, its owner, its deadline and its evidence before decorative KPIs. Use compact editorial headings, quiet borders, one restrained teal accent, plain professional labels, deliberately grouped navigation and predictable focus states. No ornamental bouncing, infinite pulsing or oversized inspirational slogans.

Source screenshots supplied by Fahad: department dispatch, officer roster and completed cases at approximately 1920×1200. Identified issues: generic 2-line 54px slogans, four repeated statistics consuming the roster screen, 10-item undifferentiated navigation, a large empty assignment side panel, cases silently capped at 35, overlapping administrative labels and ambiguous demonstration versus live data.

## Implemented in this patch

| Area | Change | Verification |
| --- | --- | --- |
| Department dispatch | Brief “Dispatch desk” heading, relevant instruction, compact four-metric strip, meaningful assignment steps, count and show-more for cases | Build + component regression |
| Officer roster and archive | Task-specific titles; repeated dispatch statistics no longer displayed on reference-only views | Build + component regression |
| Staff sidebar | Field operations and complaint records grouped; compact 44px rows; demo-session disclosure | Build + component regression |
| Staff dark theme | Native dark field work cards, inputs, selected rows, dialogs and feedback with contrast variables | CSS reviewed; **visual browser inspection pending** |
| Central administrator | Removed nonfunctional Overview link, simplified “People & permissions”/“Model review”; moved approved staff ahead of employee invitations; invitation form collapsed | Build + admin tests |
| Model governance | Clearly distinguishes historical offline benchmark and disconnected live telemetry; no fabricated disk/runtime statistics | Targeted tests |
| Security and honesty | CSPRNG-only guest tracking and local claim codes; admin pages do not start privileged fetch before authentication; corrected inaccurate revocation/JWT copy | Targeted tests + source inspection |

The supplied screenshots depict **local demonstration data**. Counts on a local screen do not establish live Karachi case volumes, nor do offline benchmark scores establish production accuracy.

## Tests actually performed

- `npm run build` — PASS, with a pre-existing 2.9 MB chunk-size warning.
- `npm test -- --reporter=dot` — **652 passed, 1 skipped**, 64 test files passed and one skipped.
- `npm run lint` — PASS, **zero errors**; existing repository warnings remain.
- `node --test` for V13.16.2/V13.17/V13.18 atomic-work, proof and citizen-response suites — **20 passed**.
- `node tests/edge/complaint-boundaries.mjs` — **16 passed**.
- `node tools/ai_factory/v13_8_2_verify_production_bundle.mjs` — PASS; no known demonstration-auth markers in production bundle.
- `python -m unittest discover -s tests/v11 -q` — **106 passed**, executed in 83.7 seconds; generated synthetic training artifacts only in an isolated temporary directory.
- Browser visual runner `python tools/ai_factory/v13_19_portal_visual_qa.py` — **NOT RUN SUCCESSFULLY** in this sandbox: Chromium cannot open its Unix socket (`Operation not permitted`). The runner is delivered for a normal Antigravity/Windows host to complete 320/393/768/1024/1440px visual, overflow, keyboard and dark-mode checks. A cloud browser could not connect to the container-only localhost port. **Do not mark browser QA complete from the static tests.**

## 20 pen-test categories from the supplied video — honest scope matrix

These are categories to assess on authorized staging, **not 20 demonstrated vulnerabilities**. Safe local and static checks are distinguished from genuinely untested network attacks. Do not flood hosted endpoints or brute-force real users.

| # | Category | Local evidence or applicability | Next authorized verification |
| --- | --- | --- | --- |
| 1 | HTTP/2 rapid reset | Hosting/gateway transport risk, not exercised by unit tests | Ask hosting provider for HTTP/2 abuse protections; controlled infrastructure review only |
| 2 | Long/52-char username | Login, invite name and email validation exist; no adversarial 52-char browser test yet | Fuzz allowed lengths, Unicode and error copy on local and disposable staging accounts |
| 3 | SAML bypass | No custom SAML login flow identified in app | Confirm SAML disabled in Auth configuration; otherwise audit IdP assertions separately |
| 4 | No-auth email spoof | Guest intake intentionally accepts user-supplied contact information; it is not verified identity | Ensure unverified email never grants ownership, claim, staff or notification authority |
| 5 | GraphQL aliases | UI primarily uses Supabase REST/RPC; optional GraphQL exposure not established | Confirm GraphQL endpoint status and cost/complexity limits on staging |
| 6 | 2FA code replay | Admin/staff TOTP requirements implemented at policy/RPC level; no authenticated AAL2 replay test | Use approved test identities to attempt re-use, expiry and role-revocation replay |
| 7 | ReDoS regex | Intake request body limited to 16 KiB; complaint length capped at 200 words; dynamic expressions inspected | Bound-time benign/adversarial corpus run against privacy and routing regexes |
| 8 | JWT algorithm confusion | Supabase Auth validates tokens; no custom JWT verifier found in reviewed paths | Staging forged/expired/wrong-audience token negative cases, with no real secrets logged |
| 9 | Request smuggling | Gateway/CDN class, not addressed by React | Infrastructure configuration review and provider-sanctioned scanner |
| 10 | Cache poisoning | Private endpoints require correct cache controls | Inspect actual staging CDN and API cache headers, never cache private responses |
| 11 | Spoofed IP header | No authorization should depend on caller-provided forwarded IP | Send bounded spoofed headers against local endpoints and verify no privilege change |
| 12 | Views bypass RLS | `department_complaints_view` migration sets `security_invoker=true` and `security_barrier=true`; earlier staging check confirmed settings | Prove cross-department denial with real JWTs from two test departments; audit other views |
| 13 | `Math.random()` tokens | **Fixed** guest tracking and local claim codes to use `crypto.getRandomValues` only, fail-closed; edge intake already uses crypto | Rerun new random/entropy tests and staging claim/track flow |
| 14 | Timing attack | No password/token comparison timing assessment performed | Profile bounded authentication/claim failures on disposable staging; use provider controls |
| 15 | Padding oracle | No custom block-cipher decrypt API identified in reviewed flow | Confirm no downstream proxy/plugin provides custom padded encryption or errors |
| 16 | Prototype pollution | Local adapter has `Object.assign` only inside an admin-gated simulation; no external exploit proven | Audit all JSON-to-object merges; test `__proto__`, `constructor`, `prototype` inputs locally |
| 17 | Template injection | React text interpolation is escaped by default; notification rendering has explicit escaping tests | Inspect any HTML/email templates and rich-text render paths for unsafe insertion |
| 18 | XXE file read | No XML file upload or custom XML parser identified | Confirm all accepted upload formats are bounded raster images and sniffed by server |
| 19 | WebSocket hijack | No custom privileged WebSocket command handler identified | If using Supabase Realtime, verify authenticated channel policies, origins and token expiry |
| 20 | Unicode spoofing | Roman Urdu/citizen names and locations contain Unicode; homograph and normalization tests pending | Test NFKC/NFC, zero-width controls, mixed scripts, confusables and duplicate identifiers |

**Security status:** local regression gates pass; **a production pen-test or complete hosted security certification is NOT claimed**. The key remaining release gate is signed staging integration: real admin/head/officer/citizen test accounts with approved inboxes, TOTP, negative membership isolation, RLS/SECURITY DEFINER audit, private-photo proof and citizen response. Current staging has no real test identities; never substitute local demo login or a service role key to simulate those negative tests. Review 31 authenticated SECURITY DEFINER routines individually for explicit identity, membership and context checks rather than treating their mere existence as proof of an exploit.

## Release / acceptance checklist

- [x] Work isolated on feature branch, V13.18/main/production preserved.
- [x] Desktop screenshot problem areas addressed in code; no invented live metrics.
- [x] Build, Vitest, lint, edge boundary and bundle checks passed.
- [ ] Run visual runner on a normal Chrome/Antigravity host and inspect each screenshot; fix any overflow and contrast issues.
- [ ] Manually navigate all central admin and department head/officer routes, select cases, verify empty/error/loading states and modal keyboard exit.
- [ ] Verify responsive reduced motion and proper focus targets at 320–1440px.
- [ ] Run authorized staging signed JWT/AAL2/RLS, access-revocation and evidence lifecycle tests after test accounts are approved.
- [ ] Infrastructure-level pen-test categories: gateway/proxy, cache, IP headers, GraphQL exposure and WebSocket if enabled.
- [ ] Human review and release approval before any PR merge, schema mutation or production deployment.

## Commands

```powershell
npm ci
npm run build
npm test -- --reporter=dot
npm run lint
python -m unittest discover -s tests/v11 -q
node --test tests/edge/v13_18_work_orders_security_gate.mjs tests/edge/v13_18_citizen_review_security_gate.mjs tests/edge/v13_17_geo_evidence_security_gate.mjs tests/edge/v13_16_2_atomic_batch_gate.mjs
node tests/edge/complaint-boundaries.mjs
node tools/ai_factory/v13_8_2_verify_production_bundle.mjs
```

For visual QA, run `npm run dev -- --host 127.0.0.1 --port 5173` then `python tools/ai_factory/v13_19_portal_visual_qa.py` on a host with Python Playwright, its browser and Chromium installed; adjust `executable_path` if necessary. Screenshots live under `docs/qa/v13_19/` and must be reviewed without any real user credentials or citizen evidence.
