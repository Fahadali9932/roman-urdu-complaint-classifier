# V13.6 — Independent Issue Recovery & Safe Routing (Experimental)

**Status:** Optional Local AI Test Mode candidate only. **Not promoted or deployed.**

## What changed

- Preserve the frozen classifier and the existing V13.4 causal/negation decision as the starting point.
- Recover a second municipal department only if two separately grounded, affirmative civic asset/defect pairs appear in distinct complaint spans. Basic Roman Urdu spelling variations and informal connectives (`or`, `sewr`, etc.) are supported without requiring ideal punctuation.
- Independently inspect the pre-routing evidence for three or more faults. When detected, **route to no department automatically**, preserve `allDetectedDepartments`, and require human triage.
- Preserve V13.4 clarification behavior, the 200-word complaint cap, and the existing Run004 default.
- Expose **V13.6 Experimental** only in the citizen form's **Local AI Test Mode** selector. It does not make database writes or activate production routing.

## Repeatable development probe — previously inspected examples

The 2,000 examples below were inspected during previous phases. Therefore these figures are **development diagnostics, not a new independent validation**. Both variants used the same tracked `src/models/v11_candidate_model.json` artifact from this Git checkout.

| Metric on known 2,000 examples | V13.5 + tracked Run004 | V13.6 + same artifact |
| --- | ---: | ---: |
| Exact department-set match | 1,215 / 2,000 (**60.75%**) | 1,306 / 2,000 (**65.30%**) |
| Two independent issues, exact match | 137 / 500 (**27.40%**) | 242 / 500 (**48.40%**) |
| Causal-dependent, exact match | 217 / 250 (**86.80%**) | 210 / 250 (**84.00%**) |
| False-extra cases | 187 / 2,000 (**9.35%**) | 205 / 2,000 (**10.25%**) |
| Missed-department cases | 688 / 2,000 (**34.40%**) | 580 / 2,000 (**29.00%**) |
| Truly ambiguous cases correctly left unassigned | 50 / 50 | 50 / 50 |
| Known triple-department suite escalated with all evidence | 4 / 50 (V13.5 policy) | **50 / 50** |

The 50 known triple-department cases are an additional **regression suite**, not a new sample. All 50 V13.6 examples produced no automatic department assignment and preserved all three ground-truth departments for staff review. This is **not** evidence of 100% real-world three-department detection.

**Safety caveat:** V13.6 gained 91 exact matches overall but increased false extras by 18 cases and lost seven correct causal cases on the known development set. It is **not ready to replace the active runtime**. The system cannot promise 95% or universal complaint understanding, and benchmark-driven tuning risks overfitting. A new, independently written and human-labeled holdout is required before considering promotion.

## Reproduction

```bash
npm ci
npx vitest run src/test/V13_6_IndependentIssueRecovery.test.ts src/test/V13_6_ThreeDepartmentSafety.test.ts src/test/V13_4_CausalReasoningAndFalseExtra.test.ts
RUN_V13_6_DEV_PROBE=1 npx vitest run src/test/V13_6_DevelopmentProbe.test.ts
```

The development probe is opt-in and skipped during normal Vitest runs. It reads the existing V13.5 data without modifying the benchmark files.

## Source checkout and release blockers

- Current GitHub branch is missing the imported `src/services/complaintUnderstanding.ts`. A clean clone's `npm run build` fails on this pre-existing missing file, along with TypeScript errors in `AiControlCenterPage.tsx`, `DepartmentDashboardPage.tsx` and `FlagIncorrectDepartmentModal.tsx`. No new `v13_6` TypeScript errors were reported. Do **not** represent a passing targeted regression as a passing production build.
- The ignored archival `data/v11/curriculum_runs/run_004/candidate_model.json` and `run_006/candidate_model.json` are absent from the GitHub clone, so an archival hash comparison or Run006 evaluation could not be repeated here. The **tracked runtime artifact was not modified**; its SHA-256 in this checkout is `bd3241e91f80780d72f43911c06be1b4d1f6edd67f3f2f3519e41d1dfcfd556d`. The earlier archival Run004 report's SHA-256 was `e4d042...`; byte identity cannot be verified without the archival file. The V13.5 Run004+V13.5 reference count (1,215) was reproduced exactly.
- This code must remain an **opt-in, local-only experiment**. Do not promote a model, run autonomous training, deploy to production, change Supabase policies, or push a live website as part of this phase.

## Next gate

1. Sync the missing code and frozen archival artifacts from the Windows Work workspace into the development branch, taking care not to overwrite unsaved local changes.
2. Repair the pre-existing build and suite failures separately, then verify desktop/mobile local test UI end-to-end.
3. Build a **fresh, separately authored/human-adjudicated** test set including abusive, misspelled, causal, dual, negation, and out-of-scope complaints; evaluate Run004 and V13.6 under the same routing and human-review policy.
4. Promote only if the new independent holdout shows an acceptable gain **without** unsafe increases in false routing, causal confusion, or human-review bypass.
