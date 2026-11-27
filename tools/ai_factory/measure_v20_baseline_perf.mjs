import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9451;
const TEMP_USER_DATA = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_v20_perf_' + Date.now());

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('Launching headless Chrome for baseline performance profiling...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ], { detached: true });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome DevTools endpoint.');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result);
      pending.delete(d.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((r) => {
      const id = msgId++;
      pending.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await send('Page.navigate', { url: 'http://localhost:5173/department' });
  await sleep(1000);

  // Authenticate HOD
  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('awaaz_department_auth_session_v1', JSON.stringify({
        departmentId: 'kmc',
        departmentCode: 'KMC',
        departmentName: 'Karachi Metropolitan Corporation',
        username: 'roads-01',
        userId: 'staff-kmc-demo-01',
        staffPosition: 'head',
        authenticatedAt: new Date().toISOString()
      }));
      window.location.href = '/department';
    `,
  });
  await sleep(2500);

  // Measure Navigation Morphing Baseline
  console.log('Measuring Navigation Morphing performance...');
  const navPerfResult = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      new Promise((resolve) => {
        const notch = document.querySelector('.v20-notch-trigger-btn') || document.querySelector('#nav-toggle') || document.querySelector('.v20-notch-shell');
        if (!notch) {
          resolve({ error: 'Notch not found' });
          return;
        }

        const frameDeltas = [];
        let lastTime = performance.now();
        let active = true;

        function recordFrame(now) {
          if (!active) return;
          frameDeltas.push(now - lastTime);
          lastTime = now;
          requestAnimationFrame(recordFrame);
        }

        const startTime = performance.now();
        requestAnimationFrame(recordFrame);

        // Click to expand
        notch.click();

        setTimeout(() => {
          // Click to collapse
          notch.click();

          setTimeout(() => {
            active = false;
            const totalDuration = performance.now() - startTime;
            frameDeltas.sort((a, b) => a - b);
            const median = frameDeltas[Math.floor(frameDeltas.length / 2)] || 0;
            const p95 = frameDeltas[Math.floor(frameDeltas.length * 0.95)] || 0;
            const max = frameDeltas[frameDeltas.length - 1] || 0;
            const droppedFrames = frameDeltas.filter((d) => d > 16.7).length;
            const severeDropped = frameDeltas.filter((d) => d > 33.3).length;
            const avgFps = frameDeltas.length / (totalDuration / 1000);

            resolve({
              sampleCount: frameDeltas.length,
              totalDurationMs: totalDuration,
              medianFrameMs: median,
              p95FrameMs: p95,
              maxFrameMs: max,
              droppedFrames,
              severeDropped,
              avgFps
            });
          }, 700);
        }, 700);
      });
    `,
  });

  // Switch to Complaints Tab
  console.log('Switching to Complaints tab for scroll profiling...');
  await send('Runtime.evaluate', {
    expression: `
      const tab = document.querySelector('[data-tab-id="complaints"]');
      if (tab) tab.click();
    `,
  });
  await sleep(1500);

  // Measure Scroll Stacking Performance Baseline
  console.log('Measuring Complaint Scroll performance (synthetic scroll events)...');
  const scrollPerfResult = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      new Promise((resolve) => {
        const frameDeltas = [];
        let lastTime = performance.now();
        let active = true;

        function recordFrame(now) {
          if (!active) return;
          frameDeltas.push(now - lastTime);
          lastTime = now;
          requestAnimationFrame(recordFrame);
        }

        const startTime = performance.now();
        requestAnimationFrame(recordFrame);

        // Simulate continuous scrolling up and down
        let scrollY = 0;
        let direction = 1;
        const scrollInterval = setInterval(() => {
          scrollY += direction * 25;
          window.scrollTo(0, scrollY);
          if (scrollY > 600) direction = -1;
          if (scrollY <= 0 && direction === -1) {
            clearInterval(scrollInterval);
            setTimeout(() => {
              active = false;
              const totalDuration = performance.now() - startTime;
              frameDeltas.sort((a, b) => a - b);
              const median = frameDeltas[Math.floor(frameDeltas.length / 2)] || 0;
              const p95 = frameDeltas[Math.floor(frameDeltas.length * 0.95)] || 0;
              const max = frameDeltas[frameDeltas.length - 1] || 0;
              const droppedFrames = frameDeltas.filter((d) => d > 16.7).length;
              const severeDropped = frameDeltas.filter((d) => d > 33.3).length;
              const avgFps = frameDeltas.length / (totalDuration / 1000);

              resolve({
                sampleCount: frameDeltas.length,
                totalDurationMs: totalDuration,
                medianFrameMs: median,
                p95FrameMs: p95,
                maxFrameMs: max,
                droppedFrames,
                severeDropped,
                avgFps
              });
            }, 300);
          }
        }, 16);
      });
    `,
  });

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      chrome: 'Headless Chrome (CDP)',
      viewport: '1440x900',
      hardwareTarget: '60Hz Standard Display (16.7ms budget)'
    },
    navigationMorphingBaseline: navPerfResult?.result?.value || navPerfResult?.value,
    complaintScrollBaseline: scrollPerfResult?.result?.value || scrollPerfResult?.value
  };

  const outPath = path.join('D:\\RomanUrdu_V13_19_Review', 'docs', 'v20_4_baseline_perf.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Baseline Performance Report written to:', outPath);
  console.log(JSON.stringify(report, null, 2));

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error during baseline measurement:', err);
  process.exit(1);
});
