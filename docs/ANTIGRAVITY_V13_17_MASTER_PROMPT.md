# Antigravity master prompt — Awaaz-e-Awam V13.17

You are integrating a verified code patch into the GitHub repository
`https://github.com/Fahadali9932/roman-urdu-complaint-classifier.git`.

**Goal:** Finish one coherent, professional citizen and department upgrade:
keep the established citizen design, route solved department cases into a
searchable Completed cases archive, allow optional complaint issue photos and
confirmed GPS/manual pins, give authorized staff access to original evidence,
and present an anonymized, filterable Karachi issue-density map. Do not impose
a generic dashboard template, invent complaints, or change the frozen Run004
or Run006 classification models.

## Stage 1 — Protect existing changes and verify base

- Run `git remote -v`, `git status --short`, `git worktree list`, `git rev-parse HEAD`.
- Preserve all uncommitted, untracked and ignored user files. No reset, clean,
  force push, automatic merge or destructive changes.
- Use a fresh worktree from `36108ade5be41ffd94afe151db3112c750d8a979`.
- Apply the supplied `Awaaz_e_Awam_V13_17_Evidence_Geo_Archive_Map.patch`
  using `git am`, exactly once. Stop and report conflicts rather than guessing.

## Stage 2 — Check existing workflow and visual quality

- Check `/department?view=queue`, `?view=archive`, `?view=areas`, priority,
  review, case overview and detailed complaint; verify the sidebar active item,
  completed-case isolation, original case links and permission boundaries.
- Check `/submit` (steps 1–3), `/track` and `/karachi-map` on desktop,
  tablet and real mobile viewports; confirm touch interaction, no overflow,
  appropriate field labels and crisp type. Keep existing brand typography and
  motion, and use a clean civic-tool aesthetic rather than AI-looking cards.
- Work through no-permission GPS, manually placed incident pin, photo too
  large, failed upload then retry, and receipt tracking. Never automatically
  request location and never put a tracking secret in a URL.

## Stage 3 — Test and secure

- Run all commands in `docs/V13_17_GEO_EVIDENCE_ARCHIVE_HANDOFF.md`.
- Review migration `20261202000000_v13_17_private_issue_evidence_and_public_map.sql`
  and the `upload-complaint-photo` Edge function: per-department private RLS,
  validated anonymous 24-digit proof, owner auth, bucket privacy and map
  aggregate threshold. No direct public SELECT on exact pins, pictures,
  contact details or guest credential hashes.
- Conduct real five-account staging JWT/RLS tests before approval. Use only
  disposable *staging* accounts with authorized credentials, not demonstration
  keys; no bypass or fabricated passing report.
- Confirm public map can be empty legitimately if fewer than eight geolocated
  reports exist per coarse cell. Do not seed simulated incidents into production.
- Keep default OSM tiles usage modest and proper attribution visible. No paid
  geocoding or external services that need billing without explicit approval.

## Stage 4 — Staging rollout only when authorized

- Compare remote staging migration history before applying changes. Database
  deployment is a separate action from source commit.
- When migration history is clean and staging authorization exists: apply the
  migration to the dedicated staging project, deploy **both** updated
  `submit-classified-complaint` and new `upload-complaint-photo` Edge functions,
  then run browser and multi-account integration tests.
- Never touch production project, merge to main, or publish publicly without
  explicit user sign-off.

## Stage 5 — Delivery

- Commit only final tested changes to isolated feature branch. Preserve
  original worktrees and branches.
- Push to the exact `Fahadali9932/roman-urdu-complaint-classifier` remote when
  existing authentication allows it. If it is blocked, provide PowerShell
  `git push -u origin feature/v13-17-evidence-geo-archive-map`, not a claim of
  successful delivery.
- Provide a final outcome table: implemented pages, tested counts, actual
  browser/staging checks, pending gates, commit SHA, PR link, and patch path.
- If a release gate is blocked, explicitly separate **code complete** from
  **hosted staging verified** and **production ready**.
