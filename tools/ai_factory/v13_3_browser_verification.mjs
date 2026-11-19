import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const screenshotsDir = "D:\\RomanUrdu_ComplaintClassifier_staff_auth\\docs\\v11\\screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const chromeUserData = "C:\\Users\\Annihilation\\.chrome-test-v13-3";
if (!fs.existsSync(chromeUserData)) {
  fs.mkdirSync(chromeUserData, { recursive: true });
}

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeProcess = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=9222",
  `--user-data-dir=${chromeUserData}`,
  "--window-size=1280,900",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
]);

console.log("Chrome launched with PID:", chromeProcess.pid);
await new Promise((resolve) => setTimeout(resolve, 1500));

try {
  const versionRes = await fetch("http://127.0.0.1:9222/json/version");
  const version = await versionRes.json();
  console.log("Connected to Chrome:", version["User-Agent"]);

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let id = 1;
  const callbacks = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const pageRes = await fetch("http://127.0.0.1:9222/json");
  const pages = await pageRes.json();
  const target = pages.find((p) => p.id === targetId);

  const pageWs = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (pageWs.onopen = resolve));

  let pageId = 1;
  const pageCallbacks = new Map();
  function pageSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = pageId++;
      pageCallbacks.set(msgId, { resolve, reject });
      pageWs.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const consoleLogs = [];
  const exceptions = [];

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pageCallbacks.has(msg.id)) {
      const { resolve, reject } = pageCallbacks.get(msg.id);
      pageCallbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === "Runtime.consoleAPICalled") {
      consoleLogs.push({ type: msg.params.type, args: msg.params.args.map((a) => a.value) });
    } else if (msg.method === "Runtime.exceptionThrown") {
      exceptions.push(msg.params.exceptionDetails);
    }
  };

  await pageSend("Page.enable");
  await pageSend("DOM.enable");
  await pageSend("Runtime.enable");

  console.log("\n=================================");
  console.log("V13.3 REAL BROWSER VERIFICATION");
  console.log("=================================");

  // 1. Navigate to /submit
  await pageSend("Page.navigate", { url: "http://localhost:5173/submit" });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Enable Local AI Test Mode & Select Candidate
  const setupTestMode = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const checkbox = document.querySelector('input[aria-label="Toggle Local AI Test Mode"]');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }
      const select = document.querySelector('select');
      if (select) {
        select.value = 'v13_2_candidate';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { checkbox: Boolean(checkbox), select: Boolean(select) };
    })()`,
  });
  console.log("Test mode setup:", JSON.stringify(setupTestMode.result.value));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 3. Click Preset to Populate Form & Jump to Step 3
  const applyPreset = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const presetBtn = btns.find(b => b.textContent.includes('Basia Bungalows') || b.textContent.includes('Gulshan') || b.textContent.includes('Electricity'));
      if (presetBtn) {
        presetBtn.click();
        return 'CLICKED_PRESET';
      }
      return 'PRESET_NOT_FOUND';
    })()`,
  });
  console.log("Preset click action:", applyPreset.result.value);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 4. Fill Reproduction Complaint in Textarea
  const reproductionText = "Assalamualaikum hamare area mein 10 din se bejli ni arhi. Tranforma khrab hai aur hamari gali ki rod bhi tut gai hai. Barish hoti hai to bohot kichar hota hai. Hum shikayat kar kar ke thak gaye hain.";
  const fillText = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const textVal = ${JSON.stringify(reproductionText)};
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, textVal);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, len: textarea.value.length, val: textarea.value.slice(0, 50) };
      }
      return { ok: false };
    })()`,
  });
  console.log("Reproduction text populated:", JSON.stringify(fillText.result.value));
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 5. Submit Complaint
  const submitAction = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Submit') || b.textContent.includes('شکایت درج')
      );
      if (submitBtn) {
        submitBtn.click();
        return 'CLICKED_SUBMIT';
      }
      return 'SUBMIT_BTN_NOT_FOUND';
    })()`,
  });
  console.log("Submit action:", submitAction.result.value);
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 7. Verify Modal Data
  const modalInspection = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { isOpen: false };
      const text = modal.innerText;
      return {
        isOpen: true,
        hasKElectric: text.includes('K-ELECTRIC') || text.includes('K-Electric'),
        hasKMC: text.includes('KMC'),
        hasSSWMB: text.includes('SSWMB'),
        hasTruthfulHeading: text.includes('Electricity Outage') && text.includes('Damaged Road'),
        hasDuration: text.includes('ten days') || text.includes('Past 10 Days') || text.includes('10 din'),
        hasAuditTable: text.includes('Department Decisions & Policy Audit Trace'),
        hasNoContradiction: !text.includes('[SUPPRESSED] KMC'),
        hasFormLocationAttribution: text.includes('INCOMPLETE_PUBLIC_LOCATION') || text.includes('Form Location') || text.includes('Gulshan-e-Iqbal'),
        textSample: text.slice(0, 800)
      };
    })()`,
  });

  console.log("\n=================================");
  console.log("MODAL INSPECTION RESULT:");
  console.log(JSON.stringify(modalInspection.result.value, null, 2));
  console.log("=================================\n");

  // 8. Capture screenshots across 4 responsive viewports
  const viewports = [
    { name: "v13_3_01_desktop_1280.png", width: 1280, height: 900, label: "Desktop (1280px)" },
    { name: "v13_3_02_tablet_768.png", width: 768, height: 1024, label: "Tablet (768px)" },
    { name: "v13_3_03_mobile_390.png", width: 390, height: 844, label: "Mobile (390px)" },
    { name: "v13_3_04_small_mobile_320.png", width: 320, height: 600, label: "Small Mobile (320px)" },
  ];

  for (const vp of viewports) {
    await pageSend("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await new Promise((resolve) => setTimeout(resolve, 800));

    const shot = await pageSend("Page.captureScreenshot", { format: "png" });
    const shotPath = path.join(screenshotsDir, vp.name);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
    console.log(`Captured screenshot for ${vp.label} -> ${shotPath}`);
  }

  console.log("\n=================================");
  console.log(`Uncaught Console Exceptions: ${exceptions.length}`);
  if (exceptions.length > 0) {
    console.error("Exceptions:", JSON.stringify(exceptions, null, 2));
  } else {
    console.log("SUCCESS: 0 Uncaught Exceptions in real Chrome browser across all viewports!");
  }

} catch (err) {
  console.error("BROWSER VERIFICATION ERROR:", err);
} finally {
  chromeProcess.kill();
  console.log("Chrome terminated.");
}
