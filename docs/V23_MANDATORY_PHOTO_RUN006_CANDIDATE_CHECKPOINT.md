# V23 staging checkpoint — mandatory Citizen photo and Run006 candidate

Staging only: jvbulmmdwovtgaxojxhn. Production unchanged. No paid resources added.

## Citizen intake
- Applied remote migration 20261128073114, v23_mandatory_citizen_evidence. SQL: docs/staging/v23_mandatory_citizen_evidence.sql.
- submit-classified-complaint v4 is ACTIVE. Requires multipart payload + image, caps image at 1 MiB, validates supported format signatures, uploads to the existing private bucket, then commits complaint, incident pin and evidence ledger together in a database transaction.
- The existing submit and location RPCs and new evidence RPC are service-role only; anon and authenticated roles have no execute privilege.
- Updated Citizen service and form: require captured photo, submit together, reject unconfirmed receipts, no optional post-submit upload, do not display predicted departments as assigned for manual review. The legacy upload endpoint remains for backward-compatible repair of existing records only.
- Live SQL rejection tests passed: missing photo, oversized photo, fabricated storage path, no complaint created. Verified staging counts: complaints 0, complaint_evidence 0, memberships 0, private Citizen objects 0.
- No positive real-camera upload/HTTP invocation or browser build has been performed. SQL test is not a substitute for Storage upload or full browser verification. Storage and SQL are separate systems: a confirmed SQL failure triggers cleanup when safe; ambiguous failures retain the private object. Idempotent retries and orphan reconciliation remain acceptance items. Browser camera cannot attest real-world capture against manipulated clients.

## Run006 candidate
- Recovered actual frozen artifact from Git blob 653e148570c646d969d6c2da935767bbaa817a53.
- Exported JSON embedded checksum bfe9a67841d9a6b1609cfdc603edf0a4e7897ebc8a647ded78946d9910a1e05d (not independently asserted as raw file SHA-256).
- 9,262 word features + 15,716 char features; six classifiers each 24,978 finite coefficients. Source content length 5,556,676 bytes; compact JSON 3,933,023 bytes with all parsed values unchanged. Complete deployment input about 4.11 million characters before bundling.
- evaluate-run006-candidate v1 is ACTIVE, JWT verification enabled, requires server service-role bearer inside handler, bounded 200-word requests, no database writes. Uses original V11 and V13.5 TypeScript implementations with only relative import path rewrites. Raw and policy results returned separately. No retraining or edits to source model.
- Reproducible preparation script: tools/ai_factory/prepare_run006_edge_candidate.mjs; entry: tools/ai_factory/run006_candidate_edge.ts.
- Existing Citizen submission continues Run004; no automatic promotion. The old benchmark script only simulated tokenization rather than full inference. The existing Python V13.5 helper ignores its model_artifact parameter and is not a valid ML parity reference. Need independent Python reference, local and actual hosted evaluation on 500 + 2000 + 50 cases. Verify decision parity and actual latency/resource behavior before promotion. Candidate deployment metadata confirmed via list_edge_functions; fetching full deployed source hit connector internal error, and no authenticated candidate invocation has been made.

## Next acceptance gates
1. Configure real Brevo sender and Edge secrets plus Supabase Auth SMTP independently; never paste secrets into chat.
2. Run local TypeScript, lint, Vitest and three portal builds; verify actual Citizen photo upload, real account login, MFA, onboarding, assignments, evidence, review, cross-role denial, and mobile/browser screenshots.
3. Verify and promote Run006 only after full inference/policy acceptance. Resolve migration history, Karachi coverage and authorized manual review/closure policy. No public deployment or merge yet.
