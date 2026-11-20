/** Run after npm run build; fail closed if the build or its privacy check is missing. */
import fs from 'node:fs';
import path from 'node:path';

const assets = path.resolve('dist/assets');
if (!fs.existsSync(assets)) {
  throw new Error('Production build directory is missing; run npm run build first.');
}

const jsFiles = fs.readdirSync(assets).filter((filename) => filename.endsWith('.js'));
if (jsFiles.length === 0) throw new Error('No production JavaScript bundles found.');

const forbidden = [
  'dev/harness/citizen-dashboard',
  'DEMO-KHI-0001',
  'DEMO-KHI-0002',
  'awaaz_mock_citizen_auth',
];
for (const filename of jsFiles) {
  const bundle = fs.readFileSync(path.join(assets, filename), 'utf8');
  for (const marker of forbidden) {
    if (bundle.includes(marker)) {
      throw new Error(`Development-only marker ${marker} leaked into ${filename}`);
    }
  }
}
console.log(`PASS: ${jsFiles.length} production JS bundle(s) contain no demonstration fixtures or auth bypass markers.`);
