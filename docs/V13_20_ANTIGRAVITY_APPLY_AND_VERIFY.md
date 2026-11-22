# Antigravity hand-off — V13.20 Head / Officer portal fix

Copy the following into Antigravity IDE while the **Awaaz-e-Awam** repository is open. This prompt describes a code change already prepared as a patch; it does not authorize production deployment.

---

You are working on Awaaz-e-Awam V13.20. The user reported two genuine regressions in a local browser: Head and Field Officer links both led to `/department` and the assignment deadline used an overlapping Chrome `datetime-local` popup. The supplied screenshot shows the problem. Treat visual correctness and access separation as release blockers.

1. Verify the repository and branch before applying code. Keep the production branch untouched. The patch `V13_20_role_entry_deadline_picker.patch` is based on V13.19 commit `5057d30be5727ea80a818c4da3808b3767c050e0`. Use a new isolated feature branch/worktree if the working tree is dirty. Do not force-push or merge into main.
2. If this patch is not yet applied, check with `git apply --check V13_20_role_entry_deadline_picker.patch`, then apply it. If it is already applied, do not apply twice. Preserve other developer changes.
3. Read the locally installed skills `charles-unslop` and `charles-ux-animation` completely, and discover any other relevant installed UI/UX or audit skills. Use their rules to evaluate the implementation, not merely to add decorative effects. There were two unique skill URLs; the third URL supplied by the user repeated `charles-unslop`.
4. Confirm **distinct role login and landing URLs** work in actual Chrome:
   - Department Head: `http://localhost:5173/department/head/login?dept=kmc`, `roads-01` demo identity, landing `/department/head`.
   - Field Officer: `http://localhost:5173/department/officer/login?dept=kmc`, `roads-02` demo identity, landing `/department/officer`.
   - Central Admin: `http://localhost:5173/admin/login`, existing separate administrator login.
   Do not use the same authenticated browser session to compare two different people; open the Officer in a separate incognito/browser profile. The local-only access key is displayed by the login page. In live configuration use approved invitation and TOTP; never bypass security.
5. Negative tests: a Head account must be rejected on Officer login, and changing a Head URL to `/department/officer` must not grant officer dashboard access. Repeat inverse tests, unauthenticated redirection, and logout. Backend membership, MFA, and RLS remain authoritative; routes are only the frontend boundary.
6. On the Head dispatch desk, select a case and open **Work deadline**. Confirm the new inline calendar does not float over the instructions textarea; time selects show side by side, the selected date/time is legible, past deadlines fail, and assignment behavior is unchanged. Check the Officer **Request extra time** dialog likewise. Exercise keyboard controls and 320, 393, 768, 1024 and 1440px viewport widths, light and dark themes, and Chrome/Edge. Fix any clipping, focus, or contrast defect actually found.
7. Visually inspect the Officer dashboard and Head dashboard independently. Keep work queue, proof upload, location capture, approval, extension request and archive actions available only to their intended role. Do not replace real functionality with polished dummy controls. Do not alter demo counts to disguise missing records.
8. Run `npm ci`, `npm run lint`, `npm run build`, and `npm test -- --reporter=dot`. Report exact pass/fail counts and any known warnings; capture actual screenshots for both roles and both deadline controls. Test signed staging workflows only if individually approved staging identities are available; otherwise mark them blocked, not passed.
9. Do not create paid dependencies, modify Supabase production policies, publish, merge to main, or silently change authorization. Commit any verified follow-up corrections on the feature branch and give the user the commit, branch, file list, screenshots, test summary and remaining limitations. Do not call the UI complete until screenshots and interactions have actually been reviewed.

---

Manual readme: `docs/V13_20_HEAD_OFFICER_ENTRY_AND_DEADLINE.md`.
