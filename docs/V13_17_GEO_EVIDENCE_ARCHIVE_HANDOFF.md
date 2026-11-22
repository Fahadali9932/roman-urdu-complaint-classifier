# Awaaz-e-Awam V13.17 — evidence, map and completed-case records

## Delivered in this code patch

- Department workspace: **Completed cases** navigation and searchable, read-only historical view. Resolved cases stop crowding active work, but their records remain accessible; no records are deleted.
- Department work queue: actual issue categories supplied by the data source; fixed selected-area filter reverting after user interaction; “My cases” no longer pretends unassigned work belongs to the current employee. Current workload badge no longer fabricates counts.
- Department safety: password changes cannot falsely succeed while disconnected; failed priority changes do not silently masquerade as saved changes.
- Citizen complaint: optional confirmed incident pin with manual map selection or opt-in device geolocation. GPS is never activated automatically. It is separate from the citizen's residential address and never saved in local drafts.
- Citizen complaint: one optional JPEG/PNG/WebP issue photograph (at most 1 MiB), uploaded **only after** the main complaint has been accepted and the tracking receipt generated. Upload failure never invalidates the complaint; an in-receipt retry does not resubmit the complaint.
- Secure backend: add-on `complaint_geo_points` and `complaint_evidence` records, staff-authorized RLS, private storage bucket, 24-digit tracking-number hash or signed-in owner proof required to upload.
- Department complaint detail: view verified incident coordinates and a time-limited private signed image link, subject to authenticated department permissions.
- Citizen `/karachi-map`: responsive OpenStreetMap map showing dynamic, **coarse geographic counts only**, filtered by service and time. Cells require at least 8 confirmed, geolocated active reports; no individual markers, citizen identities, tracking tokens or exact complaint coordinates are public.
- Tracking page: link to the public Karachi issue map. No classifier model, weights, frozen artifacts or report content reclassification changed.

## Operational safety and known limits

1. **Not live yet.** This branch includes a SQL migration and a new Edge function. Applying a patch alone updates the website, **not** the hosted Supabase schema or Edge functions.
2. Never deploy the new frontend first against the old schema without expecting disabled map/evidence features. Deploy the staging migration first, then `submit-classified-complaint` and `upload-complaint-photo` Edge functions, then frontend; perform end-to-end tests before production.
3. The 8-report threshold and ~10 km coarse grid intentionally hide low-volume or individual reports. Older reports without a user-confirmed pin do not appear. Empty map is correct, not seed data.
4. GPS relies on browser permissions, HTTPS or `localhost`, and accurate citizen confirmation. Manual map placement remains available if permission is denied.
5. Photos are private, size- and signature-validated and held in a restricted bucket. Users should still avoid identifying people and documents. Large images must be compressed externally before attaching.
6. Exact incident coordinates, photo metadata and image download authorizations are subject to authenticated RLS; no live cross-department or 5-account staging JWT/RLS tests have been executed in this coding environment.
7. Remote database migrations and production deployment are **not** performed by this patch; apply to the dedicated staging project after reviewing migration history and permissions.
8. Public OpenStreetMap tiles require attribution and compliance with the tile usage policy; this implementation makes visible on-demand requests only. Monitor tile traffic before a high-volume public launch.

## Local quality gates

Run from the new feature-branch root:

```powershell
npm ci
npm run build
npx vitest run
node tests/edge/complaint-boundaries.mjs
node --test tests/edge/v13_16_2_atomic_batch_gate.mjs
node --test tests/edge/v13_17_geo_evidence_security_gate.mjs
node tools/ai_factory/v13_8_2_verify_production_bundle.mjs
python -m unittest discover -s tests/v11
npm run lint
git diff --check
```

## Mandatory staging checks before approval

- Verify the migration's `public.can_view_complaint_evidence` rejects unauthenticated users, a different agency, revoked staff and ordinary citizens, and permits assigned staff/main admin.
- Verify anonymous public map RPC returns **only** coarse counts with threshold 8, never coordinates from individual rows, even after multiple filter changes.
- Verify guest photo upload requires the correct 24-digit tracking number; wrong token, wrong reference, second upload, oversized image, MIME spoof, and unauthorized citizen fail.
- Verify department staff can open correct case photo and incident coordinate, while other agencies cannot.
- Test successful GPS pin, denied permission/manual pin, empty map, network failure, too-large photo, photo retry after receipt, guest tracking after submission and authenticated submission.
- Review layout at 320, 393, 768, 1024 and 1440 px on real Chrome/mobile, including map taps and keyboard navigation. Chromium screenshot automation was restricted by this coding environment; **this check is pending**.
- Observe storage consumption, Edge execution, map tile load, quotas, and RLS audit results. Do not merge or deploy public/production until approval.

## Antigravity patch transfer (PowerShell)

1. Preserve your existing workspace: inspect `git status --short` and `git worktree list`. Never run `git reset --hard` or erase uncommitted work.
2. Confirm the intended repo with `git remote -v`. The patch base is commit `36108ade5be41ffd94afe151db3112c750d8a979` on the V13.16.2 staging-final line.
3. Create a **new** worktree/branch from that exact base (or ask before proceeding if the commit cannot be found):

```powershell
git fetch origin
git worktree add -b feature/v13-17-evidence-geo-archive-map 'D:\RomanUrdu_V13_17_Review' 36108ade5be41ffd94afe151db3112c750d8a979
Set-Location 'D:\RomanUrdu_V13_17_Review'
git am "$env:USERPROFILE\Downloads\Awaaz_e_Awam_V13_17_Evidence_Geo_Archive_Map.patch"
```

4. Run the gates above. If any command fails, **stop and inspect; do not force-apply**. The patch creates a commit via `git am`.
5. On successful tests, push this isolated feature branch:

```powershell
git push -u origin feature/v13-17-evidence-geo-archive-map
```

6. Open a PR targeting the verified integration branch. Keep production DB and `main` untouched pending explicit approval. Staging migrations/functions require separate operational sign-off.
