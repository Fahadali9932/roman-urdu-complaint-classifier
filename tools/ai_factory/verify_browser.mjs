import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const screenshotsDir = "D:\\RomanUrdu_ComplaintClassifier_staff_auth\\docs\\v11\\screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const chromeUserData = "C:\\Users\\Annihilation\\.chrome-test-v13-2";
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

  // TEST 1: Homepage http://localhost:5173/
  console.log("\n=================================");
  console.log("TEST 1: Testing http://localhost:5173/");
  console.log("=================================");

  await pageSend("Page.navigate", { url: "http://localhost:5173/" });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const homeRoot = await pageSend("Runtime.evaluate", {
    expression: "document.getElementById('root')?.innerHTML?.length || 0",
  });
  console.log("Homepage #root length:", homeRoot.result.value);

  const homeScreenshot = await pageSend("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(screenshotsDir, "homepage.png"), Buffer.from(homeScreenshot.data, "base64"));
  console.log("Saved homepage screenshot.");

  // TEST 2: Submit page http://localhost:5173/submit
  console.log("\n=================================");
  console.log("TEST 2: Testing http://localhost:5173/submit");
  console.log("=================================");

  await pageSend("Page.navigate", { url: "http://localhost:5173/submit" });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // TEST 3: Toggle Local AI Test Mode
  console.log("\n=================================");
  console.log("TEST 3: Enabling Local AI Test Mode & Inspecting Candidate Selector");
  console.log("=================================");

  const toggleResult = await pageSend("Runtime.evaluate", {
    expression: `(() => {
      const checkbox = document.querySelector('input[aria-label="Toggle Local AI Test Mode"]');
      if (checkbox) {
        checkbox.click();
        return 'TOGGLED_CHECKBOX';
      }
      return 'CHECKBOX_NOT_FOUND';
    })()`,
  });
  console.log("Toggle action result:", toggleResult.result.value);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Inspect Model Candidate Dropdown
  const selectInfo = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const select = document.querySelector('select');
      if (select) {
        return {
          currentValue: select.value,
          options: Array.from(select.options).map(o => ({ value: o.value, text: o.text }))
        };
      }
      return null;
    })()`,
  });
  console.log("Model Candidate Selector Info:", JSON.stringify(selectInfo.result.value, null, 2));

  // Select V13.2 Candidate
  const switchCandidate = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const select = document.querySelector('select');
      if (select) {
        select.value = 'v13_2_candidate';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return 'SWITCHED_TO_V13_2';
      }
      return 'SELECT_NOT_FOUND';
    })()`,
  });
  console.log("Candidate switch action:", switchCandidate.result.value);
  await new Promise((resolve) => setTimeout(resolve, 500));

  // TEST 4: Apply Preset 7 (Basia Bungalows 3-Dept)
  console.log("\n=================================");
  console.log("TEST 4: Testing Independent Electricity and Road (Preset 7 - Basia Bungalows)");
  console.log("=================================");

  const applyPreset = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const presetBtn = btns.find(b => b.textContent.includes('Basia Bungalows'));
      if (presetBtn) {
        presetBtn.click();
        return 'CLICKED_PRESET_7';
      }
      return 'PRESET_BTN_NOT_FOUND';
    })()`,
  });
  console.log("Preset click action:", applyPreset.result.value);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check form state after preset
  const formStage = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      return {
        stage: document.body.innerText.includes('Stage 3') || document.body.innerText.includes('COMPLAINT DESCRIPTION') ? 3 : 'other',
        textSample: textarea ? textarea.value.slice(0, 100) : 'NO_TEXTAREA'
      };
    })()`,
  });
  console.log("Form stage & populated text:", JSON.stringify(formStage.result.value, null, 2));

  // Click Submit Complaint / Test Live Classification
  const submitAction = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.textContent.includes('Submit') || b.textContent.includes('Test Live')
      );
      if (submitBtn) {
        submitBtn.click();
        return 'CLICKED_SUBMIT';
      }
      return 'SUBMIT_BTN_NOT_FOUND';
    })()`,
  });
  console.log("Submit button click:", submitAction.result.value);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check Analysis Result Modal or Clarification Card
  const modalData = await pageSend("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed');
      if (modal) {
        return {
          isOpen: true,
          text: modal.innerText
        };
      }
      // Check if clarification question is showing
      const clarification = document.querySelector('[data-testid="clarification-card"]');
      if (clarification) {
        return {
          isClarification: true,
          text: clarification.innerText
        };
      }
      return {
        isOpen: false,
        bodySample: document.body.innerText.slice(0, 500)
      };
    })()`,
  });
  console.log("\n--- RESULT MODAL / PREDICTION OUTPUT ---");
  console.log(JSON.stringify(modalData.result.value, null, 2));

  const resultScreenshot = await pageSend("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(screenshotsDir, "submit-result.png"), Buffer.from(resultScreenshot.data, "base64"));
  console.log("Saved submit result screenshot to docs/v11/screenshots/submit-result.png");

  console.log("\n=================================");
  console.log("FINAL STATUS VERIFICATION");
  console.log("=================================");
  console.log(`Uncaught Exceptions: ${exceptions.length}`);
  if (exceptions.length > 0) {
    console.error(JSON.stringify(exceptions, null, 2));
  } else {
    console.log("SUCCESS: 0 Uncaught Exceptions in real Chrome browser!");
  }

} catch (err) {
  console.error("BROWSER TEST ERROR:", err);
} finally {
  chromeProcess.kill();
  console.log("Chrome terminated.");
}
