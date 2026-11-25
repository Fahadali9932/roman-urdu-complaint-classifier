// Local HTTP integration and security tests for V14 dual Before/After work proof pipeline. Node 24+.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import test from 'node:test';

let adminMock;
let handler;

globalThis.Deno = {
  serve(fn) { handler = fn; },
  env: {
    get(key) {
      return {
        SUPABASE_URL: 'https://local-proof.supabase.invalid',
        SUPABASE_SERVICE_ROLE_KEY: 'local-service-role-test-key',
      }[key];
    },
  },
};
globalThis.makeProofClient = () => adminMock;

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith('jsr:')) return next(specifier, context);
    const source = specifier.includes('supabase-js') ? 'export const createClient = globalThis.makeProofClient;' : '';
    return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  },
});

await import('../../supabase/functions/upload-department-work-proof/index.ts');

const AAL2_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const AAL2_PAYLOAD = Buffer.from(JSON.stringify({ sub: 'officer-1', aal: 'aal2' })).toString('base64url');
const AAL2_TOKEN = `${AAL2_HEADER}.${AAL2_PAYLOAD}.sig`;
const AAL1_TOKEN = `${AAL2_HEADER}.${Buffer.from(JSON.stringify({ sub: 'officer-1', aal: 'aal1' })).toString('base64url')}.sig`;

// Minimal valid PNG & JPEG magic-byte buffers
const VALID_PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
const VALID_JPEG = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]);

function createMockAdmin(options = {}) {
  const uploaded = [];
  const removed = [];
  const rpcCalls = [];
  adminMock = {
    auth: {
      getUser: async () => ({ data: { user: { id: options.userId ?? 'officer-1' } }, error: null }),
    },
    from(table) {
      const state = { filters: {} };
      const q = {
        select() { return q; },
        eq(k, v) { state.filters[k] = v; return q; },
        maybeSingle: async () => {
          if (table === 'department_work_orders') {
            return {
              data: options.order ?? {
                id: '11111111-1111-4111-8111-111111111111',
                department_id: 'kmc',
                officer_id: 'officer-1',
                status: 'in_progress',
              },
              error: null,
            };
          }
          if (table === 'department_memberships') {
            return {
              data: options.membership === null ? null : { id: 'mem-1' },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return q;
    },
    storage: {
      from() {
        return {
          upload: async (path, bytes) => {
            if (options.failBeforeUpload && path.includes('before-')) {
              return { error: new Error('Storage write failed') };
            }
            uploaded.push({ path, bytes: bytes.length });
            return { error: null };
          },
          remove: async (paths) => {
            removed.push(...paths);
            return { error: null };
          },
        };
      },
    },
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (options.failRpc) return { data: null, error: { message: 'RPC failed' } };
      return { data: 'proof-uuid-1234', error: null };
    },
  };
  return { uploaded, removed, rpcCalls };
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) { for (const x of v) headers.append(k, x); } else if (v) headers.set(k, v);
  }
  const webRes = await handler(new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers,
    body,
  }));
  res.statusCode = webRes.status;
  for (const [k, v] of webRes.headers.entries()) res.setHeader(k, v);
  res.end(await webRes.text());
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const endpoint = `http://127.0.0.1:${port}/proof`;

function buildForm({ before = null, after = VALID_PNG, lat = '24.8607', lon = '67.0011', accuracy = '15' } = {}) {
  const form = new FormData();
  form.append('orderId', '11111111-1111-4111-8111-111111111111');
  form.append('latitude', lat);
  form.append('longitude', lon);
  form.append('accuracy', accuracy);
  if (after) form.append('photo', new Blob([after], { type: 'image/png' }), 'after.png');
  if (before) form.append('beforePhoto', new Blob([before], { type: 'image/jpeg' }), 'before.jpg');
  return form;
}

test('dual before + after proof upload succeeds (>1 MB combined allowed) and persists both paths atomically', async () => {
  const mock = createMockAdmin();
  const largeBefore = Buffer.alloc(750 * 1024);
  largeBefore.set(VALID_JPEG, 0);
  const largeAfter = Buffer.alloc(750 * 1024);
  largeAfter.set(VALID_PNG, 0);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL2_TOKEN}` },
    body: buildForm({ before: largeBefore, after: largeAfter }),
  });

  assert.equal(res.status, 201);
  const payload = await res.json();
  assert.equal(payload.submitted, true);
  assert.equal(mock.uploaded.length, 2);
  assert.equal(mock.removed.length, 0);
  assert.equal(mock.rpcCalls.length, 1);
  assert.equal(mock.rpcCalls[0].name, 'v1318_record_proof');
  assert.ok(mock.rpcCalls[0].args.p_path.includes('after-'));
  assert.ok(mock.rpcCalls[0].args.p_before_path.includes('before-'));
  assert.match(mock.rpcCalls[0].args.p_sha256, /^[a-f0-9]{64}$/);
  assert.match(mock.rpcCalls[0].args.p_before_sha256, /^[a-f0-9]{64}$/);
});

test('partial upload failure cleans up after-photo and leaves zero orphaned objects', async () => {
  const mock = createMockAdmin({ failBeforeUpload: true });
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL2_TOKEN}` },
    body: buildForm({ before: VALID_JPEG, after: VALID_PNG }),
  });

  assert.equal(res.status, 503);
  assert.equal(mock.uploaded.length, 1);
  assert.equal(mock.removed.length, 1);
  assert.equal(mock.removed[0], mock.uploaded[0].path);
  assert.equal(mock.rpcCalls.length, 0);
});

test('RPC persistence failure cleans up BOTH before and after uploaded objects', async () => {
  const mock = createMockAdmin({ failRpc: true });
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL2_TOKEN}` },
    body: buildForm({ before: VALID_JPEG, after: VALID_PNG }),
  });

  assert.equal(res.status, 409);
  assert.equal(mock.uploaded.length, 2);
  assert.equal(mock.removed.length, 2);
});

test('rejects invalid magic bytes (fake before-image) before storage writes', async () => {
  const mock = createMockAdmin();
  const fakeBytes = Buffer.from('not-actually-a-jpeg-file');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL2_TOKEN}` },
    body: buildForm({ before: fakeBytes, after: VALID_PNG }),
  });
  assert.equal(res.status, 400);
  assert.equal(mock.uploaded.length, 0);
});

test('requires AAL2 assurance and rejects AAL1 tokens', async () => {
  const mock = createMockAdmin();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL1_TOKEN}` },
    body: buildForm({ after: VALID_PNG }),
  });
  assert.equal(res.status, 401);
  assert.equal(mock.uploaded.length, 0);
});

test('out-of-Sindh GPS coordinates rejected cleanly', async () => {
  const mock = createMockAdmin();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AAL2_TOKEN}` },
    body: buildForm({ lat: '31.5204', lon: '74.3587' }),
  });
  assert.equal(res.status, 400);
  assert.equal(mock.uploaded.length, 0);
});

test('V14 SQL migration preserves history, defines before_* columns, and grants dual download access', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20261205000000_v14_sindh_geo_and_dual_work_proof.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /ADD COLUMN IF NOT EXISTS before_storage_path text UNIQUE/i);
  assert.match(migration, /e\.storage_path = p_path OR e\.before_storage_path = p_path/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.v14_my_work_proofs/i);
});

test.after(() => server.close());
