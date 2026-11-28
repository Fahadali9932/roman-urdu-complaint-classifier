You are a senior frontend engineer + senior product designer + motion UX specialist + QA verifier working inside the existing Awaaz-e-Awam repository.

You are not allowed to restart the project, redesign blindly, or produce AI-slop styling.
You must improve the existing frontend implementation directly and preserve useful existing work.

Your job is to finish and polish the department portals so they feel premium, smooth, operational, calm, and visually intentional.
FIRST RULES — READ CAREFULLY
1. Do not do another backend redevelopment cycle.
2. Do not produce another planning-only answer.
3. Start implementation immediately after verifying Git status and creating a rollback checkpoint.
4. Frontend first. Backend second.
5. Preserve all useful existing routes, logic, mocks, and structure unless a change is necessary for polish or correctness.
6. Do not destroy working screens just to rebuild from scratch.
7. Do not introduce random colors.
8. Do not use yellow-heavy buttons/icons/logos anymore.
9. Do not create noisy enterprise UI, generic SaaS cards, or obvious AI-generated copy.
10. All motion must be smooth, premium, and controlled.
11. The navbar must be fixed properly.
12. All major changes must be verified in the browser with screenshots.
13. No force pushes. No destructive Git actions.
14. Commit and push only after the visual/frontend checkpoint is verified.
VERIFIED DESIGN DIRECTION
The user has approved a cinematic operational portal style with:
- dark atmospheric background
- bright glowing department gradient
- huge centered hero greeting on landing
- restrained glassmorphism / soft panels
- very clean typography
- smooth morphing top navigation
- operational dashboard feel
- strong visual polish
- premium motion, not fast/jittery motion
The current build is partially correct but still has problems:
- too much yellow tone in controls, icons, buttons, chips, and accents
- navbar hover behavior is bad, flickery, delayed, too fast, and not smooth enough
- some text feels AI-generated
- top-left branding alignment needs fixing
- top-right date/time layout needs improvement
- notifications appear in top-right and look bad
- dashboard filters are not fully functional
- complaint details need a map and citizen image/evidence section
- assignment flow needs custom date option and proper success modal
- verification screens need better design and centered modals
- officers screen and officer details need a major layout improvement
- profile and notification views need proper finishing
- all of this must also be reflected in the officer and other department portals
COLOR SYSTEM — EXACT APPROVED PALETTES
Use these as the official exact portal colors.
1) Shared neutral UI colors (for all portals)
Use these for text, panels, borders, buttons, icons, inputs, and general UI:
- --bg-deep: #070809
- --panel: #111317
- --panel-soft: #171A1F
- --panel-elevated: #1D2128
- --stroke: #2A3038
- --stroke-soft: rgba(255,255,255,0.08)
- --text-primary: #F3EEE4
- --text-secondary: #A6AEB8
- --text-muted: #7E858E
- --button-primary: #F0ECE3
- --button-primary-text: #101216
- --button-secondary: rgba(255,255,255,0.06)
- --button-secondary-text: #E9E2D5
- --button-hover: rgba(255,255,255,0.12)
2) Semantic colors
- --success: #3BC977
- --warning: #E59B2F
- --danger: #E05656
- --info: #4E9CFF
These semantic colors are allowed for status only.
3) Department palettes
KMC / Municipal / Roads / Head / Officer
Burnt Orange Atmospheric
- --dept-base-1: #0A0807
- --dept-base-2: #241103
- --dept-base-3: #5E3208
- --dept-glow-1: #B96A14
- --dept-glow-2: #E2A24D
KW&SC / Water
Deep Teal Atmospheric
- --dept-base-1: #05090A
- --dept-base-2: #0A1B1D
- --dept-base-3: #114E57
- --dept-glow-1: #1FA0A4
- --dept-glow-2: #79D8DD
K-Electric / Electricity
Cobalt Blue Atmospheric
- --dept-base-1: #05080C
- --dept-base-2: #0D1A2A
- --dept-base-3: #123B72
- --dept-glow-1: #2A6DF4
- --dept-glow-2: #7FB2FF
SNGPL / Gas
Emerald Atmospheric
- --dept-base-1: #060907
- --dept-base-2: #0E1A12
- --dept-base-3: #1B5A3B
- --dept-glow-1: #2BB673
- --dept-glow-2: #8BE0B0
SSWMB / Sanitary / Waste
Olive Civic Atmospheric
- --dept-base-1: #090907
- --dept-base-2: #17180F
- --dept-base-3: #495122
- --dept-glow-1: #8AA336
- --dept-glow-2: #C8DB73
Global Admin
Platinum Slate
- --dept-base-1: #070809
- --dept-base-2: #11151B
- --dept-base-3: #28303A
- --dept-glow-1: #8D99A8
- --dept-glow-2: #DCE3EA
IMPORTANT COLOR RULE
Department colors must primarily live in the atmospheric background and subtle highlight glows.
Do not tint every button, icon, badge, logo, chip, and control with the department color.

Instead:
- primary CTA buttons = neutral ivory/platinum
- secondary buttons = translucent dark
- icons = neutral or semantic
- small indicators = semantic only when meaningful
- status pills = semantic only
- nav background = dark neutral
- panels = dark neutral with subtle dept glow
This is critical.
MAIN OBJECTIVE
Refine the entire department frontend so it looks like a polished, premium operational system while preserving current functionality and improving broken interactions.

Implement the work in a careful, production-minded way.
IMPLEMENTATION OBJECTIVES
OBJECTIVE 1 — GIT SAFETY FIRST
Before editing:
1. Inspect git status
2. Inspect current branch
3. Inspect remotes
4. Create a rollback checkpoint commit if needed
5. Create a dedicated feature branch for this polish cycle
Do not skip this.
OBJECTIVE 2 — GLOBAL STYLE CLEANUP
Create or refine a shared theming/token system so all department portals consistently use:
- shared neutral UI tokens
- department-specific atmospheric background tokens
- semantic status tokens
- consistent spacing
- consistent shadows
- consistent border radii
- consistent type hierarchy
Clean up any leftover yellow-heavy styles.

Remove visual inconsistency across:
- landing
- dashboard
- complaints list
- complaint detail
- assignment
- verification
- officers
- profile
- notifications
- admin view
- officer view
OBJECTIVE 3 — LANDING PAGE POLISH
Fix the department landing page to match the approved look.
Required behavior
- Keep the giant greeting hero.
- Make the greeting bold, oversized, centered, and premium.
- Replace roads-01 with:
  - the user’s profile display name if available
  - otherwise fallback to Admin
- Below the name add two rounded action buttons:
  - Dashboard
  - Complaints
- Keep motion subtle and premium.
Top-left branding
Fix alignment and typography of:
- AWAAZ-E-AWAM
- KMC / OPERATIONAL DESK (or relevant department label)
They must align beautifully and not feel random.
Top-right date/time block
Fix the layout:
- day/date on top
- time centered below
- no seconds
- clean typographic alignment
- visually balanced
Hero motion
Keep the current feeling but polish:
- no jitter
- no harsh transitions
- use soft fade / blur / scale
- support reduced motion
Buttons
Make the landing buttons look much better:
- neutral, premium, tactile
- not yellow-heavy
- soft glow, subtle shadow, high contrast
- consistent hover and focus states
OBJECTIVE 4 — NAVBAR MAJOR FIX
The morphing navbar still has problems. Fix it properly.
Problems to solve
- appears/disappears too easily
- flickers if cursor is slightly above
- delay feels wrong
- expansion feels too fast
- motion is not smooth enough
- hit area is too unforgiving
Required solution
Implement a stable smooth morphing navbar with:
- broader hover trigger zone
- invisible hover bridge / safe corridor
- slower and smoother open motion
- slower close with graceful debounce
- support hover, click, and keyboard focus
- stable active state
- no flickering
- no accidental collapse while moving toward items
- clean easing/spring feel
- reduced-motion fallback
Motion guidance
- opening: calm and deliberate, around 350–450ms
- closing: slightly faster but still smooth, around 220–300ms
- no abrupt jumps
- no “AI fancy” motion
- premium only
Also ensure the notch/menu trigger feels intentional and not buggy.
OBJECTIVE 5 — DASHBOARD IMPROVEMENT
The dashboard is better now but still needs refinement.
Requirements
- keep overall structure
- improve text so it does not sound AI-generated
- refine labels and supporting copy
- use concise operational language
- make data cards more elegant
- improve visual hierarchy
Functional requirements
The range filters:
- Today
- Yesterday
- This Month
- This Year
must actually change the displayed data, charts, and summary.

If data is mocked, wire it properly so the UI visibly updates when filters change.
Copy direction
Do not use robotic copy.
Use concise operational copy like:
- “Active in-flight workload across department”
- “Verified resolutions archived to audit ledger”
- “Cases received in selected period”
- “Awaiting supervisory proof review”
Keep it short, clean, human, and operational.
OBJECTIVE 6 — COMPLAINT LIST PAGE
Keep the improved scroll behavior that the user already liked.

Do not ruin the current smoothness.
Fixes needed
- remove ugly yellowish accents
- improve text hierarchy
- improve card styling
- improve priority/status chip styling
- keep filters and search neat
- preserve the smooth motion
Make the complaints area feel premium and readable.
OBJECTIVE 7 — COMPLAINT DETAIL PAGE
This page needs significant improvement.
Keep
- complaint title
- location
- narrative
- action buttons
Add / improve
1. Proper map section
   - show a polished map block for the complaint location
   - use a lightweight free solution
   - preferred: Leaflet + OpenStreetMap (no paid key)
   - if not feasible, use a high-quality styled mock map block with pins and route context
   - must look real, not fake
2. Citizen evidence section
   - add a section for citizen-submitted images
   - show thumbnail(s)
   - allow larger inspection view if current architecture supports it
   - if no real uploads exist yet, use mock data structure but build the UI properly
3. Color cleanup
   - remove bad yellow tone from location accents and detail labels
   - use neutral + semantic accents only
4. Layout polish
   - complaint details should feel calm and premium
   - content spacing must improve
   - action buttons should feel stronger and more deliberate
OBJECTIVE 8 — ASSIGNMENT PAGE
This page is structurally good but still needs refinement.
Keep
- officer selection
- duration chips
- instruction area
Add
- custom completion date/time option
  in addition to preset durations:
  - 24h
  - 48h
  - 72h
  - 120h
  - 168h
Let the user choose a custom completion date/time.
Fix
- remove yellow-heavy accent issue
- improve button polish
- improve text polish
- improve selection states
Required confirmation
After assignment confirmation, show a centered confirmation modal or polished centered success dialog.
Do not show a top-right notification.

Message should be clean and simple, for example:
- “Complaint assigned successfully.”
- show officer name
- show due date / duration
- include buttons like “Back to complaints” or “View assigned case”
OBJECTIVE 9 — VERIFICATION FLOW
The verification area needs design and interaction refinement.
Problems
- current empty state can be better
- verification detail screen still needs polish
- notification after approval appears top-right and looks bad
Requirements
1. Improve verification queue layout
2. Improve verification detail view
3. Keep before/after evidence inspection
4. Make approval / return-for-correction actions feel more premium
5. Redesign empty state elegantly
Notification rule
After approval or correction:
- use a centered modal/dialog
- or a centered transient success layer
- not top-right toast
Make it feel official and polished.
OBJECTIVE 10 — OFFICERS PAGE COMPLETE FIX
This area needs a major visual and structural improvement.
Current issues
- layout feels weak
- side detail feels bad
- color usage is poor
- status visuals feel cheap
- overall page lacks polish
Required redesign
Create a better officer management experience with:
- cleaner officer cards
- stronger hierarchy
- better stats presentation
- better detail drawer/panel or split view
- better spacing and typography
- better action treatment
Status behavior
Officer status must work as:
- Active when officer is currently in the portal
- Offline when officer is logged out / not present
If this is mock-based for now, wire a clean frontend mock presence state that clearly supports this behavior.
Officer detail panel improvements
Include:
- profile / name
- ID
- status
- rating
- active portal engagement / last seen
- assigned field orders
- admin actions
- polished action layout
Make this area operational and premium, not crowded.
OBJECTIVE 11 — PROFILE PAGE FIX
The profile view needs better finishing.
Requirements
- better layout
- better spacing
- better typography
- better account controls
- use display name from profile for landing greeting
- if empty, fallback to “Admin”
Keep it elegant and uncluttered.
OBJECTIVE 12 — NOTIFICATIONS PAGE / EXPERIENCE
There is currently no proper notification experience.

Implement a proper notification view or notification panel experience that matches the portal.
Requirements
- clean list of operational alerts
- distinguish urgent vs normal
- readable timestamps
- no noisy design
- premium panel design
- if inline panel exists, polish it properly
- no ugly top-right alerts for major confirmations
OBJECTIVE 13 — APPLY SAME QUALITY TO OFFICER AND OTHER PORTALS
Do not stop at the current head portal.

Propagate the same polish system across:
- Head of Department portal
- Officer portal
- Admin portal
- other department portals using their approved color palettes
The structure can stay role-specific, but the polish system, motion language, spacing logic, and visual quality must be consistent.
COPY / MICROCOPY RULES
All UI copy must be:
- concise
- human
- operational
- not generic AI text
- not overexplained
Avoid buzzwords.

Good examples:
- “Operational desk”
- “Cases awaiting assignment”
- “Submitted evidence”
- “Awaiting supervisory proof review”
- “Assigned field orders”
- “Verified closures”
- “Resolution approved and recorded”
Bad examples:
- verbose corporate filler
- generic AI marketing text
- unnatural robotic labels
TECHNICAL RULES
1. Preserve route structure unless absolutely necessary.
2. Preserve working functionality.
3. Do not add paid dependencies.
4. Prefer lightweight solutions.
5. If you add a map, use a free implementation only.
6. Keep performance solid.
7. Avoid laggy hover logic or heavy animations.
8. Avoid CSS duplication and dead styles.
9. Refactor only where beneficial.
10. Keep component architecture clean.
MANDATORY BROWSER QA
You must verify with real browser testing and capture screenshots for:
- desktop
- tablet
- 390px mobile
- 320px mobile
Verify at minimum:
1. Landing closed state
2. Landing expanded navbar
3. Dashboard
4. Complaints list
5. Complaint detail
6. Assignment page
7. Assignment success dialog
8. Verification queue
9. Verification detail
10. Verification completion dialog
11. Officers overview
12. Officer detail panel
13. Profile page
14. Notifications page/panel
Also verify:
- no overflow
- no clipping
- no navbar flicker
- no hover collapse bug
- filter changes visibly update dashboard data
- Active/Offline state rendering works
- landing display name fallback works
GIT CHECKPOINT RULES
After implementation:
1. run tests if available
2. run lint if available
3. run typecheck if available
4. run build if available
5. capture screenshots
6. summarize changes clearly
7. commit on feature branch
8. push to remote
Do not claim success without evidence.
FINAL REPORT FORMAT
At the end, provide:
1. What changed
List major frontend improvements by screen.
2. Files changed
List all important files.
3. Theme system
Explain where the shared color/theme logic now lives.
4. Motion fixes
Explain how the navbar flicker/delay problem was fixed.
5. Functional fixes
Explain:
- dashboard filters
- display name fallback
- Active/Offline state
- custom completion date
- centered success/approval dialogs
- complaint evidence/map section
6. QA proof
List screenshot coverage and resolutions tested.
7. Verification commands run
Show test / lint / build / typecheck commands and results.
8. Git status
Show branch, commit hash, and whether pushed successfully.
FINAL INSTRUCTION
Begin immediately.

Do not produce another planning-only answer.
Do not rewrite the requirements back to me.
Do not do backend work first.
Implement the frontend polish directly inside the existing repo, verify visually in browser, and deliver a finished result with screenshots and Git-safe completion.import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_SCREENSHOT_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/staff_auth_phase2';
const ARTIFACT_SCREENSHOT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/staff_auth_phase2';

if (!fs.existsSync(WORKTREE_SCREENSHOT_DIR)) fs.mkdirSync(WORKTREE_SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_SCREENSHOT_DIR)) fs.mkdirSync(ARTIFACT_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for Phase 2 Visual QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_phase2_qa_' + Date.now());
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${tempDir}`,
    'http://localhost:5178/admin/login',
  ], { detached: true, stdio: 'ignore' });

  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9232/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9232');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9232/json/list');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let reqId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('DOM.enable');

  // Seed sample requests and memberships in browser localStorage
  await send('Page.navigate', { url: 'http://localhost:5178/admin/login' });
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Seed Admin Session
        const adminSession = {
          userId: 'admin-seed-uuid-001',
          email: 'admin@example.org',
          fullName: 'Syed Farooq (Provincial Inspector)',
          role: 'main_admin',
          authenticatedAt: new Date().toISOString()
        };
        sessionStorage.setItem('awaaz_admin_session_v2', JSON.stringify(adminSession));

        // Seed DB
        const now = new Date().toISOString();
        const db = {
          departments: [
            { id: 'kwsc', name: 'Karachi Water & Sewerage Corporation (KW&SC)', name_urdu: 'کراچی واٹر اینڈ سیوریج کارپوریشن', code: 'KWSC', is_active: true },
            { id: 'kelectric', name: 'K-Electric (Infrastructure & Distribution)', name_urdu: 'کے الیکٹرک (انفراسٹرکچر و تقسیم)', code: 'KE', is_active: true },
            { id: 'sswmb', name: 'Sindh Solid Waste Management Board (SSWMB)', name_urdu: 'سندھ سالڈ ویسٹ مینجمنٹ بورڈ', code: 'SSWMB', is_active: true },
            { id: 'ssgc', name: 'Sui Southern Gas Company (SSGC)', name_urdu: 'سوئی سدرن گیس کمپنی', code: 'SSGC', is_active: true },
            { id: 'kmc', name: 'Karachi Metropolitan Corporation (KMC / DMCs)', name_urdu: 'کراچی میٹروپولیٹن کارپوریشن', code: 'KMC', is_active: true },
            { id: 'sbca', name: 'Sindh Building Control Authority (SBCA)', name_urdu: 'سندھ بلڈنگ کنٹرول اتھارٹی', code: 'SBCA', is_active: true }
          ],
          profiles: [
            { id: 'admin-seed-uuid-001', full_name: 'Syed Farooq', email: 'admin@example.org', role: 'main_admin' },
            { id: 'user-001', full_name: 'Tariq Mansoor', email: 'tariq.mansoor@ke.com.pk', role: 'citizen' },
            { id: 'user-002', full_name: 'Asim Raza', email: 'asim.raza@kwsc.gov.pk', role: 'citizen' },
            { id: 'user-003', full_name: 'Kamran Akram', email: 'kamran.akram@sswmb.gos.pk', role: 'department_staff' },
            { id: 'user-004', full_name: 'Rashid Minhas', email: 'rashid.minhas@ssgc.com.pk', role: 'department_staff' }
          ],
          credentials: [
            { userId: 'admin-seed-uuid-001', email: 'admin@example.org', passwordHash: 'sha256_emulated_QWRtaW5QYXNzMTIzIQ==' },
            { userId: 'user-001', email: 'tariq.mansoor@ke.com.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-002', email: 'asim.raza@kwsc.gov.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-003', email: 'kamran.akram@sswmb.gos.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' },
            { userId: 'user-004', email: 'rashid.minhas@ssgc.com.pk', passwordHash: 'sha256_emulated_cGFzc3dvcmQ=' }
          ],
          requests: [
            { id: 'req-001', user_id: 'user-001', department_id: 'kelectric', full_name: 'Tariq Mansoor', work_email: 'tariq.mansoor@ke.com.pk', status: 'pending', created_at: now, updated_at: now },
            { id: 'req-002', user_id: 'user-002', department_id: 'kwsc', full_name: 'Asim Raza', work_email: 'asim.raza@kwsc.gov.pk', status: 'pending', created_at: now, updated_at: now },
            { id: 'req-003', user_id: 'user-003', department_id: 'sswmb', full_name: 'Kamran Akram', work_email: 'kamran.akram@sswmb.gos.pk', status: 'approved', created_at: now, updated_at: now },
            { id: 'req-004', user_id: 'user-004', department_id: 'ssgc', full_name: 'Rashid Minhas', work_email: 'rashid.minhas@ssgc.com.pk', status: 'approved', created_at: now, updated_at: now }
          ],
          memberships: [
            { id: 'mem-001', user_id: 'user-003', department_id: 'sswmb', status: 'active', approved_by: 'admin-seed-uuid-001', approved_at: now, created_at: now, updated_at: now },
            { id: 'mem-002', user_id: 'user-004', department_id: 'ssgc', status: 'active', approved_by: 'admin-seed-uuid-001', approved_at: now, created_at: now, updated_at: now }
          ],
          auditLogs: []
        };
        localStorage.setItem('awaaz_local_supabase_db_v2', JSON.stringify(db));
      })();
    `
  });
  await sleep(500);

  async function capture(filename, width, height, url, prepareFn = null) {
    console.log(`Capturing ${filename} (${width}x${height}) at ${url}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 600,
    });

    await send('Page.navigate', { url });
    await sleep(1500);

    if (prepareFn) {
      await prepareFn(send);
      await sleep(600);
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(WORKTREE_SCREENSHOT_DIR, filename), buffer);
    fs.writeFileSync(path.join(ARTIFACT_SCREENSHOT_DIR, filename), buffer);
    console.log(`Saved ${filename}`);
  }

  // 1. Admin Requests Desktop 1440x1000 (Figma Frame 35:1041)
  await capture('09_admin_requests_desktop_1440.png', 1440, 1000, 'http://localhost:5178/admin/requests');

  // 2. Admin Requests Mobile 390x844
  await capture('10_admin_requests_mobile_390.png', 390, 844, 'http://localhost:5178/admin/requests');

  // 3. Admin Requests Urdu RTL 1440x1000
  await capture('11_admin_requests_urdu_rtl_1440.png', 1440, 1000, 'http://localhost:5178/admin/requests', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('اردو'));
        if (btn) btn.click();
      `
    });
  });

  // 4. Admin Access Management Desktop 1440x1000 (Figma Frame 35:1105)
  await capture('12_admin_access_desktop_1440.png', 1440, 1000, 'http://localhost:5178/admin/access', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English'));
        if (enBtn) enBtn.click();
      `
    });
  });

  // 5. Admin Access Revocation Modal Open 1440x1000 (Figma Frame 35:1154 / 35:1840)
  await capture('13_admin_access_revoke_modal_1440.png', 1440, 1000, 'http://localhost:5178/admin/access', async (s) => {
    await s('Runtime.evaluate', {
      expression: `
        // Ensure in English first
        const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English'));
        if (enBtn) enBtn.click();

        // Click first revoke button
        const revokeBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Revoke access') || b.textContent.includes('رسائی منسوخ کریں')
        );
        if (revokeBtn) revokeBtn.click();
      `
    });
  });

  // 6. Department Login displaying Immediate Revocation Notice (Real-time lockout banner)
  await capture('14_department_revoked_notice_1440.png', 1440, 1000, 'http://localhost:5178/department/login?revoked=true&reason=Staff%20transferred%20out%20of%20municipal%20division');

  console.log('All Phase 2 screenshots successfully captured!');
  ws.close();
  proc.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Phase 2 Visual QA Error:', err);
  process.exit(1);
});
