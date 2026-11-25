# V3 Figma Design Specification Cache (Extracted 2026-11-25)

Extracted via Figma MCP (`get_metadata`, `get_design_context`, `get_screenshot`) under Education account `f24bdocs1m01043@iub.edu.pk`. Temporary asset URLs intentionally omitted.

## 1. File Inventory (252 V3 Frames Total)
- **Department Head (`dTKbWUPPyx2iu8dfk8e3MJ`, `page 0:1`)**: **100** `V3 ·` frames (`Focus`, `Complaints`, `Case details`, `Dispatch / Case|Officer|Deadline|Instructions|Confirm`, `Assignment confirmation`, `Proof review`, `Officers`, `Archive`, `Extension review`, `Department Head login`, `Staff access request`, `Workspace menu`, across Light/Dark & `1440`/`1024`/`768`/`393`/`320`).
- **Field Officer (`uXt2jY9QoEysSctI3oplmO`, `page 0:1`)**: **70** `V3 ·` frames (`My day`, `Assignments`, `Task details`, `Work in progress`, `Submit evidence`, `Evidence confirmation`, `Request extension`, `History`, `Field Officer login`, `Staff access request`, `Workspace menu`).
- **Central Administrator (`hlMJ7bE6QuzZiFqvgOXQ3H`, `page 0:1`)**: **82** `V3 ·` frames (`Requests`, `Applicant details`, `Approval confirmation`, `Permissions`, `Staff permission details`, `Access change`, `AI review`, `Routing review details`, `Department selection`, `Audit`, `Audit event details`, `Central Administrator login`, `Workspace menu`).

## 2. Atmospheric Civic Glass Tokens (DM Sans)

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--v3-canvas` | `#E8EDF0` | `#202B35` | Page canvas |
| `--v3-surface` | `#F1F4F6` | `#283541` | Nav / inputs / surfaces |
| `--v3-surface-glass` | `rgba(241, 244, 246, 0.86)` | `rgba(40, 53, 65, 0.86)` | Frosted login/nav glass (`blur(14px)` login, `blur(9px)` nav) |
| `--v3-raised` | `#DCE5EA` | `#344450` | Elevated fields / photo slots / subtle cards |
| `--v3-soft` | `#D9E4EB` | `#304656` | Active nav pill / focused row / selected radio option |
| `--v3-edge` | `#C4D0D8` | `#475969` | 1px hairlines & pill nav border |
| `--v3-ink` | `#273746` | `#E1E8EE` | Primary ink |
| `--v3-muted` | `#526575` | `#A9B9C6` | Secondary text, labels, inactive nav |
| `--v3-accent` | `#365875` | `#B1CADC` | Quiet text action links & active stepper underline |
| `--v3-action` | `#426581` | `#436581` | Primary action fill |
| `--v3-onaction` | `#F0F4F7` | `#EFF4F7` | Primary action text |

- **Typography**: `DM Sans` (`font-variation-settings: "opsz" 14`, line-height `1.35`):
  - Login role title: `46px` Medium (`30px` on card "Sign in")
  - Workspace Page H1: `38px` Medium desktop, `30px` (`~28–30px`) mobile (`<= 768px`)
  - Detail item title: `20–21px` Medium
  - Section heading: `18px` Medium (`214px` top mobile, `252px` desktop)
  - Row title: `17px` Medium desktop, `16px` Medium mobile
  - Body / narrative value: `15px` Regular
  - Nav item / Primary button / Quiet action: `14px` Medium
  - Eyebrow / field label / metadata / status / avatar initial: `13px`
  - Stepper stage label / footer caption: `12px`

## 3. Shared Layout & Component Geometry

1. **Floating Pill Navigation (`Single top navigation`)**:
   - Desktop `1440px`: `max-width: 1120px`, `height: 56px`, `border-radius: 28px`, `margin-top: 24px`, translucent surface + `blur(9px)` + `1px solid var(--v3-edge)`.
   - Left: `Awaaz-e-Awam` (`15px` Medium).
   - Center: Pill nav links (`104 × 36px`, `rounded-[18px]` when active with `var(--v3-soft)`).
     - Head tabs: `Focus`, `Complaints`, `Dispatch`, `Proof` (plus secondary destinations via `...` Workspace menu: `Officers`, `Archive`, `Extension review`, `Sign out`).
     - Officer tabs: `My day`, `Assignments`, `History` (plus `Workspace menu`: `Submit evidence`, `Request extension`, `Sign out`).
     - Admin tabs: `Requests`, `Permissions`, `AI review`, `Audit` (plus `Workspace menu`: `Sign out`).
   - Right: Workspace Menu button (`...` 20px), Theme toggle icon (18–20px), Avatar pill (`32px` circle with `H` / `O` / `A` initial on `>= 768px`, hidden cleanly on narrow `393px`/`320px` so mobile pill bar `369px` / `296px` stays single-row with brand + theme + menu!).
2. **Main Content Column**: `max-width: 960px` centered horizontally; `20px` side padding at `393px` and `320px`.
3. **Operational List Row (`Case row`)**:
   - Desktop: `height: 80px`, `Focused` row uses `var(--v3-soft)` with `12px` radius & `24px` left inset; standard rows have `1px solid var(--v3-edge)` bottom border & `8px` left inset. Columns: Title+Meta left (`17px` + `13px`), Status middle (`13px`), Quiet action right (`Inspect`, `Assign`, `Review`, `Open`, `Select`, `Manage`, `44px` accessible hit target).
   - Mobile (`393px`/`320px`): `min-height: 88px`, right-aligned quiet action (`>= 44px` tap area), clean word wrapping (`overflow-wrap: anywhere`) so zero horizontal overflow occurs at `320px`.
4. **Workspace Menu View**: Full-page centered clean vertical menu (`640px` max width), `32px` heading `Workspace`, role/dept subtitle, `52px` clickable rows with bottom hairlines & right arrow, plus `Sign out` link at bottom.
5. **Authentication Screens**:
   - Full-viewport preserved department artwork (KMC road SVG / department SVGs) with transparent left typographic anchor (`Awaaz-e-Awam`, `46px` portal title, `KMC · Authorized staff access` or `Internal staff access`) and right `380px` frosted glass card (`radius: 24px`, `backdrop-blur(14px)`).
   - Contrast rule: Light glass uses high-opacity frosted light surface `var(--v3-surface-glass)` with `#273746` ink (never dark charcoal box under dark text); Dark glass uses dark frosted surface with `#E1E8EE` ink.
   - Zero public registration link on Central Administrator login (`5:712`); Staff Access Request (`14:1364` / `9:502`) available for Department Head & Field Officer only.
6. **Head 5-Stage Dispatch (`11:1151..11:1668`)**:
   - 5 horizontal progress bars (`Case`, `Officer`, `Deadline`, `Instructions`, `Confirm`), completed/current segments use `var(--v3-accent)`, upcoming `var(--v3-edge)`.
   - Stage 3 (`11:1323`): Monday-first `M T W T F S S` strip of vertical `36 × 56px` `rounded-[18px]` capsules (`var(--v3-surface)` default, `var(--v3-action)` active with light text, `6px` bottom workload dot), `‹` / `›` week navigation, `Time (PKT)` input field, live formatted deadline summary below, `44px` Continue button + Back link.
7. **Officer & Admin Operational Details**:
   - Clean vertical key-value detail pages (`Detail title 20-21px`, metadata `14px`, field label `13px`, value `15px`, `44px` primary button + Back link).
   - Dual Evidence (`5:613` & `11:1707`): side-by-side `Before` and `After` cards (`294 × 180px` desktop, stacked responsively on mobile, `rounded-[12px]`, `var(--v3-raised)`), GPS verification section below, primary action (`Submit proof` / `Approve proof`) + secondary link (`Return for rework`).
   - Radio option selector cards (`11:467` Access change & `11:488` Department selection): `72px` rows (`rounded-[10px]`, selected uses `var(--v3-soft)`).
