// Offline contract tests for the actual Edge entry points. Node 24+.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

let client;
let handler;
globalThis.Deno = {
  serve(fn) { handler = fn; },
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
const notify = handler;
await import('../../supabase/functions/submit-classified-complaint/index.ts');
const submit = handler;

function database(tables, user = { id: 'test-user' }) {
  const reads = [];
  const writes = [];
  client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      reads.push(table);
      let rows = tables[table] ?? [];
      const query = {
        select() { return query; },
        eq(key, val) { rows = rows.filter(row => row[key] === val); return query; },
        in(key, vals) { rows = rows.filter(row => vals.includes(row[key])); return query; },
        order() { return query; }, limit() { return query; },
        maybeSingle: async () => ({ data: rows[0] ?? null }),
        then(resolve) { resolve({ data: rows }); },
        insert: async record => { writes.push(record); return { error: null }; },
      };
      return query;
    },
    rpc: async (_name, args) => { writes.push(args); return { data: {} }; },
  };
  return { reads, writes };
}
const request = (body, token) => new Request('https://local.invalid', {
  method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body: JSON.stringify(body),
});
const citizen = { role: 'citizen', id: 'test-user' };
const staff = { ...citizen, role: 'department_staff' };
const complaint = { id: 'case', status: 'resolved', assigned_department_id: 'kwsc' };
const membership = { user_id: staff.id, department_id: 'kwsc', status: 'active' };
const notice = { complaintId: complaint.id, newStatus: complaint.status };
for (const [label, profile, member, status, expected] of [
  ['citizen', citizen, membership, 'resolved', 403],
  ['inactive staff', staff, { ...membership, status: 'revoked' }, 'resolved', 403],
  ['other department', staff, { ...membership, department_id: 'ssgc' }, 'resolved', 404],
  ['stale status', staff, membership, 'in_progress', 409],
]) {
  test('notification boundary for ' + label, async () => {
    const db = database({ profiles: [profile], department_memberships: [member], complaints: [complaint] });
    assert.equal((await notify(request({ ...notice, newStatus: status }, 'session'))).status, expected);
    assert.ok(!db.reads.includes('complaint_citizen_private'));
    assert.equal(db.writes.length, 0);
  });
}
test('matching staff and recorded event can check delivery', async () => {
  const db = database({ profiles: [staff], department_memberships: [membership], complaints: [complaint],
    complaint_timeline_events: [{ complaint_id: 'case', id: 'recorded', status: 'resolved' }] });
  const response = await notify(request(notice, 'session'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).delivered, false);
  assert.ok(db.reads.includes('complaint_citizen_private'));
});
test('notification renders recorded remarks and escapes ordinary text in provider payload', async (t) => {
  const sent = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response('{}', { status: 200 });
  });
  database({ profiles: [staff], department_memberships: [membership],
    complaints: [{ ...complaint, reference_number: 'TEST-1', incident_district: 'Central', incident_locality: 'A & B' }],
    complaint_timeline_events: [{ complaint_id: 'case', id: 'event', status: 'resolved', description: 'Work A & B finished' }],
    complaint_citizen_private: [{ complaint_id: 'case', citizen_email: 'fixture@example.invalid', citizen_name: 'Fixture' }] });
  const res = await notify(request({ ...notice, note: 'Draft remark' }, 'session'));
  assert.equal(res.status, 200);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].html.includes('Work A &amp; B finished'));
  assert.ok(!sent[0].html.includes('Draft remark'));
});
const draft = { incidentDistrict: 'Central', incidentLocality: 'Nazimabad', incidentPublicLocation: 'Gali 1',
  citizenName: 'Test', citizenPhone: 'private fixture', residentialAddress: 'test address', description: 'gas leak ki boo aa rahi hai' };
for (const [label, token, owner] of [['guest', 'public-test-key', null], ['citizen', 'session', citizen.id]]) {
  test('V11 submission classifier uses bundled Run004 artifact for ' + label, async () => {
    const db = database({ profiles: [citizen] });
    const response = await submit(request(draft, token));
    assert.equal(response.status, 200);
    const { prediction } = await response.json();
    assert.ok(prediction.departments.includes('ssgc'));
    assert.ok(Object.values(prediction.probabilities).every(Number.isFinite));
    assert.equal(db.writes[0].p_citizen_id, owner);
  });
}
test('expired session cannot silently create a guest case', async () => {
  const db = database({}, null);
  assert.equal((await submit(request(draft, 'expired'))).status, 401);
  assert.equal(db.writes.length, 0);
});
test('privacy uncertainty holds the assignment and substitutes safe staff text', async () => {
  const db = database({ profiles: [citizen] });
  const description = 'Gas leak ho rahi hai, mera reference 12345678 hai';
  const response = await submit(request({ ...draft, description }, 'session'));
  assert.equal(response.status, 200);
  const saved = db.writes[0];
  assert.equal(saved.p_needs_review, true);
  assert.equal(saved.p_description, description);
  assert.equal(saved.p_sanitized_description, 'Complaint pending privacy review.');
  assert.ok(saved.p_redaction_flags.multi_department_routing.issues.every(issue => issue.status === 'under_review'));
});

// V13.0 Real Citizen Submission & V11 Integration Tests (Examples A-F)
test('Example A: Fahad paragraph with frustration routes cleanly to SSGC without admin hold', async () => {
  const db = database({ profiles: [citizen] });
  const fahadText = 'Mera naam Fahad hai. Yeh teesri dafa likh raha hoon, tum log sab chor ho koi kaam dhang se nahi karte, itni ghatiya service hai ke sharam aani chahiye. Hamare ilaqe Block 7 Gulshan mein pichle char din se gas bilkul band hai, choolhe thande pare hain, auratain subah se nashte ke liye taras rahi hain aur bahar se khana mangwana par raha hai jo hum afford nahi kar sakte. Meharbani karke is gas ke masle ko foran theek karein warna hum ehtijaj karein ge.';
  const response = await submit(request({ ...draft, description: fahadText }, 'session'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.prediction.departments, ['ssgc']);
  assert.equal(body.prediction.needsReview, false);
  const saved = db.writes[0];
  assert.equal(saved.p_predicted_department_id, 'ssgc');
  assert.equal(saved.p_needs_review, false);
  assert.ok(!saved.p_sanitized_description.includes('ghatiya'));
});

test('Example B: Causal consequence routes only to responsible department', async () => {
  const db = database({ profiles: [citizen] });
  const causalText = 'K-Electric ki taar toot kar gir gayi jis se kachray mein aag lag gayi';
  const response = await submit(request({ ...draft, description: causalText }, 'session'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.prediction.departments, ['kelectric']);
  const saved = db.writes[0];
  assert.equal(saved.p_predicted_department_id, 'kelectric');
});

test('Example C: Independent faults route to multiple departments', async () => {
  const db = database({ profiles: [citizen] });
  const dualText = 'Bijli bhi teen din se band hai aur gutter ka ganda pani bhi sadak par beh raha hai';
  const response = await submit(request({ ...draft, description: dualText }, 'session'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.prediction.departments.includes('kelectric'));
  assert.ok(body.prediction.departments.includes('kwsc'));
  assert.equal(body.prediction.isMultiLabel, true);
  const saved = db.writes[0];
  const routing = saved.p_redaction_flags.multi_department_routing;
  assert.equal(routing.is_multilabel, true);
  assert.ok(routing.departments.includes('kelectric'));
  assert.ok(routing.departments.includes('kwsc'));
});

test('Example D: Genuine ambiguity without clarification answer flags UNRESOLVED_AMBIGUITY', async () => {
  const db = database({ profiles: [citizen] });
  const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
  const response = await submit(request({ ...draft, description: ambiguousText }, 'session'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.prediction.needsReview, true);
  assert.equal(body.prediction.reviewReason, 'UNRESOLVED_AMBIGUITY');
  const saved = db.writes[0];
  assert.equal(saved.p_needs_review, true);
});

test('Example E: Genuine ambiguity resolved by citizen clarification routes to target department', async () => {
  const db = database({ profiles: [citizen] });
  const ambiguousText = 'Hamare ilaqe mein bohot shadeed masla hai log bohot pareshan hain kripya madad karein';
  const clarificationAnswer = {
    draftText: ambiguousText,
    questionId: 'describe_issue',
    details: 'Gas band hai choolha nahi chal raha'
  };
  const response = await submit(request({ ...draft, description: ambiguousText, clarificationAnswer }, 'session'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.prediction.departments, ['ssgc']);
  assert.equal(body.prediction.needsReview, false);
  const saved = db.writes[0];
  assert.equal(saved.p_predicted_department_id, 'ssgc');
  assert.equal(saved.p_needs_review, false);
});

test('Example F: Word limit validation strictly enforced at 200 words', async () => {
  const db = database({ profiles: [citizen] });
  const words201 = Array(201).fill('masla').join(' ');
  const responseOver = await submit(request({ ...draft, description: words201 }, 'session'));
  assert.equal(responseOver.status, 400);
  const bodyOver = await responseOver.json();
  assert.equal(bodyOver.code, 'INVALID_COMPLAINT_PAYLOAD');
  assert.equal(db.writes.length, 0);

  const words50 = 'Block 7 Gulshan mein gas band hai. ' + Array(40).fill('masla').join(' ');
  const responseOk = await submit(request({ ...draft, description: words50 }, 'session'));
  assert.equal(responseOk.status, 200);
  assert.equal(db.writes.length, 1);
});
