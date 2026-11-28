import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Launching Headless Chrome for Vector Logo & Asset Generation...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9877',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
  ]);

  await sleep(2000);

  const targetsRes = await fetch('http://127.0.0.1:9877/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let messageId = 1;
  const pendingRequests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  const send = (method, params = {}) => {
    const id = messageId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send('Page.enable');
  await send('Runtime.enable');

  // Load an HTML page with opentype.js and Noto Sans Arabic Bold from Google Fonts
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js"></script>
</head>
<body style="margin:0; background:transparent;">
  <div id="status">Loading...</div>
</body>
</html>
  `;

  await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}` });
  await sleep(2000);

  // Evaluate script to load the font, extract the path for 'آ', compute its bounding box, and center it in 512x512
  const evalResult = await send('Runtime.evaluate', {
    expression: `
(async function() {
  const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf';
  const font = await new Promise((resolve, reject) => {
    opentype.load(fontUrl, (err, f) => {
      if (err) reject(err);
      else resolve(f);
    });
  });

  // Target canvas: 512x512.
  // The Urdu glyph 'آ' (U+0622) has two parts: Alif (stem) and Madda (top).
  // Let's generate the path at an initial scale and find its bounding box.
  const initialFontSize = 320;
  const initialPath = font.getPath('آ', 0, 0, initialFontSize);
  const bbox = initialPath.getBoundingBox();

  const glyphWidth = bbox.x2 - bbox.x1;
  const glyphHeight = bbox.y2 - bbox.y1;

  // Desired height: approx 310px (about 60% of the 512px box)
  const targetHeight = 310;
  const scale = targetHeight / glyphHeight;
  const fontSize = initialFontSize * scale;

  const scaledPath = font.getPath('آ', 0, 0, fontSize);
  const sbox = scaledPath.getBoundingBox();
  const sWidth = sbox.x2 - sbox.x1;
  const sHeight = sbox.y2 - sbox.y1;

  // Center horizontally at 256, vertically at 256
  // Note: in fonts, y goes upwards from baseline, so sbox.y1 is negative (above baseline)
  const targetCenterX = 256;
  const targetCenterY = 256;

  const currentCenterX = (sbox.x1 + sbox.x2) / 2;
  const currentCenterY = (sbox.y1 + sbox.y2) / 2;

  const offsetX = targetCenterX - currentCenterX;
  const offsetY = targetCenterY - currentCenterY;

  const finalPath = font.getPath('آ', offsetX, offsetY, fontSize);
  const pathData = finalPath.toPathData();

  return {
    pathData,
    bbox: finalPath.getBoundingBox(),
    fontSize
  };
})()
    `,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log('Glyph extraction result:', evalResult);
  const { pathData, bbox } = evalResult.result.value;
  console.log('Path bounding box:', bbox);

  // Generate Master SVG
  const masterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Awaaz-e-Awam Approved Official Logo Mark -->
  <!-- Solid deep maroon rounded square (#761D30), rx=112 -->
  <rect width="512" height="512" rx="112" fill="#761D30" />
  <!-- Pure vector path for Urdu letter آ (Noto Sans Arabic Bold, OFL) -->
  <path d="${pathData}" fill="#FFFFFF" />
</svg>
`;

  // Write master SVG to public and src/assets
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\logo.svg', masterSvg, 'utf-8');
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\favicon.svg', masterSvg, 'utf-8');
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\pwa-icon.svg', masterSvg, 'utf-8');
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\pwa-icon-maskable.svg', masterSvg, 'utf-8');
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\src\\assets\\logo.svg', masterSvg, 'utf-8');
  console.log('Written master SVG files.');

  // Now render PNGs at multiple resolutions using Chrome screenshot
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    const pageHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0; background:transparent; overflow:hidden;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
    <rect width="512" height="512" rx="112" fill="#761D30" />
    <path d="${pathData}" fill="#FFFFFF" />
  </svg>
</body>
</html>
    `;

    await send('Emulation.setDeviceMetricsOverride', {
      width: size,
      height: size,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(pageHtml)}` });
    await sleep(200);

    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });

    const buf = Buffer.from(shot.data, 'base64');
    writeFileSync(join('D:\\RomanUrdu_V13_19_Review\\public', name), buf);
    console.log(`Saved ${name} (${size}x${size})`);
  }

  // Generate Social Share OG Image (1200x630)
  const ogHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Noto+Nastaliq+Urdu:wght@700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      width: 1200px;
      height: 630px;
      background: #141414;
      color: #FFFFFF;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 80px;
    }
    .card {
      display: flex;
      align-items: center;
      gap: 60px;
      width: 100%;
    }
    .logo-container {
      width: 240px;
      height: 240px;
      flex-shrink: 0;
    }
    .text-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .title {
      font-size: 64px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin: 0;
      color: #FFFFFF;
    }
    .urdu-title {
      font-family: 'Noto Nastaliq Urdu', serif;
      font-size: 38px;
      color: #F7F6F3;
      margin: 0;
      line-height: 1.4;
    }
    .tagline {
      font-size: 22px;
      font-weight: 500;
      color: #A3A3A3;
      margin: 0;
      line-height: 1.4;
      max-width: 700px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #D4D4D4;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      width: fit-content;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="240" height="240">
        <rect width="512" height="512" rx="112" fill="#761D30" />
        <path d="${pathData}" fill="#FFFFFF" />
      </svg>
    </div>
    <div class="text-container">
      <div class="pill">Civic Resolution Platform</div>
      <h1 class="title">Awaaz-e-Awam</h1>
      <div class="urdu-title">آوازِ عوام — بلدیاتی شکایات کا حل</div>
      <p class="tagline">Multilingual AI-assisted complaint classifier & field resolution network for Karachi municipal services.</p>
    </div>
  </div>
</body>
</html>
  `;

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 630,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(ogHtml)}` });
  await sleep(1500);

  const ogShot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\og-image.png', Buffer.from(ogShot.data, 'base64'));
  console.log('Saved og-image.png (1200x630)');

  // Also create a 32x32 favicon.ico from 32x32 PNG for maximum legacy compatibility
  const png32 = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  // Copy 32px png to favicon.ico as standard modern browsers accept PNG ICO
  writeFileSync('D:\\RomanUrdu_V13_19_Review\\public\\favicon.ico', png32);
  console.log('Saved favicon.ico');

  chrome.kill();
  console.log('All brand assets successfully generated!');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
