# Run006 staging evaluation gate

Full repository model retrieved from Git blob `653e148570c646d969d6c2da935767bbaa817a53`.
- Raw SHA-256: `165b7c21b1a05f870116b35f93144f98ccce9ff8c821d15c66eac3e4f62b5c4c`.
- Embedded checksum: `bfe9a67841d9a6b1609cfdc603edf0a4e7897ebc8a647ded78946d9910a1e05d`.
- Compact JSON SHA-256: `8e8484e11e41afec3f1d4d485b68ca9dcce5278402ec1aaee81d3ab59b53e2be`.
- JSON parse/stringify round-trip verified; no model values deliberately edited. Existing historical reported checksums differ, so reconcile provenance before promotion. Do not call this a verified frozen Run006 release.

The evaluation endpoint is a service-role-only POST, uses fixed synthetic complaints, no database writes and no arbitrary user input. It is not connected to citizen intake. Smoke cases are not a representative accuracy benchmark. Run the full frozen holdout and adversarial evaluation before replacing the active classifier. Do not log or share service role credentials.

Generate run006.compact.json from the tracked data/v11/curriculum_runs/run_006/candidate_model.json with JSON.stringify(JSON.parse(...)); the compact artifact is not separately tracked. Engine copied from the active staging intake source to ensure evaluation uses the same implementation. Run with a trusted server-side service role bearer in a staging environment only.
