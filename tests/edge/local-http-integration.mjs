// Local bounded HTTP integration test for submit-classified-complaint over real TCP/HTTP sockets. Node 24+.
import assert from 'node:assert/strict';
import http from 'node:http';
import { registerHooks } from 'node:module';
import test from 'node:test';

let client;
let submitHandler;

globalThis.Deno = {
  serve(fn) { submitHandler = fn; },
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

await import('../../supabase/functions/submit-classified-complaint/index.ts');

function createMockDatabase(user = { id: 'test-user', role: 'citizen' }, quota = { data: true, error: null }) {
  const writes = [];
  client = {
    auth: {
      getUser: async (token) => {
        if (token === 'expired') return { data: { user: null }, error: new Error('Expired') };
        return { data: { user } };
      },
    },
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { role: user.role } }),
        insert: async () => ({ error: null }),
      };
    },
    rpc: async (fn, args) => {
      if (fn === 'reserve_complaint_intake_quota') {
        return quota;
      }
      writes.push({ fn, args });
      return {
        data: {
          complaint_id: 'cmp-http-test-1',
          reference_number: 'KHI-2026-HTTP01',
          status: args.p_needs_review ? 'under_review' : 'assigned',
          assigned_department_id: args.p_predicted_department_id,
          assigned_department_ids: args.p_predicted_department_id ? [args.p_predicted_department_id] : [],
        },
        error: null,
      };
    },
  };
  return { writes };
}

// Spin up a real HTTP server wrapping the Edge handler
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else if (value) {
        headers.set(key, value);
      }
    }

    const webReq = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    });

    const webRes = await submitHandler(webReq);
    res.statusCode = webRes.status;
    for (const [k, v] of webRes.headers.entries()) {
      res.setHeader(k, v);
    }
    const resBody = await webRes.text();
    res.end(resBody);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const draftBase = {
  incidentDistrict: 'District East',
  incidentLocality: 'Gulshan Block 7',
  incidentPublicLocation: 'Street 4 Main Market',
  incidentLatitude: 24.9056,
  incidentLongitude: 67.0822,
  citizenName: 'Fahad',
  citizenPhone: '03001234567',
  residentialAddress: 'House 12, Block 7',
};

test('Local HTTP Server: Fahad complaint routes to SSGC with 200 OK over real HTTP', async () => {
  const db = createMockDatabase();
  const fahadText = 'Mera naam Fahad hai. Yeh teesri dafa likh raha hoon, tum log sab chor ho koi kaam dhang se nahi karte, itni ghatiya service hai ke sharam aani chahiye. Hamare ilaqe Block 7 Gulshan mein pichle char din se gas bilkul band hai, choolhe thande pare hain, auratain subah se nashte ke liye taras rahi hain aur bahar se khana mangwana par raha hai jo hum afford nahi kar sakte. Meharbani karke is gas ke masle ko foran theek karein warna hum ehtijaj karein ge.';

  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-citizen-token',
    },
    body: JSON.stringify({ ...draftBase, description: fahadText }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.reference_number, 'KHI-2026-HTTP01');
  assert.deepEqual(data.prediction.departments, ['ssgc']);
  assert.equal(data.prediction.needsReview, false);
  assert.equal(db.writes.length, 1);
  assert.equal(db.writes[0].args.p_predicted_department_id, 'ssgc');
  assert.equal(db.writes[0].args.p_needs_review, false);
});

test('Local HTTP Server: Clarification answer processed over real HTTP', async () => {
  const db = createMockDatabase();
  const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
  const clarificationAnswer = {
    draftText: ambiguousText,
    questionId: 'describe_issue',
    details: 'Gas band hai choolhe nahi jal rahe',
  };

  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-citizen-token',
    },
    body: JSON.stringify({
      ...draftBase,
      description: ambiguousText,
      clarificationAnswer,
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.prediction.departments, ['ssgc']);
  assert.equal(data.prediction.needsReview, false);
  assert.equal(db.writes[0].args.p_predicted_department_id, 'ssgc');
  assert.equal(db.writes[0].args.p_needs_review, false);
});

test('Local HTTP Server: Ambiguous submission without clarification answer routes to review over real HTTP', async () => {
  const db = createMockDatabase();
  const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';

  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-citizen-token',
    },
    body: JSON.stringify({
      ...draftBase,
      description: ambiguousText,
    }),
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.prediction.needsReview, true);
  assert.equal(data.prediction.reviewReason, 'UNRESOLVED_AMBIGUITY');
  assert.equal(db.writes[0].args.p_needs_review, true);
});

test('Local HTTP Server: Complaints over 200 words return 400 Bad Request over real HTTP', async () => {
  const words201 = Array(201).fill('masla').join(' ');
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer valid-citizen-token',
    },
    body: JSON.stringify({ ...draftBase, description: words201 }),
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.code, 'INVALID_COMPLAINT_PAYLOAD');
});

test('Local HTTP Server: Expired session returns 401 Unauthorized over real HTTP', async () => {
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer expired',
    },
    body: JSON.stringify({ ...draftBase, description: 'gas band hai' }),
  });

  assert.equal(response.status, 401);
});

test('Local HTTP Server: Caller cannot forge demonstration mode', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, description: 'Hamare ilaqe mein gas nahi aa rahi', isDemonstration: true }),
  });
  assert.equal(response.status, 200);
  assert.equal(db.writes.length, 1);
  assert.equal(db.writes[0].args.p_is_demonstration, false);
});

test('Local HTTP Server: Oversized payload rejected even under the 200-word limit', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, description: 'gas' + 'a'.repeat(20_000) }),
  });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, 'PAYLOAD_TOO_LARGE');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Malformed JSON returns 400 without database writes', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"description":',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_COMPLAINT_PAYLOAD');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Missing spaces cannot bypass per-field length limits', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, description: 'gas band hai', citizenName: 'X'.repeat(241) }),
  });
  assert.equal(response.status, 400);
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Quota database outage fails closed without complaint writes', async () => {
  const db = createMockDatabase(undefined, { data: null, error: { code: 'QUOTA_DB_OFFLINE' } });
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, description: 'Gas ki supply bilkul band hai' }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'INTAKE_QUOTA_UNAVAILABLE');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Shared quota denial returns Retry-After without classifier write', async () => {
  const db = createMockDatabase(undefined, { data: false, error: null });
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, description: 'Gas ki supply bilkul band hai' }),
  });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).code, 'RATE_LIMITED');
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Missing incident coordinates rejected with LOCATION_REQUIRED before DB writes', async () => {
  const db = createMockDatabase();
  const { incidentLatitude: _a, incidentLongitude: _b, ...withoutCoords } = draftBase;
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...withoutCoords, description: 'Gas ki supply band hai' }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'LOCATION_REQUIRED');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Swapped lat/lon rejected with INVALID_COORDINATES before DB writes', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, incidentLatitude: 67.0011, incidentLongitude: 24.8607, description: 'Gas band hai' }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'INVALID_COORDINATES');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Out-of-Sindh coordinates (Lahore) rejected with OUTSIDE_SINDH and zero writes', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draftBase, incidentLatitude: 31.5204, incidentLongitude: 74.3587, description: 'Gas band hai' }),
  });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, 'OUTSIDE_SINDH');
  assert.equal(db.writes.length, 0);
});

test('Local HTTP Server: Sindh outside Karachi (Hyderabad) triggers UNSUPPORTED_SERVICE_AREA for Karachi-only department', async () => {
  const db = createMockDatabase();
  const response = await fetch(`${baseUrl}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...draftBase,
      incidentLatitude: 25.3960,
      incidentLongitude: 68.3578,
      description: 'Hamare mohalle ki sadak toot chuki hai KMC repair chahiye',
    }),
  });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, 'UNSUPPORTED_SERVICE_AREA');
  assert.equal(db.writes.length, 0);
});

test.after(() => {
  server.close();
});
