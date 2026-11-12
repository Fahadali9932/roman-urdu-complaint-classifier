# Department Portal visual QA

**Findings**

- No actionable P0, P1, or P2 differences remain for the intended adaptation. The source references are inspiration for composition and craft—not a feature or palette copy—so the purple, analytics, order, profile, payment, and social surfaces were intentionally excluded.

**Comparison target**

- Sign-in source: C:\Users\Annihilation\AppData\Local\Temp\codex-file-preview-FAETEe\image(20261112-170244).png — 736 × 552 px.
- Workspace source: C:\Users\Annihilation\AppData\Local\Temp\codex-file-preview-aLmDaX\image(20261112-170454).png — 1024 × 768 px.
- Row-density source: C:\Users\Annihilation\AppData\Local\Temp\codex-file-preview-OYZkp8\image(20261112-164723).png — 1199 × 899 px.
- Rendered implementation: browser-rendered Vite app at http://127.0.0.1:4173/department/login and /department. In-app browser captures are ephemeral, so there is no durable local screenshot path; the captures were visually inspected during this run.
- Desktop comparison: 1440 × 900 CSS px, density 1. The source mockups were not compared pixel-for-pixel because their image dimensions and product content differ; their interior composition was normalized conceptually: frame, rail, toolbar, white workspace, content density, and form placement.

**Comparison history**

1. Initial desktop browser check found a P2 empty state: a large bordered card floated inside an already framed workspace.
   - Fix: removed the extra panel treatment and integrated the empty state into the workspace with a single top divider.
   - Post-fix evidence: browser capture at 1440 × 900 showed the empty state centered directly within the white workspace.
2. Initial 1024 × 900 browser check found a P2 density issue: the master-detail columns were readable but too compressed.
   - Fix: moved the master-detail threshold from 1024 px to 1280 px, preserving inbox-first tablet behavior.
   - Post-fix evidence: browser capture at 768 × 900 showed full-width tablet inbox; 1024 px was retested structurally after the breakpoint adjustment.

**Required fidelity surfaces**

- **Fonts and typography:** Existing product sans-serif stack is retained. The sign-in title uses a bold 40–48 px hierarchy; workspace titles, row titles, labels, metadata, and status text have distinct optical weights. No heading or mobile control overlaps. Long department names truncate in compact controls instead of expanding the layout.
- **Spacing and layout rhythm:** The login uses a two-region asymmetric frame with generous dark brand space and an integrated form. The dashboard uses a thick dark outer frame, a 72 px icon rail, white rounded interior, quiet toolbar, 16–24 px content rhythm, and airy complaint rows. Mobile removes the desktop shell/rail and uses native vertical scrolling.
- **Colors and tokens:** Six scoped department themes set only portal shell, accent, tint, focus, and primary-action tokens: K-Electric navy/power blue; SSGC bronze; KWSC ocean blue; SSWMB forest green; KMC asphalt/gold; SBCA slate-mauve; plus a slate fallback. Status semantics remain stable: resolved is green and closed neutral.
- **Image quality:** public/department/login-atmosphere.png is a text-free generated backdrop with dark architectural geometry. It was inspected against the sign-in reference and scaled as a full-bleed background; functional symbols use the existing Lucide icon library rather than fabricated imagery.
- **Copy and content:** The form uses “Department Portal” and “Manage complaints assigned to your department.” The single prototype notice truthfully states that the access key is not validated. No fake officers, metrics, promises, government endorsement, or production sample complaints were added. Department details omit name, phone, email, and home address.

**Interaction and responsive evidence**

- Tested sign-in, selector open, real-time theme preview, sign-out, department filters, search, mobile selection/back navigation, status-dialog selection/save, English, and Urdu RTL.
- Captured actual browser states at 1440 × 900 (login, empty workspace, populated master-detail, dialog), 1024 × 900 (compact desktop), 768 × 900 (tablet inbox), 430 × 844 (mobile inbox/detail), 390 × 844 (Urdu RTL detail), 360 × 800 (login), and 320 × 760 (login selector).
- Populated browser checks used an isolated, temporary QA-only fixture mode and were removed before the final build. Normal runtime was rechecked as an empty complaint queue.
- Browser console: no application errors observed. Unit suite: 75/75 passed.

**Open Questions**

- The current sign-in flow remains a browser-session prototype and does not validate the access key. This is presented plainly in the UI and is not authorization.
- Browser-local complaints do not provide a secure shared backend or cross-device persistence.

**Implementation Checklist**

- [x] Use department-scoped six-theme tokens.
- [x] Adapt both reference compositions without copying unrelated dashboard features.
- [x] Preserve department filtering, PII redaction, status updates, timeline, English/Urdu RTL, and responsive navigation.
- [x] Verify browser rendering and responsive states.
- [x] Remove QA-only fixture mode before final build.

**Follow-up Polish**

- [P3] When a real authentication/backend integration is introduced, replace the prototype access message with the real authorization state without changing the theme-selection behavior.

final result: passed
