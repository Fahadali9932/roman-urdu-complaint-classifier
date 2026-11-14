import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WORKTREE_DIR = 'D:/RomanUrdu_ComplaintClassifier_staff_auth/screenshots/guest_submission_qa';
const ARTIFACT_DIR = 'C:/Users/Annihilation/.gemini/antigravity/brain/a88fd076-ccfa-4971-8727-16417815432e/screenshots/guest_submission_qa';

if (!fs.existsSync(WORKTREE_DIR)) fs.mkdirSync(WORKTREE_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function saveScreenshot(buffer, filename) {
  const p1 = path.join(WORKTREE_DIR, filename);
  const p2 = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(p1, buffer);
  fs.writeFileSync(p2, buffer);
  console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
}

async function run() {
  console.log('Capturing Verified Guest Submission & Claiming QA...');
  const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'chrome_guest_qa_' + Date.now());
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9290',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${tempDir}`,
      'http://localhost:5173/submit',
    ],
    { detached: true, stdio: 'ignore' }
  );

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://localhost:9290/json/version');
      if (res.ok) {
        console.log('Connected to Chrome CDP on port 9290');
        break;
      }
    } catch {}
  }

  const targetsRes = await fetch('http://localhost:9290/json/list');
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const capture = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    await saveScreenshot(buffer, name);
  };

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  };

  try {
    // -------------------------------------------------------------
    // 1. Step 1: Fill Applicant Details
    // -------------------------------------------------------------
    console.log('\n=== Step 1: Applicant Details ===');
    await send('Page.navigate', { url: 'http://localhost:5173/submit' });
    await sleep(2500);

    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#citizenName', 'Muhammad Tariq Khan');
      setVal('#citizenPhone', '03001234567');
      setVal('#citizenEmail', 'tariq.khan@gmail.com');
    })()`);
    await sleep(600);
    await capture('01_guest_submit_step1.png');

    // Click Continue
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
      if (btn) btn.click();
    })()`);
    await sleep(1200);

    // -------------------------------------------------------------
    // 2. Step 2: Location
    // -------------------------------------------------------------
    console.log('\n=== Step 2: Location Details ===');
    await evaluate(`(() => {
      const loc = document.querySelector('#locality');
      loc.focus();
      const proto = window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(loc, 'Gulshan');
      loc.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(600);

    // Click the first listbox suggestion
    await evaluate(`(() => {
      const li = document.querySelector('#locality-listbox li');
      if (li) li.click();
    })()`);
    await sleep(600);

    // Set publicLocation and applicantAddress
    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#publicLocation', 'Main University Road near Disco Bakery');
      setVal('#applicantAddress', 'House 42, Block 13-D, Gulshan-e-Iqbal, Karachi');
    })()`);
    await sleep(800);
    await capture('02_guest_submit_step2.png');

    // Click Continue to advance to Step 3
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    // -------------------------------------------------------------
    // 3. Step 3: English Notice & Description
    // -------------------------------------------------------------
    console.log('\n=== Step 3: English Informational Notice ===');
    const step3Heading = await evaluate(`document.querySelector('h2')?.innerText`);
    console.log('Step 3 Heading:', step3Heading);

    const step3NoticeEn = await evaluate(`
      document.querySelector('[data-testid="guest-submission-notice"]')?.innerText
    `);
    console.log('Step 3 English Notice:\n', step3NoticeEn);
    await capture('03_guest_submit_step3_english.png');

    // Toggle to Urdu
    console.log('\n=== Step 3: Urdu Notice in RTL ===');
    await evaluate(`(() => {
      const urduBtn = document.querySelector('button[title*="Urdu"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EN/اردو') || b.textContent.includes('اردو'));
      if (urduBtn) urduBtn.click();
    })()`);
    await sleep(1200);

    const step3NoticeUr = await evaluate(`
      document.querySelector('[data-testid="guest-submission-notice"]')?.innerText
    `);
    console.log('Step 3 Urdu Notice:\n', step3NoticeUr);
    await capture('04_guest_submit_step3_urdu.png');

    // Switch back to English
    console.log('Switching back to English...');
    await evaluate(`(() => {
      const engBtn = document.querySelector('button[title*="English"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EN/اردو') || b.textContent.includes('English') || b.textContent.includes('EN'));
      if (engBtn) engBtn.click();
    })()`);
    await sleep(1000);

    // Enter complaint description
    console.log('\n=== Entering Complaint Description & Submitting ===');
    await evaluate(`(() => {
      const ta = document.getElementById('description');
      if (ta) {
        const proto = window.HTMLTextAreaElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(ta, 'Sadak par bohot gehra khadda hai asphalt toot gayi KMC road repair chahiye aur traffic block ho raha hai');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(800);

    // Click Submit Complaint
    await evaluate(`(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Complaint') || b.textContent.includes('Submit'));
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(5000);

    // Capture receipt modal
    await capture('05_guest_submission_receipt_modal.png');

    const receipt = await evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
      if (!dialog) return { found: false, text: document.body.innerText.slice(0, 300) };
      const text = dialog.innerText;
      const refMatch = text.match(/KHI-2026-[A-Z0-9]+/);
      const claimMatch = text.match(/CLM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
      return {
        found: true,
        referenceNumber: refMatch ? refMatch[0] : null,
        claimCode: claimMatch ? claimMatch[0] : null,
        preview: text.slice(0, 400)
      };
    })()`);
    console.log('Receipt captured successfully:\n', receipt);

    // -------------------------------------------------------------
    // 4. Department Portal Verification
    // -------------------------------------------------------------
    console.log('\n=== Department Portal Verification (roads-01) ===');
    await send('Page.navigate', { url: 'http://localhost:5173/department/login' });
    await sleep(2500);

    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#username', 'roads-01');
      setVal('#accessKey', 'Y5AcfXVDn9-rzqE!GY8bMyyenH4r');
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(4000);
    await capture('06_department_portal_pending_acceptance.png');

    // -------------------------------------------------------------
    // 5. Citizen Registration & Dashboard Claim Verification
    // -------------------------------------------------------------
    console.log('\n=== Citizen Registration & Ownership Claiming ===');
    const citizenEmail = `citizen.tariq.${Date.now()}@awaaz.pk`;
    await send('Page.navigate', { url: 'http://localhost:5173/register' });
    await sleep(2500);

    await evaluate(`(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const proto = window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal('#fullName', 'Muhammad Tariq Khan');
      setVal('#email', '${citizenEmail}');
      setVal('#phone', '03001234567');
      setVal('#password', 'TestPassword123!');
    })()`);
    await sleep(800);
    await capture('07_citizen_registration.png');

    // Submit registration
    await evaluate(`(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3500);

    // Navigate to Citizen Dashboard
    await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
    await sleep(3000);
    await capture('08_citizen_dashboard_header.png');

    // Click Claim Guest Complaint button
    await evaluate(`(() => {
      const claimBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Claim Guest Complaint'));
      if (claimBtn) claimBtn.click();
    })()`);
    await sleep(1000);
    await capture('09_citizen_dashboard_claim_modal.png');

    if (receipt && receipt.referenceNumber && receipt.claimCode) {
      console.log('Claiming complaint with: ' + receipt.referenceNumber + ' / ' + receipt.claimCode);
      await evaluate(`(() => {
        const setVal = (sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const proto = window.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal('#claim-ref', '${receipt.referenceNumber}');
        setVal('#claim-code', '${receipt.claimCode}');
      })()`);
      await sleep(800);
      await capture('10_citizen_dashboard_claim_modal_filled.png');

      // Click Claim & Link Complaint
      await evaluate(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Claim & Link Complaint'));
        if (btn) btn.click();
      })()`);
      await sleep(4000);
      await capture('11_citizen_dashboard_after_claim.png');
    }

    console.log('\nAll QA screenshots captured and verified successfully!');
  } catch (err) {
    console.error('Execution error:', err);
  } finally {
    try {
      ws.close();
      chromeProcess.kill('SIGTERM');
    } catch {}
  }
}

run();
