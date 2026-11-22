# Antigravity implementation handoff — Awaaz-e-Awam V13.19

**Paste this into Antigravity after you have the patch, source ZIP and original screenshots.**

You are the senior product designer, UX engineer, TypeScript maintainer and security test lead for Awaaz-e-Awam, a Karachi municipal complaint routing and verified field-work system. Work professionally, preserve functional workflows and report results with evidence. Read `docs/V13_19_PORTAL_UX_AND_SECURITY_REVIEW.md` and `docs/V13_18_VERIFIED_FIELD_OPERATIONS.md` fully before acting. Treat V13.19 as the current implementation baseline, not a speculative redesign from scratch.

## First: protect the project

1. Inspect `git status --short`, `git branch -vv`, `git remote -v`, `git log -1 --oneline`, `git worktree list`. Preserve all dirty files and existing local worktrees, particularly `D:\RomanUrdu_V13_18_Field`. Never reset, force-push, overwrite local changes, switch production/main, or deploy without permission.
2. Use an **isolated V13.19 feature branch or worktree** based on the approved V13.18 staging QA source. The provided V13.19 patch is the authoritative set of implemented changes. If the branch already includes it, **do not apply twice**. Otherwise dry-run the patch on the matching V13.18 code with `git apply --check` and only then apply. If it rejects, inspect the relevant files and request direction; do not blindly force conflicts.
3. Keep frozen ML Run004 and Run006 artifacts untouched. Do not invent accuracy, live monitoring data, staging results, or security guarantees. No paid dependencies. Do not modify production Supabase project `akbwiedtmxjxcjscgitw` or merge into `main`.

## Design skills — load and use before touching UI

The user supplied **three URLs, but two are exactly the same `charles-unslop` URL**. They therefore represent **two distinct skills**, not three repositories. Do not pretend an additional third skill has been installed. The separate earlier link was also `charles-unslop`. Ask Fahad for a third distinct link if he wants one.

Install the two real skills into the project for Antigravity, if not already present:

```powershell
npx skills add LemonFace0309/charles-skills --skill charles-unslop -a antigravity -y
npx skills add LemonFace0309/charles-skills --skill charles-ux-animation -a antigravity -y
Test-Path .\.agents\skills\charles-unslop\SKILL.md
Test-Path .\.agents\skills\charles-ux-animation\SKILL.md
```

Read **both full `SKILL.md` files**. Use `charles-unslop` for a screenshot-based audit, subtraction, hierarchy, density, precise spacing, quiet colors, typography, relevant copy and one restrained signature; use `charles-ux-animation` to avoid needless motion (roughly 100–150ms hover/press, 150–250ms menus, 200–300ms dialogs), support `prefers-reduced-motion`, protect touch/keyboard access. Do not add elaborate entrances to frequently used tables or case rows.

## Design direction

Think **municipal operations console / editorial control room**, not generic SaaS/AI dashboard. Use the three user screenshots (dispatch, officer roster, completed-case record) as the before reference. Favor crisp type hierarchy, a functional 44px+ sidebar, quiet borders, compact context-specific headings and real status details over tall statistic tiles. White/charcoal/municipal teal is the existing identity; improve its consistency without replacing the civic branding or breaking the citizen portal.

Already implemented in V13.19 source:

- Compact `Dispatch desk`, `Officer roster`, `Proof verification` and archive headings; only dispatch/field display the four KPIs.
- Grouped navigation with field operations and complaint records.
- Dispatch case count, search, expandable list, accessible row selection, specific no-results state and clear three-step assignment brief.
- Full field-work dark-mode overrides, visible keyboard focus, minimum-size modal dismiss control.
- Central admin simplified tabs (`Department Requests`, `People & permissions`, `Model review`); removed dead overview, prioritized authorized identities, collapsed employee invitation setup.
- Model telemetry identifies disconnected services and historical offline scorecards honestly, rather than fabricating active storage/runtime.
- Guest tracking and local claim codes use secure randomness and fail closed; admin requests wait for authentication; corrected misleading revocation text.

## Remaining work **you must complete visibly on your host**

1. Run `npm ci`, `npm run build`, `npm test -- --reporter=dot`, `npm run lint` and the edge/Python/security boundary commands in the review document. Existing V13.19 local run: build PASS, 652 Vitest passed, 1 skipped; 20 edge work/evidence PASS; 16 intake PASS; bundle audit PASS. Reconfirm, don't copy claims without running.
2. Run local dev mode (`npm run dev -- --host 127.0.0.1 --port 5173`) with **no live Supabase credentials** and execute `python tools/ai_factory/v13_19_portal_visual_qa.py` from a normal host with Chromium/Playwright available. If Python Playwright is absent, install *only in the isolated dev tool environment*, or use Antigravity's existing browser QA. Do not screenshot local passwords or live citizen/private proof data.
3. Inspect `/department?view=dispatch`, `team`, `verification`, `field_archive`, `/department?view=queue`, `/admin/requests`, `/admin/access`, `/admin/ai` at 320, 393, 768, 1024, 1440 widths. Cover **both local head and officer**, light/dark and reduced-motion. Fix real issues found and preserve all functional controls. Verify no horizontal overflow, clipped controls, unreadable contrast, repeated stat bands, dead links or fake-data claims. Test keyboard focus, Escape dismiss, disabled/action/loading/empty/error states and mobile navigation.
4. Test department workflow with disposable local data: select a real demo case → assign officer/deadline → officer work → proof submission → head review → archived verified work. Do not mark an assignment complete without verifying the service response. If local browser cannot simulate photo/GPS, note it as blocked rather than faking success.
5. Run the 20-category **scoped security checklist** in `docs/V13_19_PORTAL_UX_AND_SECURITY_REVIEW.md`. Unit/source checks alone do not constitute network pen-testing. Only use non-destructive bounded tests on a disposable **authorized staging** project. Avoid HTTP/2 floods, cache smuggling probes or unbounded load without infrastructure permission. Hostile-test categories like HTTP/2, gateway smuggling, JWT/TOTP replay, live RLS, XXE, IP spoofing, Unicode and GraphQL must have explicit PASS/FAIL/NOT TESTED findings, no blanket green checkmarks.
6. For signed staging E2E, request **four approved test inboxes** (central admin, department head, officer, citizen) and specific authorization; configure unique invited identities/TOTP without exposing service-role keys or one-time codes. Test cross-department RLS isolation, SECURITY DEFINER auth checks, private proof/photo access, 72-hour citizen response and revocation. Staging currently has zero real approved identities. Production remains completely out of scope until written approval.
7. Capture screenshots of before/after (from the supplied images and your local browser) plus exact remaining issues. If all gates pass, create an isolated review commit, a portable unified `.patch`, changed-files ZIP and clear handoff. No silent production change or automatic PR merge.

## Acceptance criteria

- A department head understands today's unassigned/late/review work in under 10 seconds without reading decorative slogans.
- An officer can immediately find their assignments and evidence actions; no higher-privilege menu items.
- Roster and archived work show relevant records first and don't repeat dispatch KPIs.
- Central admin can see access records first, then deliberately expand invitations. Real member/MFA checks stay server-side.
- All screens look polished at desktop and mobile, including a consistent dark theme; empty/error states explain the next action; actual live data never substituted with plausible fake values.
- No regression in staff permissions, privacy, citizen review, proof requirements or frozen ML benchmark artifacts.
- Final report separates **implemented**, **tested**, **blocked**, **not applicable**, and **remaining release-gate** items. Provide exact patch, files and commands.
