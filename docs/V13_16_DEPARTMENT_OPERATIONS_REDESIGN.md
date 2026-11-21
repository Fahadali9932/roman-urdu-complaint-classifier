# Awaaz-e-Awam — V13.16 Department Operations Redesign

## One-page delivery summary

**Scope:** Department staff portal only: Overview, Work Queue, Case Detail, Areas, Priority and KMC Review Queue. Citizen pages, main administrator portal, model weights and production database are outside scope.

**Design direction:** A practical municipal operations desk: deep evergreen navigation, sharp type, clear action states, generous but controlled spacing, low-contrast backgrounds, readable case lists and no decorative 3D scroll effects in transactional staff workflows. Based on established government interface patterns for tables, status tags, task lists and alerts (GOV.UK Design System and U.S. Web Design System).

### Delivered

1. **Unified operations design:** Department-only V13.16 stylesheet creates a consistent navigation frame, typography, status hierarchy, accessible focus indicators, stronger contrast, and responsive rules. Preserves the citizen portal and existing department login art.
2. **Overview:** Removes repeated stage totals from the duplicate metric strip; prioritizes a single first-response action, case stage distribution, three distinct totals, and next cases/localities. Adds refresh and visible failure/retry states.
3. **Work queue:** Search input debounced to avoid excess requests, localities derived from actual records, stale responses ignored, errors distinguished from empty results, and a Retry button. Existing filters, saved views, pagination, case/report modes and case open actions preserved.
4. **Area coverage:** Localities now derive from data rather than a seven-area hardcoded list. Added search, volume/age/name sorting, empty search state, and failure/retry handling.
5. **Priority:** Replaces huge repetitive cards with compact, scannable escalation rows showing severity, reason, timestamp, location, reference, and an action; adds search and oldest-first ordering.
6. **Case detail:** Adds reload, explicit load/report error states, retry controls, accessible report-row buttons, and an inline operation failure message instead of a browser `alert()`.
7. **KMC review:** An unsuccessful load no longer looks like an empty review queue. Displays a failure explanation and retry action.
8. **Truthful live-data boundary:** Synthetic case records are loaded only in development/test, never in the production bundle. Local demo screens are labeled. A production connection failure now surfaces as an error rather than a false zero-case success state.
9. **Acceptance workflow:** Staff status RPC responses are awaited before local success is shown; removed fire-and-forget updates and unverified direct-table fallbacks. The current individual-report RPC remains *non-transactional* across multiple reports; see release gate below.
10. **Regression tests:** Added tests for queue failure/retry, locality search-to-queue, and Overview sample-state labeling.

### Verification performed

- TypeScript and Vite production build: **PASS**.
- New focused Vitest suite: **3/3 PASS**.
- Full Vitest suite: **627 passed, 1 skipped** across 60 files.
- Edge complaint boundary suite: **16/16 passed**.
- Production bundle sanitization: **PASS** (no demo fixture or auth-bypass markers).
- Native and cloud browser visual QA: **NOT VERIFIED**. The local Chromium process was blocked by OS socket restrictions; the remote browser could not connect to the local Vite server. Desktop/mobile responsive CSS was implemented but must be checked by Antigravity/browser on real viewport sizes before release.

### Production safety and limitations

- No production or staging database schema was changed; no migrations deployed.
- All frozen AI models and weights are preserved. No retraining was run.
- No demo credentials or service-role secret added to the frontend.
- Staff auth and true role enforcement must be validated with real staging accounts and RLS. A client session object alone is not proof of authorization.
- Case grouping and multi-report acceptance are not yet a server-owned, atomic case system. The existing client aggregator is a bridge to real complaint rows; do not describe its grouping or batch update as an audited production transaction.
- Successful RPC behavior, cross-department access, assignment permissions, and citizen timeline updates still require real staging JWT-based end-to-end testing.
- Onboarding and other portals were intentionally preserved to avoid unintended changes.

### Final release checklist for Antigravity

1. Apply patch on the exact base commit in a separate worktree; preserve existing dirty Windows files.
2. Run `npm ci`, `npm run build`, `npx vitest run`, and the existing Edge boundary suite.
3. Launch `npm run dev`, inspect Overview, Work Queue, Case Detail, Areas, Priority and Review Queue at 1440, 1024, 768, 393 and 320 CSS pixels. Verify no sideways scrolling, overlapped badges, hidden actions, clipped case titles, or broken modal focus.
4. Verify `aria-current`, keyboard navigation and search/filter/retry with keyboard only. Test reduced-motion preference and dark mode.
5. Sign in with disposable genuine KMC and second-department staging accounts; verify cross-department isolation, staff revocation and actual write permissions. Test one failed RPC and a partial multi-report acceptance scenario on staging data only.
6. Do **not** promote to public production, merge into `main` or alter production SQL without a separate explicit review and verified server-side atomic-case workflow.

**Decision:** Frontend implementation ready for Antigravity staging review. Public-launch verification remains blocked by missing real-browser and live multi-account/atomic-operation evidence.
