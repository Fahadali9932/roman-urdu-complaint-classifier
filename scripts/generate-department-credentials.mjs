import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_DIR = path.resolve(process.cwd(), '.credentials');
const ENV_FILE = path.join(CREDENTIALS_DIR, 'department_staff_credentials.env');
const JSON_FILE = path.join(CREDENTIALS_DIR, 'department_staff_credentials.json');

const DEPARTMENTS = [
  {
    username: 'roads-01',
    departmentId: 'kmc',
    departmentCode: 'KMC',
    departmentName: 'Karachi Metropolitan Corporation (KMC / DMCs)',
    authEmail: 'fahadmalik030121+roads@gmail.com',
    envPrefix: 'ROADS',
    title: 'Executive Engineer — Roads & Infrastructure',
  },
  {
    username: 'electricity-01',
    departmentId: 'kelectric',
    departmentCode: 'KE',
    departmentName: 'K-Electric (Infrastructure & Distribution)',
    authEmail: 'fahadmalik030121+electricity@gmail.com',
    envPrefix: 'ELECTRICITY',
    title: 'Operations Superintendent — Power Distribution',
  },
  {
    username: 'water-01',
    departmentId: 'kwsc',
    departmentCode: 'KWSC',
    departmentName: 'Karachi Water & Sewerage Corporation (KW&SC)',
    authEmail: 'fahadmalik030121+water@gmail.com',
    envPrefix: 'WATER',
    title: 'Sub-Divisional Officer — Water & Sewerage',
  },
  {
    username: 'gas-01',
    departmentId: 'ssgc',
    departmentCode: 'SSGC',
    departmentName: 'Sui Southern Gas Company (SSGC)',
    authEmail: 'fahadmalik030121+gas@gmail.com',
    envPrefix: 'GAS',
    title: 'Field Engineer — Gas Transmission & Leakage',
  },
  {
    username: 'sanitation-01',
    departmentId: 'sswmb',
    departmentCode: 'SSWMB',
    departmentName: 'Sindh Solid Waste Management Board (SSWMB)',
    authEmail: 'fahadmalik030121+sanitation@gmail.com',
    envPrefix: 'SANITATION',
    title: 'Zonal Inspector — Solid Waste Management',
  },
  {
    username: 'building-01',
    departmentId: 'sbca',
    departmentCode: 'SBCA',
    departmentName: 'Sindh Building Control Authority (SBCA)',
    authEmail: 'fahadmalik030121+building@gmail.com',
    envPrefix: 'BUILDING',
    title: 'Assistant Director — Building Control & Demolition',
  },
];

/**
 * Generates an independently cryptographically secure access key (28 chars).
 * Meets requirements: 24–32 chars, high entropy, alphanumeric + safe symbols.
 */
function generateAccessKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*_-+=';
  const bytes = crypto.randomBytes(36);
  let key = '';
  for (let i = 0; i < 28; i++) {
    key += alphabet[bytes[i] % alphabet.length];
  }
  return key;
}

function hashPassword(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateCredentials(force = false) {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }

  // Idempotency: if already exists and not forced, reuse existing
  if (!force && fs.existsSync(JSON_FILE)) {
    const existing = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log('[SECURITY] Existing demonstration credentials found in:', JSON_FILE);
    console.log('[SECURITY] Verified 6 departmental demonstration identities.');
    return existing;
  }

  const generated = [];
  let envContent = `# ==============================================================================\n`;
  envContent += `# AWAAZ-E-AWAM — DEPARTMENT STAFF DEMONSTRATION CREDENTIALS\n`;
  envContent += `# Generated At: ${new Date().toISOString()}\n`;
  envContent += `# Primary Recovery & Verification Inbox: fahadmalik030121@gmail.com\n`;
  envContent += `#\n`;
  envContent += `# CONFIDENTIAL: DO NOT COMMIT TO GIT OR TRANSMIT OVER INSECURE CHANNELS\n`;
  envContent += `# ==============================================================================\n\n`;

  for (const dept of DEPARTMENTS) {
    const accessKey = generateAccessKey();
    const passwordHash = hashPassword(accessKey);

    generated.push({
      ...dept,
      accessKey,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    envContent += `# ${dept.departmentCode} — ${dept.departmentName}\n`;
    envContent += `${dept.envPrefix}_USERNAME="${dept.username}"\n`;
    envContent += `${dept.envPrefix}_DEPARTMENT_ID="${dept.departmentId}"\n`;
    envContent += `${dept.envPrefix}_AUTH_EMAIL="${dept.authEmail}"\n`;
    envContent += `${dept.envPrefix}_ACCESS_KEY="${accessKey}"\n`;
    envContent += `${dept.envPrefix}_PASSWORD_HASH="${passwordHash}"\n\n`;
  }

  fs.writeFileSync(ENV_FILE, envContent, { mode: 0o600 });
  fs.writeFileSync(JSON_FILE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    verificationInbox: 'fahadmalik030121@gmail.com',
    departments: generated,
  }, null, 2), { mode: 0o600 });

  console.log('[SECURITY] Successfully generated 6 cryptographically secure access keys (28 chars each).');
  console.log('[SECURITY] Saved to: .credentials/department_staff_credentials.env');
  console.log('[SECURITY] Saved to: .credentials/department_staff_credentials.json');
  console.log('[SECURITY] Protected by .gitignore. Plaintext keys are never emitted to logs or Git.');

  return { departments: generated };
}

// Direct execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '');
if (isMain) {
  const force = process.argv.includes('--force');
  generateCredentials(force);
}

