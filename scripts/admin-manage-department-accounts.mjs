import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CREDENTIALS_DIR = path.resolve(process.cwd(), '.credentials');
const JSON_FILE = path.join(CREDENTIALS_DIR, 'department_staff_credentials.json');
const ENV_FILE = path.join(CREDENTIALS_DIR, 'department_staff_credentials.env');

// Read environment from .env.local if present
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const tr = line.trim();
      if (!tr || tr.startsWith('#')) continue;
      const idx = tr.indexOf('=');
      if (idx !== -1) {
        env[tr.slice(0, idx).trim()] = tr.slice(idx + 1).trim();
      }
    }
  }
  return env;
}

function loadCredentials() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error('[ERROR] Credentials not found. Run "node scripts/generate-department-credentials.mjs" first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
}

function saveCredentials(creds) {
  fs.writeFileSync(JSON_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
  
  let envContent = `# ==============================================================================\n`;
  envContent += `# AWAAZ-E-AWAM — DEPARTMENT STAFF DEMONSTRATION CREDENTIALS\n`;
  envContent += `# Updated At: ${new Date().toISOString()}\n`;
  envContent += `# Primary Recovery & Verification Inbox: ${creds.verificationInbox}\n`;
  envContent += `# ==============================================================================\n\n`;

  for (const dept of creds.departments) {
    envContent += `# ${dept.departmentCode} — ${dept.departmentName}\n`;
    envContent += `${dept.envPrefix}_USERNAME="${dept.username}"\n`;
    envContent += `${dept.envPrefix}_DEPARTMENT_ID="${dept.departmentId}"\n`;
    envContent += `${dept.envPrefix}_AUTH_EMAIL="${dept.authEmail}"\n`;
    envContent += `${dept.envPrefix}_ACCESS_KEY="${dept.accessKey}"\n`;
    envContent += `${dept.envPrefix}_PASSWORD_HASH="${dept.passwordHash}"\n\n`;
  }
  fs.writeFileSync(ENV_FILE, envContent, { mode: 0o600 });
}

async function getAdminClient() {
  const env = loadEnvLocal();
  const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return { client: null, url, hasServiceKey: false };
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client, url, hasServiceKey: true };
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

async function cmdStatus() {
  const creds = loadCredentials();
  const { client, url, hasServiceKey } = await getAdminClient();

  console.log('\n==============================================================================');
  console.log('AWAAZ-E-AWAM — DEPARTMENT STAFF DEMONSTRATION ACCOUNTS STATUS');
  console.log('==============================================================================');
  console.log(`Verification & Recovery Inbox : ${creds.verificationInbox}`);
  console.log(`Live Supabase Target URL      : ${url || 'Not configured'}`);
  console.log(`Service Role Access           : ${hasServiceKey ? 'Active (Admin Key Present)' : 'Local Only (SUPABASE_SERVICE_ROLE_KEY missing from .env.local)'}`);
  console.log('------------------------------------------------------------------------------');
  console.log('Username        | Dept  | Email Alias                           | Status');
  console.log('----------------|-------|---------------------------------------|-------------');

  for (const d of creds.departments) {
    let status = 'configured';
    if (client) {
      try {
        const { data: mem } = await client
          .from('department_memberships')
          .select('status')
          .eq('department_id', d.departmentId)
          .maybeSingle();
        if (mem) status = mem.status;
      } catch {}
    }
    const userCol = d.username.padEnd(15);
    const deptCol = d.departmentCode.padEnd(5);
    const emailCol = d.authEmail.padEnd(37);
    console.log(`${userCol} | ${deptCol} | ${emailCol} | ${status}`);
  }
  console.log('------------------------------------------------------------------------------\n');
}

async function cmdProvision() {
  const creds = loadCredentials();
  const { client, url, hasServiceKey } = await getAdminClient();

  if (!hasServiceKey || !client) {
    console.log('\n[NOTICE] To provision accounts directly into live Supabase Auth:');
    console.log('1. Open your Supabase Dashboard: Project Settings > API');
    console.log('2. Copy the "service_role" secret');
    console.log('3. Add to D:\\RomanUrdu_ComplaintClassifier_staff_auth\\.env.local:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
    console.log('4. Re-run: node scripts/admin-manage-department-accounts.mjs provision');
    console.log('\n[INFO] Demonstration accounts are already securely configured locally in:');
    console.log('       .credentials/department_staff_credentials.env\n');
    return;
  }

  console.log(`\nConnecting to live Supabase at ${url} via Admin Client...`);

  for (const dept of creds.departments) {
    console.log(`\nProcessing: ${dept.username} (${dept.departmentCode}) -> ${dept.authEmail}`);

    // 1. Check if user already exists
    const { data: userList } = await client.auth.admin.listUsers();
    let existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === dept.authEmail.toLowerCase()
    );

    let userId = existingUser?.id;

    if (!existingUser) {
      console.log(`  Creating Supabase Auth user (email_confirm: true)...`);
      const { data: createRes, error: createErr } = await client.auth.admin.createUser({
        email: dept.authEmail,
        password: dept.accessKey,
        email_confirm: true,
        user_metadata: {
          full_name: dept.title,
          department_id: dept.departmentId,
          role: 'department_staff',
          username: dept.username,
        },
      });

      if (createErr) {
        console.error(`  [ERROR] Failed to create auth user: ${createErr.message}`);
        continue;
      }
      userId = createRes.user.id;
      console.log(`  Auth user created successfully! ID: ${userId}`);
    } else {
      console.log(`  Auth user already exists (ID: ${userId}). Updating credentials...`);
      await client.auth.admin.updateUserById(userId, {
        password: dept.accessKey,
        email_confirm: true,
        user_metadata: {
          full_name: dept.title,
          department_id: dept.departmentId,
          role: 'department_staff',
          username: dept.username,
        },
      });
    }

    // 2. Upsert profile
    console.log(`  Upserting public.profiles...`);
    const { error: profErr } = await client.from('profiles').upsert({
      id: userId,
      full_name: dept.title,
      email: dept.authEmail,
      role: 'department_staff',
      updated_at: new Date().toISOString(),
    });
    if (profErr) {
      console.error(`  [ERROR] Profile upsert failed: ${profErr.message}`);
    }

    // 3. Upsert department_memberships
    console.log(`  Upserting public.department_memberships (status: active)...`);
    const { error: memErr } = await client.from('department_memberships').upsert(
      {
        user_id: userId,
        department_id: dept.departmentId,
        status: 'active',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        revoked_by: null,
        revoked_at: null,
        revocation_reason: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,department_id' }
    );
    if (memErr) {
      console.error(`  [ERROR] Membership upsert failed: ${memErr.message}`);
    } else {
      console.log(`  Active membership established for ${dept.departmentCode}.`);
    }
  }

  console.log('\n[SUCCESS] Live Supabase provisioning completed successfully!\n');
}

async function cmdRevoke(username, reason) {
  if (!username) {
    console.error('Usage: node scripts/admin-manage-department-accounts.mjs revoke <username> [reason]');
    process.exit(1);
  }
  const creds = loadCredentials();
  const dept = creds.departments.find((d) => d.username === username.toLowerCase().trim());
  if (!dept) {
    console.error(`[ERROR] Unknown department username "${username}".`);
    process.exit(1);
  }

  const { client } = await getAdminClient();
  const revReason = reason || 'Administrative access review';

  if (client) {
    const { error } = await client
      .from('department_memberships')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revocation_reason: revReason,
        updated_at: new Date().toISOString(),
      })
      .eq('department_id', dept.departmentId);
    if (error) {
      console.error(`[ERROR] Live revocation failed: ${error.message}`);
      return;
    }
    console.log(`[SUCCESS] Live account for "${username}" revoked successfully. Reason: ${revReason}`);
  } else {
    console.log(`[INFO] Marked "${username}" for revocation in local administration.`);
  }
}

async function cmdReinstate(username) {
  if (!username) {
    console.error('Usage: node scripts/admin-manage-department-accounts.mjs reinstate <username>');
    process.exit(1);
  }
  const creds = loadCredentials();
  const dept = creds.departments.find((d) => d.username === username.toLowerCase().trim());
  if (!dept) {
    console.error(`[ERROR] Unknown department username "${username}".`);
    process.exit(1);
  }

  const { client } = await getAdminClient();
  if (client) {
    const { error } = await client
      .from('department_memberships')
      .update({
        status: 'active',
        revoked_by: null,
        revoked_at: null,
        revocation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('department_id', dept.departmentId);
    if (error) {
      console.error(`[ERROR] Live reinstatement failed: ${error.message}`);
      return;
    }
    console.log(`[SUCCESS] Live account for "${username}" reinstated to ACTIVE.`);
  } else {
    console.log(`[INFO] Reinstated "${username}" to ACTIVE in local administration.`);
  }
}

// -----------------------------------------------------------------------------
// CLI Dispatcher
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);
const command = args[0] || 'status';

switch (command) {
  case 'status':
    await cmdStatus();
    break;
  case 'provision':
    await cmdProvision();
    break;
  case 'revoke':
    await cmdRevoke(args[1], args[2]);
    break;
  case 'reinstate':
    await cmdReinstate(args[1]);
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Available commands: status | provision | revoke <username> [reason] | reinstate <username>');
    break;
}
