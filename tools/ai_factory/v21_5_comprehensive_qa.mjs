import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Annihilation\\.gemini\\antigravity\\brain\\3caaefa1-3615-4655-86f5-c95c17bc0aa2\\screenshots\\v21_5';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('================================================================');
  console.log('AWAAZ-E-AWAM V21.5 COMPREHENSIVE QA STRESS TEST (TESTS A - F)');
  console.log('================================================================\n');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9899',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9899/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

  async function setViewport(w, h, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile,
    });
    await sleep(300);
  }

  async function capture(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const path = join(OUTPUT_DIR, `${name}.png`);
    writeFileSync(path, buffer);
    console.log(`  [Screenshot] Saved: ${name}.png (${buffer.length} bytes)`);
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression: `JSON.stringify((${expression}))`,
      returnByValue: true,
    });
    const str = res.result?.result?.value;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  async function moveMouse(x, y) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
    });
  }

  async function checkNav() {
    return await evaluate(`(() => {
      const el = document.querySelector('.v20-top-edge-nav-container');
      const isExpanded = el?.classList.contains('open') || el?.classList.contains('state-expanded') || el?.classList.contains('state-opening');
      const state = el?.getAttribute('data-nav-state');
      const surface = document.querySelector('.v20-notch-interactive-surface');
      const sRect = surface ? surface.getBoundingClientRect() : null;
      const path = document.querySelector('#notch');
      const d = path ? path.getAttribute('d') : '';
      return {
        isExpanded: !!isExpanded,
        state: state || 'unknown',
        width: sRect ? Math.round(sRect.width) : 0,
        height: sRect ? Math.round(sRect.height) : 0,
        left: sRect ? Math.round(sRect.left) : 0,
        right: sRect ? Math.round(sRect.right) : 0,
        pathD: d.substring(0, 50),
      };
    })()`);
  }

  async function loginAs(role = 'head', deptCode = 'KMC', deptName = 'Karachi Metropolitan Corporation', deptId = 'kmc', username = 'roads-01') {
    await send('Page.navigate', { url: 'http://localhost:5173/department' });
    await sleep(800);
    await evaluate(`(() => {
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: '${deptId}',
        departmentCode: '${deptCode}',
        departmentName: '${deptName}',
        username: '${username}',
        displayName: 'Engr. Tariq Mahmood',
        userId: '${role === 'head' ? 'staff-kmc-demo-01' : 'off-kmc-01'}',
        staffPosition: '${role}',
        authenticatedAt: new Date().toISOString()
      }));
      localStorage.setItem('awaaz_display_name_staff-kmc-demo-01', 'Engr. Tariq Mahmood');
      window.location.href = '/department';
    })()`);
    await sleep(2000);
  }

  try {
    console.log('Logging in as HOD on Karachi Metropolitan Corporation...');
    await loginAs('head');
    await setViewport(1440, 900);
    await sleep(500);

    // Initial baseline capture
    await capture('v21_5_baseline_collapsed_1440');

    // -------------------------------------------------------------
    // TEST A: POINTER MOVEMENT ACROSS UNRELATED LOCATIONS
    // -------------------------------------------------------------
    console.log('\n--- TEST A: Moving pointer across unrelated regions (Must remain collapsed) ---');
    const testALocations = [
      { name: 'Top-Left Branding', x: 60, y: 32 },
      { name: 'Top-Right Clock', x: 1350, y: 32 },
      { name: 'Theme Toggle Button', x: 1400, y: 32 },
      { name: 'Logout Button', x: 1425, y: 32 },
      { name: 'Header Far Left', x: 200, y: 40 },
      { name: 'Header Far Right', x: 1200, y: 40 },
      { name: 'Top Edge Far Left', x: 150, y: 4 },
      { name: 'Top Edge Far Right', x: 1300, y: 4 },
      { name: 'Hero Greeting Headline', x: 720, y: 160 },
      { name: 'Hero Display Name', x: 720, y: 220 },
      { name: 'Dashboard CTA Button', x: 650, y: 300 },
      { name: 'Complaints CTA Button', x: 790, y: 300 },
      { name: 'Page Center', x: 720, y: 550 },
      { name: 'Bottom-Left Corner', x: 50, y: 850 },
      { name: 'Bottom-Right Corner', x: 1390, y: 850 },
    ];

    let testAFailures = 0;
    for (const loc of testALocations) {
      await moveMouse(loc.x, loc.y);
      await sleep(150);
      const nav = await checkNav();
      const passed = !nav.isExpanded && nav.state === 'collapsed';
      if (!passed) {
        console.error(`  [FAIL] Test A at ${loc.name} (${loc.x}, ${loc.y}):`, nav);
        testAFailures++;
      } else {
        console.log(`  [PASS] Test A at ${loc.name} (${loc.x}, ${loc.y}): collapsed`);
      }
    }
    console.log(`Test A Summary: ${testALocations.length - testAFailures}/${testALocations.length} passed.`);

    // -------------------------------------------------------------
    // TEST B: AUTOMATIC CLOSURE AFTER HOVER EXIT
    // -------------------------------------------------------------
    console.log('\n--- TEST B: Automatic closure from open state to unrelated locations ---');
    let testBFailures = 0;
    const testBTargets = [
      { name: 'Top-Left Branding', x: 60, y: 32 },
      { name: 'Top-Right Clock', x: 1350, y: 32 },
      { name: 'Header Left', x: 200, y: 40 },
      { name: 'Page Center', x: 720, y: 500 },
    ];

    for (const target of testBTargets) {
      // Open legitimately at center notch
      await moveMouse(720, 24);
      await sleep(700);
      let nav = await checkNav();
      if (!nav.isExpanded) {
        console.error('  [FAIL] Failed to open legitimately at (720, 24)');
        testBFailures++;
        continue;
      }
      // Move to target
      await moveMouse(target.x, target.y);
      await sleep(1100); // wait for 75ms grace + closing spring animation to settle
      nav = await checkNav();
      const passed = !nav.isExpanded && nav.state === 'collapsed';
      if (!passed) {
        console.error(`  [FAIL] Test B moving to ${target.name} (${target.x}, ${target.y}):`, nav);
        testBFailures++;
      } else {
        console.log(`  [PASS] Test B moving to ${target.name}: closed smoothly to collapsed (width: ${nav.width}px)`);
      }
    }
    console.log(`Test B Summary: ${testBTargets.length - testBFailures}/${testBTargets.length} passed.`);

    // -------------------------------------------------------------
    // TEST C: STATIONARY POINTER AUTO-COLLAPSE FOR 5 SECONDS
    // -------------------------------------------------------------
    console.log('\n--- TEST C: Stationary pointer outside notch for 5 seconds ---');
    // Open legitimately
    await moveMouse(720, 24);
    await sleep(700);
    let navC = await checkNav();
    console.log('  State after opening at (720, 24):', navC.state, `(width: ${navC.width}px)`);

    // Move to (720, 400) and DO NOT MOVE FOR 5 SECONDS
    await moveMouse(720, 400);
    console.log('  Moved to (720, 400). Waiting 5 seconds stationary...');
    await sleep(1000);
    const navC1s = await checkNav();
    console.log('  State after 1s stationary:', navC1s.state, `(width: ${navC1s.width}px)`);

    await sleep(4000);
    const navC5s = await checkNav();
    console.log('  State after 5s stationary:', navC5s.state, `(width: ${navC5s.width}px)`);
    const testCPassed = !navC5s.isExpanded && navC5s.state === 'collapsed' && navC5s.width === 110;
    console.log(`Test C Result: ${testCPassed ? '[PASS]' : '[FAIL]'}`);

    // -------------------------------------------------------------
    // TEST D: INVISIBLE BOUNDARY DETECTION (OUTSIDE CURVED SHOULDERS)
    // -------------------------------------------------------------
    console.log('\n--- TEST D: Invisible boundary detection outside curved shoulders ---');
    // Open legitimately
    await moveMouse(720, 24);
    await sleep(700);
    let navD = await checkNav();
    const halfWidth = navD.width / 2;
    const leftBoundary = 720 - halfWidth;
    const rightBoundary = 720 + halfWidth;
    const bottomBoundary = navD.height;
    console.log(`  Expanded bounds: left=${leftBoundary}, right=${rightBoundary}, bottom=${bottomBoundary}`);

    // Test point 1: Just outside left shoulder (left - 20px, y: 30)
    await moveMouse(leftBoundary - 20, 30);
    await sleep(1100);
    const navDLeft = await checkNav();
    const passedDLeft = !navDLeft.isExpanded && navDLeft.state === 'collapsed';
    console.log(`  Point outside left shoulder (${leftBoundary - 20}, 30): ${passedDLeft ? '[PASS - closed]' : '[FAIL - kept open]'}`);

    // Reopen and test point 2: Just outside right shoulder (right + 20px, y: 30)
    await moveMouse(720, 24);
    await sleep(700);
    await moveMouse(rightBoundary + 20, 30);
    await sleep(1100);
    const navDRight = await checkNav();
    const passedDRight = !navDRight.isExpanded && navDRight.state === 'collapsed';
    console.log(`  Point outside right shoulder (${rightBoundary + 20}, 30): ${passedDRight ? '[PASS - closed]' : '[FAIL - kept open]'}`);

    // Reopen and test point 3: Just below bottom notch edge (y: bottom + 30px)
    await moveMouse(720, 24);
    await sleep(700);
    await moveMouse(720, bottomBoundary + 30);
    await sleep(1100);
    const navDBottom = await checkNav();
    const passedDBottom = !navDBottom.isExpanded && navDBottom.state === 'collapsed';
    console.log(`  Point below bottom edge (720, ${bottomBoundary + 30}): ${passedDBottom ? '[PASS - closed]' : '[FAIL - kept open]'}`);

    // -------------------------------------------------------------
    // TEST E: RAPID INTERACTION, INTERRUPTIONS & DISMISSALS
    // -------------------------------------------------------------
    console.log('\n--- TEST E: Rapid interaction, interruptions, Escape & Close click ---');
    // E1: Rapid enter & exit during opening
    await moveMouse(720, 24);
    await sleep(150); // interrupt opening mid-flight
    await moveMouse(720, 500);
    await sleep(1100);
    let navE1 = await checkNav();
    console.log(`  E1 (Interrupt opening): ${navE1.state === 'collapsed' ? '[PASS]' : '[FAIL]'} (state: ${navE1.state})`);

    // E2: Rapid re-enter during closing
    await moveMouse(720, 24);
    await sleep(700);
    await moveMouse(720, 500);
    await sleep(120); // interrupt closing mid-flight
    await moveMouse(720, 24);
    await sleep(700);
    let navE2 = await checkNav();
    console.log(`  E2 (Re-enter during closing): ${navE2.isExpanded ? '[PASS - reopened smoothly]' : '[FAIL]'}`);

    // E3: Escape key while hovered
    await evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    })()`);
    await sleep(1100);
    let navE3 = await checkNav();
    console.log(`  E3 (Escape while hovered): ${navE3.state === 'collapsed' ? '[PASS - closed and stayed closed]' : '[FAIL]'} (state: ${navE3.state})`);

    // E4: Click close button while hovered
    // First move out to reset manual close flag, then reopen
    await moveMouse(720, 500);
    await sleep(250);
    await moveMouse(720, 24);
    await sleep(700);
    // Click toggle button (#nav-toggle)
    await evaluate(`document.getElementById('nav-toggle')?.click()`);
    await sleep(1100);
    let navE4 = await checkNav();
    console.log(`  E4 (Click close button): ${navE4.state === 'collapsed' ? '[PASS - closed and stayed closed]' : '[FAIL]'} (state: ${navE4.state})`);

    // E5: Destination selection closes navbar
    await moveMouse(720, 500);
    await sleep(250);
    await moveMouse(720, 24);
    await sleep(700);
    await evaluate(`document.querySelector('[data-tab-id="dashboard"]')?.click()`);
    await sleep(1100);
    let navE5 = await checkNav();
    console.log(`  E5 (Destination select): ${navE5.state === 'collapsed' ? '[PASS - closed on navigation]' : '[FAIL]'} (state: ${navE5.state})`);

    // -------------------------------------------------------------
    // TEST F: 100 RANDOMIZED POINTER INTERACTION SEQUENCES
    // -------------------------------------------------------------
    console.log('\n--- TEST F: 100 Randomized Pointer Interaction Sequences ---');
    let stuckStates = 0;
    let falseOpens = 0;

    for (let i = 1; i <= 100; i++) {
      const mode = i % 2 === 0 ? 'hover-cycle' : 'random-unrelated';

      if (mode === 'hover-cycle') {
        // Random enter position inside compact notch (cx=720, x in [675, 765], y in [10, 42])
        const entryX = 675 + Math.floor(Math.random() * 90);
        const entryY = 10 + Math.floor(Math.random() * 32);
        const hoverTime = 250 + Math.floor(Math.random() * 400);

        await moveMouse(entryX, entryY);
        await sleep(hoverTime);

        // Random exit position anywhere outside the notch
        const exitAngle = Math.random() * Math.PI; // downwards
        const exitDist = 180 + Math.floor(Math.random() * 380);
        const exitX = Math.max(50, Math.min(1390, Math.floor(720 + Math.cos(exitAngle) * exitDist)));
        const exitY = Math.max(130, Math.min(850, Math.floor(50 + Math.sin(exitAngle) * exitDist)));

        await moveMouse(exitX, exitY);
        // Wait 1100ms for exit grace + closing spring animation to settle
        await sleep(1100);

        // Check if settled cleanly to collapsed
        const nav = await checkNav();
        if (nav.isExpanded || nav.state !== 'collapsed') {
          console.error(`  [FAIL] Sequence #${i}: Navbar stuck in state=${nav.state}, isExpanded=${nav.isExpanded} at exit (${exitX}, ${exitY})`);
          stuckStates++;
        }
      } else {
        // Pointer moves through 3-5 random unrelated positions across the screen
        const steps = 3 + Math.floor(Math.random() * 3);
        let openedOnUnrelated = false;
        for (let s = 0; s < steps; s++) {
          const region = Math.random();
          let rx = 100;
          let ry = 300;
          if (region < 0.25) {
            rx = 50 + Math.floor(Math.random() * 250);
            ry = 15 + Math.floor(Math.random() * 40);
          } else if (region < 0.5) {
            rx = 1150 + Math.floor(Math.random() * 250);
            ry = 15 + Math.floor(Math.random() * 40);
          } else {
            rx = 100 + Math.floor(Math.random() * 1240);
            ry = 150 + Math.floor(Math.random() * 650);
          }
          await moveMouse(rx, ry);
          await sleep(100);
          const nav = await checkNav();
          if (nav.isExpanded) {
            openedOnUnrelated = true;
          }
        }
        if (openedOnUnrelated) {
          console.error(`  [FAIL] Sequence #${i}: Opened unexpectedly on unrelated path!`);
          falseOpens++;
        }
      }

      if (i % 25 === 0) {
        console.log(`  Completed ${i}/100 randomized sequences... (Stuck states: ${stuckStates}, False opens: ${falseOpens})`);
      }
    }

    console.log(`\n================================================================`);
    console.log(`TEST F SUMMARY: 100 Randomized Sequences Completed.`);
    console.log(`  Stuck States: ${stuckStates} (Target: 0)`);
    console.log(`  False Opens:  ${falseOpens} (Target: 0)`);
    console.log(`================================================================\n`);

    // -------------------------------------------------------------
    // RESPONSIVE SCREENSHOT CAPTURES ACROSS VIEWPORTS & THEMES
    // -------------------------------------------------------------
    console.log('\n--- Capturing Multi-Viewport Screenshots for Evidence ---');
    const viewports = [
      { name: 'desktop_1920', w: 1920, h: 1080, mobile: false },
      { name: 'desktop_1536', w: 1536, h: 864, mobile: false },
      { name: 'desktop_1440', w: 1440, h: 900, mobile: false },
      { name: 'desktop_1366', w: 1366, h: 768, mobile: false },
      { name: 'tablet_768', w: 768, h: 1024, mobile: true },
      { name: 'mobile_390', w: 390, h: 844, mobile: true },
      { name: 'mobile_320', w: 320, h: 568, mobile: true },
    ];

    for (const vp of viewports) {
      await setViewport(vp.w, vp.h, vp.mobile);
      await sleep(300);

      // Collapsed state
      await capture(`v21_5_collapsed_${vp.name}`);

      // Expanded state (click toggle)
      await evaluate(`document.getElementById('nav-toggle')?.click()`);
      await sleep(750);
      await capture(`v21_5_expanded_${vp.name}`);

      // Close back
      await evaluate(`document.getElementById('nav-toggle')?.click()`);
      await sleep(750);
    }

    // Capture Light Mode variants on Desktop 1920 and Mobile 390
    await setViewport(1920, 1080);
    await evaluate(`document.getElementById('theme')?.click()`);
    await sleep(400);
    await capture('v21_5_light_mode_collapsed_1920');

    await evaluate(`document.getElementById('nav-toggle')?.click()`);
    await sleep(750);
    await capture('v21_5_light_mode_expanded_1920');

    await setViewport(390, 844, true);
    await sleep(300);
    await capture('v21_5_light_mode_expanded_390');

    // -------------------------------------------------------------
    // MOTION SEQUENCE CAPTURE (VISUAL PROGRESSION AT 60 FPS)
    // -------------------------------------------------------------
    console.log('\n--- Capturing Motion Progression Frames ---');
    await setViewport(1440, 900);
    await sleep(300);
    // Frame 0: Collapsed
    await capture('v21_5_motion_frame_01_collapsed');
    // Open and capture 3 in-flight expansion frames
    await moveMouse(720, 24);
    await sleep(120);
    await capture('v21_5_motion_frame_02_expanding_early');
    await sleep(150);
    await capture('v21_5_motion_frame_03_expanding_mid');
    await sleep(400);
    await capture('v21_5_motion_frame_04_fully_expanded');
    // Move outside and capture 3 in-flight closing frames
    await moveMouse(720, 450);
    await sleep(150);
    await capture('v21_5_motion_frame_05_closing_early');
    await sleep(150);
    await capture('v21_5_motion_frame_06_closing_mid');
    await sleep(650);
    await capture('v21_5_motion_frame_07_fully_collapsed_settled');

    console.log('\n================================================================');
    console.log('ALL COMPREHENSIVE QA STRESS TESTS AND SCREENSHOTS COMPLETE!');
    console.log('================================================================');

  } catch (err) {
    console.error('QA Test Failure:', err);
  } finally {
    ws.close();
    chromeProc.kill();
  }
}

run().catch(console.error);
