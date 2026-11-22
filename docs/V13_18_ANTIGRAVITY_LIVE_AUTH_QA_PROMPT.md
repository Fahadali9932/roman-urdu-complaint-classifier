# Awaaz-e-Awam V13.18 — Antigravity Live Staging Acceptance Prompt

## ROLE
Act as a senior Supabase security engineer and end-to-end QA lead. Continue
from the verified V13.18 staging implementation. Professional English,
evidence-first, no simulated outcomes passed off as live results.

## VERIFIED GIT AND STAGING CONTEXT
- Repository: `Fahadali9932/roman-urdu-complaint-classifier`.
- Starting baseline: remote `feature/v13-18-verified-field-operations` at
  `7623bc66d262209d82293e92f2f6ce3965846da0`.
- Apply the additional `feature/v13-18-staging-qa` changes after checking
  the live remote; do not force-push or overwrite Windows worktrees.
- Approved staging Supabase ref: `jvbulmmdwovtgaxojxhn`.
- Protected production ref: `akbwiedtmxjxcjscgitw` — DO NOT modify.
- Hosted staging already has V13.13, V13.17, V13.18 and the forward
  monotonic-proof-timestamp migration, plus three matching Edge Functions.
- Transactional SQL acceptance passed; **real Supabase Auth users are zero**.

## OBJECTIVES
1. **Preflight and preserve:** inspect `git status`, worktrees, remotes,
   branch heads, and staged migrations. Work in a fresh isolated feature
   worktree and preserve dirty user files. Confirm local source contains the
   forward SQL migration and transactional staging QA script.
2. **Obtain approved identities:** request the owner's intended staging-only
   Main Admin, Department Head, Field Officer, and Citizen emails and access
   to those inboxes. Do not invent, reuse another person's identity, send
   invitations, or handle their TOTP secrets without explicit authorization.
   Stop live-user setup if these are unavailable.
3. **Verify hosted state:** read migration history, RLS, selected RPC grants,
   private buckets, Edge Function versions, existing Auth users and advisors.
   Do not reapply installed migrations. Never touch production.
4. **Real Auth & MFA:** use approved Supabase Auth setup/invitation to create
   distinct people and verified `aal2` TOTP sessions, with verified active
   `department_memberships` and correct `staff_role` from database authority.
   Ensure Main Admin's role is provisioned by an authorized process.
5. **True end-to-end positive flow:** submit or securely seed one explicitly
   marked staging test complaint; Head assigns Officer with deadline;
   Officer logs in separately, starts work, requests extension, uploads a
   valid private GPS/photo; Head reviews and approves; Citizen sees only
   their own approved proof and confirms; Head closes with an audit trail.
6. **Dispute and 72-hour negative paths:** test citizen dispute against an
   exact evidence version, officer rework, new evidence, and preserved
   feedback. Assert early nonresponse closure is rejected even through the
   legacy status RPC. Test the 72-hour waiver only with controlled clock/test
   isolation; never change real customer review windows.
7. **Least privilege:** prove wrong-department/wrong-officer restrictions,
   revoked staff access, AAL1 denial, private storage URL authorization,
   unauthenticated map k-anonymity, and inaccessible guest credential hashes.
   Preserve any failures as evidence and fix root causes in forward changes.
8. **Real Chrome QA:** Head and Officer workspaces, Admin Access, citizen
   proof panel, map and archive, at widths 320, 393, 768, 1024, 1440 in
   light/dark as applicable. Check keyboard, overflow and true navigation.
   Capture and report screenshots with exact routes and verified identities.
9. **Quality and Git:** run full TypeScript/Vite, Vitest, Python, Edge/security,
   lint and `git diff --check`. Do not claim zero warnings if there are
   existing warnings. Commit/push only to a reviewed feature branch, never
   `main`; no force push, no secret `.env.local`, no paid or card-gated steps.

## FINAL REPORT
Include exact changed paths, migrations executed/skipped, function versions,
real account roles (redact emails), timestamps, positive/negative E2E cases,
screenshots, test exit codes, actual commit SHA and remote push status,
explicit unresolved issues, and readiness decision. Do not claim a pass for
anything that required a missing account, browser, or secret.

## FINAL INSTRUCTION
Keep production and frozen Run004/Run006 artifacts untouched. If the approved
staging users or MFA access are unavailable, stop at that boundary and return
the exact operator checklist without creating identities on your own.
