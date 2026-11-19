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

function createMockDatabase(user = { id: 'test-user', role: 'citizen' }) {
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
      };
    },
    rpc: async (fn, args) => {
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

test.after(() => {
  server.close();
});
