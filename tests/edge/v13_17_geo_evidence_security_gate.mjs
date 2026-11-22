import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(new URL('../../supabase/migrations/20261202000000_v13_17_private_issue_evidence_and_public_map.sql', import.meta.url), 'utf8');
const uploader = readFileSync(new URL('../../supabase/functions/upload-complaint-photo/index.ts', import.meta.url), 'utf8');
const intake = readFileSync(new URL('../../supabase/functions/submit-classified-complaint/index.ts', import.meta.url), 'utf8');

test('exact incident coordinates and evidence metadata require RLS', () => {
  assert.match(migration, /ALTER TABLE public\.complaint_geo_points ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /ALTER TABLE public\.complaint_evidence ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON public\.complaint_geo_points, public\.complaint_evidence FROM anon, authenticated/i);
  assert.match(migration, /m\.department_id = ANY\(coalesce\(c\.assigned_department_ids/i);
});

test('public map is a k-anonymous aggregate, not a public SELECT on coordinates', () => {
  assert.match(migration, /HAVING count\(\*\) >= 8/i);
  assert.match(migration, /floor\(g\.latitude \/ 0\.09\)/i);
  assert.match(migration, /JOIN public\.complaints c ON c\.id = g\.complaint_id/i);
  assert.doesNotMatch(migration, /GRANT SELECT ON public\.complaint_geo_points TO anon/i);
});

test('photos require owner proof and reject non-images or oversized files', () => {
  assert.match(uploader, /MAX_FILE = 1024 \* 1024/);
  assert.match(uploader, /acceptedFile\(fileBytes, file\.type\)/);
  assert.match(uploader, /guest_tracking_hash/);
  assert.match(uploader, /identity\.user\.id === complaint\.citizen_id/);
  assert.match(uploader, /upsert: false/);
  assert.doesNotMatch(uploader, /console\.log\(.*tracking/);
});

test('GPS coordinates cannot silently alter routing or bypass Karachi bounds', () => {
  assert.match(intake, /INVALID_INCIDENT_PIN/);
  assert.match(intake, /complaint_geo_points/);
  assert.match(intake, /incident_location_saved/);
  assert.match(intake, /admin\.rpc\("submit_citizen_complaint"/);
});
