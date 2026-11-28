# V27 Step 3B — two-department complaint lifecycle

Staging: jvbulmmdwovtgaxojxhn. Prior checkpoint 3a9dac66524defcb6ac8ff2bbfb96617678091b4. Existing ten QA identities from run f27d9f3f4d46. Database-only rollback test, no production changes.

## Results: 26/26 assertions passed in the executed scenario
1. Exactly two assigned departments (KMC primary, KW&SC secondary).
2. Two assigned issue records.
3. Independent work orders.
4. Heads see only their own department issue.
5. Citizen private contact data inaccessible to both heads.
6. Officer sees only assigned order.
7. Cross-department start denied.
8–9. KMC and KW&SC each started work, validated synthetic coordinates and recorded synthetic proof metadata.
10–11. KMC and KW&SC each approved their own evidence.
12–13. KMC and KW&SC each completed their own issue.
14–15. Each head denied approval of the other department order.
16. Secondary issue remains in progress when primary is approved.
17–18. Citizen can view each approved proof.
19. Parent closure denied after only one department completed.
20. Parent closure denied when second department approved but second citizen confirmation missing (within review window).
21. Both citizen confirmations recorded.
22. Secondary head cannot close the parent complaint.
23. Primary head successfully resolves after all requirements met.
24. Exactly one resolution notification queued.
25. Administrator sees both issues.
26. Three-department request through v23_submit_citizen_with_location held under_review with zero assigned departments.

The passing reproducible SQL is V27_STEP3B_ROLLBACK_QA.sql. It uses pre-existing QA identities and simulated JWT claims, supplied classifier metadata, synthetic coordinates and synthetic storage metadata. This is not an authenticated HTTP/browser/actual file test. All temporary records were rolled back; zero complaints, work orders, storage objects or notification outbox entries remain. Ten QA users preserved. Advisor counts unchanged.

## Open edge cases and release gates
The normal location-aware intake route enforced the two-department cap in the executed test. The lower-level service-only submit_citizen_complaint implementation appears to rely on caller-supplied routing metadata and does not independently enforce the same cap or issue/department consistency. A supplemental malformed-metadata test was blocked before execution by the tool environment, so duplicates, extra issue departments, missing issue departments and lower-level cap are not runtime verified; no fix was applied. Keep these as classifier/intake release gates. Dispute/rework, nonresponse closure, deadline duration, rankings, notifications delivery, real HTTP/browser, actual classifier inference and binary evidence upload remain unverified. No schema migration or new functionality needed for the passing nominal scenario. No production deployment, classifier changes, or spend.

Verdict: PASS for tested normal dual-department staging DB scenario; broader release gates remain open.
