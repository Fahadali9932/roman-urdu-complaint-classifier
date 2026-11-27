import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9897',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--mute-audio',
  ]);

  await sleep(2000);

  const targetsRes = await fetch('http://127.0.0.1:9897/json');
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

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

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
        url: window.location.href,
        hasHeader: !!el,
        isExpanded,
        state,
        surfaceWidth: sRect ? sRect.width : 0,
        surfaceHeight: sRect ? sRect.height : 0,
        surfaceLeft: sRect ? sRect.left : 0,
        surfaceRight: sRect ? sRect.right : 0,
        surfaceTop: sRect ? sRect.top : 0,
        surfaceBottom: sRect ? sRect.bottom : 0,
        pathD: d.substring(0, 45) + '...',
      };
    })()`);
  }

  console.log('Navigating and authenticating as HOD...');
  await send('Page.navigate', { url: 'http://localhost:5173/department' });
  await sleep(800);
  await evaluate(`(() => {
    sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
      departmentId: 'kmc',
      departmentCode: 'KMC',
      departmentName: 'Karachi Metropolitan Corporation',
      username: 'roads-01',
      displayName: 'Engr. Tariq Mahmood',
      userId: 'staff-kmc-demo-01',
      staffPosition: 'head',
      authenticatedAt: new Date().toISOString()
    }));
    localStorage.setItem('awaaz_display_name_staff-kmc-demo-01', 'Engr. Tariq Mahmood');
    window.location.href = '/department';
  })()`);
  await sleep(2000);

  console.log('\n--- BASELINE INITIAL STATE ---');
  console.log(await checkNav());

  // Test 1: Hover over brand label (top left: x=60, y=32)
  console.log('\n--- TEST 1: Pointer at Top-Left Brand Label (x: 60, y: 32) ---');
  await moveMouse(60, 32);
  await sleep(200);
  console.log('Result at Brand Label:', await checkNav());

  // Test 2: Hover over Right Header Strip (x: 1380, y: 32)
  console.log('\n--- TEST 2: Pointer at Right Header Strip (x: 1380, y: 32) ---');
  await moveMouse(1380, 32);
  await sleep(200);
  console.log('Result at Header Right Strip:', await checkNav());

  // Test 3: Hover over ceiling edge outside notch (x: 250, y: 3)
  console.log('\n--- TEST 3: Pointer at Top Ceiling Edge outside notch (x: 250, y: 3) ---');
  await moveMouse(250, 3);
  await sleep(200);
  console.log('Result at Ceiling Edge:', await checkNav());

  // Test 4: Move into central notch to open legitimately
  console.log('\n--- TEST 4: Pointer at Center Notch (x: 720, y: 20) ---');
  await moveMouse(720, 20);
  await sleep(500);
  console.log('Result at Center Notch (Legitimate Open):', await checkNav());

  // Test 5: Move pointer to (x: 400, y: 20) while open
  console.log('\n--- TEST 5: Move to (x: 400, y: 20) while open ---');
  await moveMouse(400, 20);
  await sleep(500);
  console.log('Result at (400, 20):', await checkNav());

  // Test 6: Move pointer to (x: 250, y: 20) which is OUTSIDE expanded notch
  console.log('\n--- TEST 6: Move to (x: 250, y: 20) which is OUTSIDE expanded notch ---');
  await moveMouse(250, 20);
  await sleep(300);
  console.log('Result at (250, 20) after 300ms:', await checkNav());

  // Test 7: Move pointer to (x: 720, y: 400) and wait stationary
  console.log('\n--- TEST 7: Move to (x: 720, y: 400) and wait 1s ---');
  await moveMouse(720, 400);
  await sleep(1000);
  console.log('Result at (720, 400) after 1s:', await checkNav());

  ws.close();
  chromeProc.kill();
  console.log('\n--- REPRODUCTION SCRIPT FINISHED ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
