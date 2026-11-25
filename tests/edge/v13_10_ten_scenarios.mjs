// V13.10 Ten Specific Complaint Scenarios Verification
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

let client;
let submitHandler;
let notifyHandler;
const quotaCounts = new Map();

globalThis.Deno = {
  serve(fn) {
    // When imported, the handlers register themselves
    submitHandler = fn;
  },
  env: { get(key) { return { SUPABASE_ANON_KEY: 'public-test-key' }[key] ?? 'test'; } },
};
globalThis.makeLocalClient = () => client;

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith('jsr:')) return next(specifier, context);
    const source = specifier.includes('supabase-js') ? 'export const createClient = globalThis.makeLocalClient;' : '';
    return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  },
});

await import('../../supabase/functions/send-status-notification/index.ts');
notifyHandler = submitHandler;

await import('../../supabase/functions/submit-classified-complaint/index.ts');
// submitHandler now points to submit-classified-complaint

function createMockDb({ user = null, role = 'citizen', tables = {} } = {}) {
  quotaCounts.clear();
  const writes = [];
  const reads = [];
  client = {
    auth: {
      getUser: async (token) => {
        if (!token || token === 'expired') return { data: { user: null }, error: new Error('Invalid token') };
        return { data: { user: user ?? { id: 'citizen-uuid-1', role } } };
      },
    },
    from(table) {
      reads.push(table);
      let rows = tables[table] ?? [];
      const query = {
        select() { return query; },
        eq(key, val) { rows = rows.filter(r => r[key] === val); return query; },
        in(key, vals) { rows = rows.filter(r => vals.includes(r[key])); return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => ({ data: (table === 'profiles' && !tables.profiles) ? { role } : (rows[0] ?? null) }),
        then(resolve) { resolve({ data: rows }); },
        insert: async (rec) => { writes.push({ table, rec }); return { error: null }; },
      };
      return query;
    },
    rpc: async (fn, args) => {
      if (fn === 'reserve_complaint_intake_quota') {
        const key = args.p_client_hash;
        const next = (quotaCounts.get(key) ?? 0) + 1;
        quotaCounts.set(key, next);
        return { data: next <= (args.p_is_authenticated ? 30 : 10), error: null };
      }
      writes.push({ fn, args });
      return {
        data: {
          complaint_id: 'cmp-v1310-scenarios',
          reference_number: 'KHI-2026-SCENARIO',
          status: args.p_needs_review ? 'under_review' : 'assigned',
          assigned_department_id: args.p_predicted_department_id,
          assigned_department_ids: args.p_predicted_department_id ? [args.p_predicted_department_id] : [],
        },
        error: null,
      };
    },
  };
  return { writes, reads };
}

const basePayload = {
  incidentDistrict: 'District East',
  incidentLocality: 'Gulshan-e-Iqbal',
  incidentPublicLocation: 'Block 13-D Main Road',
  incidentLatitude: 24.9182,
  incidentLongitude: 67.0971,
  citizenName: 'Ahmed Raza',
  citizenPhone: '03009876543',
  citizenEmail: 'ahmed@example.com',
  residentialAddress: 'House 45, Street 2',
};

function req(body, token) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('http://local.invalid/submit', { method: 'POST', headers, body: rawBody });
}

// -------------------------------------------------------------
// SCENARIO 1: Normal Roman Urdu complaint
// -------------------------------------------------------------
test('Scenario 1: Normal Roman Urdu complaint routes cleanly to KW&SB (Water)', async () => {
  const db = createMockDb();
  const desc = 'Hamare ilaqe Nazimabad Block 3 mein pichle teen din se pani ki supply band hai aur line leak ho rahi hai';
  const response = await submitHandler(req({ ...basePayload, description: desc }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.prediction.departments, ['kwsc']);
  assert.equal(data.prediction.needsReview, false);
  assert.equal(db.writes[0].args.p_predicted_department_id, 'kwsc');
});

// -------------------------------------------------------------
// SCENARIO 2: Abusive / Frustrated Roman Urdu complaint
// -------------------------------------------------------------
test('Scenario 2: Abusive Roman Urdu complaint maintains routing to SSGC and sanitizes profanity', async () => {
  const db = createMockDb();
  const fahadText = 'Mera naam Fahad hai. Yeh teesri dafa likh raha hoon, tum log sab chor ho koi kaam dhang se nahi karte, itni ghatiya service hai ke sharam aani chahiye. Hamare ilaqe Block 7 Gulshan mein pichle char din se gas bilkul band hai, choolhe thande pare hain, auratain subah se nashte ke liye taras rahi hain aur bahar se khana mangwana par raha hai jo hum afford nahi kar sakte. Meharbani karke is gas ke masle ko foran theek karein warna hum ehtijaj karein ge.';
  const response = await submitHandler(req({ ...basePayload, description: fahadText }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.prediction.departments, ['ssgc']);
  assert.equal(data.prediction.needsReview, false);
  const rpcArgs = db.writes[0].args;
  assert.equal(rpcArgs.p_predicted_department_id, 'ssgc');
  assert.ok(!rpcArgs.p_sanitized_description.includes('ghatiya'), 'Profanity should be sanitized from public description');
});

// -------------------------------------------------------------
// SCENARIO 3: Complaint containing spelling mistakes
// -------------------------------------------------------------
test('Scenario 3: Complaint containing phonetic spelling mistakes normalizes and routes to K-Electric', async () => {
  const db = createMockDb();
  const typoText = 'hmary elaqay me byjli subha se ghaib hy aur k-electrik ka taar toota para hay koi sunwai nhi horahi';
  const response = await submitHandler(req({ ...basePayload, description: typoText }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.prediction.departments, ['kelectric']);
  assert.equal(data.prediction.needsReview, false);
});

// -------------------------------------------------------------
// SCENARIO 4: Two independent department issues (Multi-label)
// -------------------------------------------------------------
test('Scenario 4: Two independent department issues route to multiple departments (K-Electric and KW&SB)', async () => {
  const db = createMockDb();
  const multiText = 'Bijli bhi teen din se band hai aur gutter ka ganda pani bhi sadak par beh raha hai';
  const response = await submitHandler(req({ ...basePayload, description: multiText }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.prediction.departments.includes('kelectric'));
  assert.ok(data.prediction.departments.includes('kwsc'));
  assert.equal(data.prediction.isMultiLabel, true);
  const routing = db.writes[0].args.p_redaction_flags.multi_department_routing;
  assert.equal(routing.is_multilabel, true);
});

// -------------------------------------------------------------
// SCENARIO 5: Causal complaint involving multiple departments
// -------------------------------------------------------------
test('Scenario 5: Causal complaint routes only to root cause department (K-Electric), not consequence (SSWMB)', async () => {
  const db = createMockDb();
  const causalText = 'K-Electric ki taar toot kar gir gayi jis se kachray mein aag lag gayi';
  const response = await submitHandler(req({ ...basePayload, description: causalText }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.prediction.departments, ['kelectric']);
  assert.equal(db.writes[0].args.p_predicted_department_id, 'kelectric');
});

// -------------------------------------------------------------
// SCENARIO 6: Ambiguous complaint requiring human review
// -------------------------------------------------------------
test('Scenario 6: Ambiguous complaint without clarification flags UNRESOLVED_AMBIGUITY for human review', async () => {
  const db = createMockDb();
  const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
  const response = await submitHandler(req({ ...basePayload, description: ambiguousText }, 'valid-token'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.prediction.needsReview, true);
  assert.equal(data.prediction.reviewReason, 'UNRESOLVED_AMBIGUITY');
  assert.equal(db.writes[0].args.p_needs_review, true);
});

// -------------------------------------------------------------
// SCENARIO 7: Guest complaint submission
// -------------------------------------------------------------
test('Scenario 7: Guest submission succeeds without sign-in, generates tracking number & claim code, forces p_is_demonstration=false', async () => {
  const db = createMockDb();
  const desc = 'Pani ki supply kal raat se band hai, meharbani karke water tanker bhejain';
  const response = await submitHandler(req({ ...basePayload, description: desc }, null)); // No auth token
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.claim_code.startsWith('CLM-'));
  assert.ok(data.guest_tracking_number.length >= 24);
  assert.equal(db.writes[0].args.p_citizen_id, null);
  assert.equal(db.writes[0].args.p_is_demonstration, false);
});

// -------------------------------------------------------------
// SCENARIO 8: Authenticated citizen submission
// -------------------------------------------------------------
test('Scenario 8: Authenticated citizen submission binds citizen ID to record', async () => {
  const citizenId = '9a000000-0000-4000-8000-000000000002';
  const db = createMockDb({ user: { id: citizenId }, role: 'citizen' });
  const desc = 'Sui gas ka pressure bohot low hai choolha mushkil se jal raha hai';
  const response = await submitHandler(req({ ...basePayload, description: desc }, 'valid-citizen-jwt'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(db.writes[0].args.p_citizen_id, citizenId);
  assert.equal(data.claim_code, undefined); // Claim code not issued for registered accounts
});

// -------------------------------------------------------------
// SCENARIO 9: Oversized or malicious requests
// -------------------------------------------------------------
test('Scenario 9a: Oversized request (>16 KiB) returns HTTP 413 PAYLOAD_TOO_LARGE', async () => {
  const db = createMockDb();
  const oversizedDesc = 'gas ' + 'x'.repeat(20_000);
  const response = await submitHandler(req({ ...basePayload, description: oversizedDesc }, null));
  assert.equal(response.status, 413);
  const data = await response.json();
  assert.equal(data.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(db.writes.length, 0);
});

test('Scenario 9b: Complaint with >200 words returns HTTP 400 INVALID_COMPLAINT_PAYLOAD', async () => {
  const db = createMockDb();
  const words201 = Array(201).fill('masla').join(' ');
  const response = await submitHandler(req({ ...basePayload, description: words201 }, null));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.code, 'INVALID_COMPLAINT_PAYLOAD');
  assert.equal(db.writes.length, 0);
});

test('Scenario 9c: Malformed JSON returns HTTP 400 without DB write', async () => {
  const db = createMockDb();
  const response = await submitHandler(req('{"description":', null));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.code, 'INVALID_COMPLAINT_PAYLOAD');
  assert.equal(db.writes.length, 0);
});

test('Scenario 9d: Malicious demonstration spoofing (isDemonstration: true) is overridden to false', async () => {
  const db = createMockDb();
  const response = await submitHandler(req({ ...basePayload, description: 'gas band hai', isDemonstration: true }, null));
  assert.equal(response.status, 200);
  assert.equal(db.writes[0].args.p_is_demonstration, false);
});

// -------------------------------------------------------------
// SCENARIO 10: Unauthorized department access
// -------------------------------------------------------------
test('Scenario 10a: Citizen role attempting to trigger staff status notification returns HTTP 403', async () => {
  const citizen = { role: 'citizen', id: 'citizen-1' };
  const complaint = { id: 'case-1', status: 'resolved', assigned_department_id: 'kwsc' };
  const membership = { user_id: citizen.id, department_id: 'kwsc', status: 'active' };
  createMockDb({ tables: { profiles: [citizen], department_memberships: [membership], complaints: [complaint] } });

  const headers = new Headers({ Authorization: 'Bearer citizen-token', 'Content-Type': 'application/json' });
  const reqObj = new Request('http://local.invalid/notify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ complaintId: 'case-1', newStatus: 'resolved' }),
  });
  const res = await notifyHandler(reqObj);
  assert.equal(res.status, 403);
});

test('Scenario 10b: Inactive/revoked staff member attempting notification returns HTTP 403', async () => {
  const staff = { role: 'department_staff', id: 'staff-1' };
  const complaint = { id: 'case-1', status: 'resolved', assigned_department_id: 'kwsc' };
  const membership = { user_id: staff.id, department_id: 'kwsc', status: 'revoked' };
  createMockDb({ tables: { profiles: [staff], department_memberships: [membership], complaints: [complaint] } });

  const headers = new Headers({ Authorization: 'Bearer staff-token', 'Content-Type': 'application/json' });
  const reqObj = new Request('http://local.invalid/notify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ complaintId: 'case-1', newStatus: 'resolved' }),
  });
  const res = await notifyHandler(reqObj);
  assert.equal(res.status, 403);
});

test('Scenario 10c: Staff from Department A (SSGC) accessing Department B (KWSC) case returns HTTP 404', async () => {
  const staff = { role: 'department_staff', id: 'staff-ssgc' };
  const complaint = { id: 'case-1', status: 'resolved', assigned_department_id: 'kwsc' };
  const membership = { user_id: staff.id, department_id: 'ssgc', status: 'active' };
  createMockDb({ user: { id: staff.id }, tables: { profiles: [staff], department_memberships: [membership], complaints: [complaint] } });

  const headers = new Headers({ Authorization: 'Bearer staff-token', 'Content-Type': 'application/json' });
  const reqObj = new Request('http://local.invalid/notify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ complaintId: 'case-1', newStatus: 'resolved' }),
  });
  const res = await notifyHandler(reqObj);
  assert.equal(res.status, 404);
});

// -------------------------------------------------------------
// ABUSE PROTECTION & RATE LIMITING TESTS
// -------------------------------------------------------------
test('Abuse Protection: Honeypot field in payload triggers HTTP 400 BOT_DETECTED', async () => {
  createMockDb();
  const botPayload = { ...basePayload, description: 'gas band hai', hp_bot_field: 'http://spambot.invalid' };
  const res = await submitHandler(req(botPayload, null));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, 'BOT_DETECTED');
});

test('Abuse Protection: Excessive guest requests from same IP trigger HTTP 429 RATE_LIMITED', async () => {
  createMockDb();
  const testIp = '198.51.100.99';
  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-forwarded-for': testIp,
  });
  let lastStatus = 200;
  for (let i = 0; i < 11; i++) {
    const res = await submitHandler(new Request('http://local.invalid/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...basePayload, description: 'gas band hai' }),
    }));
    lastStatus = res.status;
    if (res.status === 429) {
      const data = await res.json();
      assert.equal(data.code, 'RATE_LIMITED');
      assert.equal(res.headers.get('Retry-After'), '60');
      break;
    }
  }
  assert.equal(lastStatus, 429, '11th guest request should be rate-limited to 429');
});

