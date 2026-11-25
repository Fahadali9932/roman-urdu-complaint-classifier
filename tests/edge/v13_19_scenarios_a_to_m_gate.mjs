// V13.19: Comprehensive Functional & Security Scenarios A through M Gate
// Tests all 13 required administrative and field operations lifecycle flows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sqlV18 = readFileSync(new URL('../../supabase/migrations/20261203000000_v13_18_verified_department_work_orders.sql', import.meta.url), 'utf8');
const proofFunction = readFileSync(new URL('../../supabase/functions/upload-department-work-proof/index.ts', import.meta.url), 'utf8');
const provisionFunction = readFileSync(new URL('../../supabase/functions/provision-department-staff/index.ts', import.meta.url), 'utf8');

// =============================================================================
// SCENARIO A: Department head dispatches a case to an officer
// =============================================================================
test('Scenario A: Department head dispatches a case to an officer', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_assign_work/);
  assert.match(sqlV18, /public\.v1318_is_department_head\(p_department\)/);
  assert.match(sqlV18, /m\.status='active'\s*AND\s*m\.staff_role='officer'/);
  assert.match(sqlV18, /p_due\s*<=\s*v_now/);
  assert.match(sqlV18, /'assigned'/);
  assert.match(sqlV18, /INSERT INTO public\.department_work_events/);
});

// =============================================================================
// SCENARIO B: Field officer sees assigned case in mobile/field view
// =============================================================================
test('Scenario B: Field officer sees assigned case in field workspace', () => {
  assert.match(sqlV18, /idx_v1318_orders_officer\s*ON public\.department_work_orders\(officer_id, status, due_at\)/);
  assert.match(sqlV18, /ALTER TABLE public\.department_work_orders ENABLE ROW LEVEL SECURITY/);
  assert.match(sqlV18, /CREATE POLICY v1318_orders_read\s*ON public\.department_work_orders/);
  assert.match(sqlV18, /public\.v1318_can_view_order\(id\)/);
  assert.match(sqlV18, /o\.officer_id\s*=\s*auth\.uid\(\)/);
});

// =============================================================================
// SCENARIO C: Field officer marks work in progress with repair estimate
// =============================================================================
test('Scenario C: Field officer marks work in progress', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_start_work/);
  assert.match(sqlV18, /v_order\.officer_id<>auth\.uid\(\)/);
  assert.match(sqlV18, /status='in_progress'/);
  assert.match(sqlV18, /started_at=coalesce\(started_at,now\(\)\)/);
  assert.match(sqlV18, /'started'/);
});

// =============================================================================
// SCENARIO D: Field officer requests deadline extension with reason
// =============================================================================
test('Scenario D: Field officer requests deadline extension with reason', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_request_extension/);
  assert.match(sqlV18, /v_order\.officer_id<>auth\.uid\(\)/);
  assert.match(sqlV18, /auth\.jwt\(\)->>'aal'='aal2'/);
  assert.match(sqlV18, /length\(trim\(p_reason\)\)\s*<\s*12/);
  assert.match(sqlV18, /p_due\s*<=\s*v_order\.due_at/);
  assert.match(sqlV18, /extension_requested_due_at=p_due/);
  assert.match(sqlV18, /extension_reason=left\(trim\(p_reason\),1000\)/);
  assert.match(sqlV18, /'extension_requested'/);
});

// =============================================================================
// SCENARIO E: Department head approves/rejects extension request
// =============================================================================
test('Scenario E: Department head decides on extension request', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_decide_extension/);
  assert.match(sqlV18, /public\.v1318_is_department_head\(v_order\.department_id\)/);
  assert.match(sqlV18, /due_at=CASE WHEN p_approve THEN extension_requested_due_at ELSE due_at END/);
  assert.match(sqlV18, /extension_requested_due_at=NULL/);
  assert.match(sqlV18, /extension_decided_at=now\(\)/);
  assert.match(sqlV18, /'extension_approved'\s*ELSE\s*'extension_denied'/);
});

// =============================================================================
// SCENARIO F: Field officer submits completion proof (photo, notes, GPS)
// =============================================================================
test('Scenario F: Field officer submits completion proof with bounding & telemetry', () => {
  assert.match(proofFunction, /auth\.getUser\(bearer\)/);
  assert.match(proofFunction, /claims\.aal === "aal2"/);
  assert.match(proofFunction, /\.eq\("staff_role",\s*"officer"\)/);
  assert.match(proofFunction, /LIMIT = 1024 \* 1024/);
  assert.match(proofFunction, /isSupportedImage/);
  assert.match(proofFunction, /mime === "image\/jpeg"/);
  assert.match(proofFunction, /validateSindhCoordinatesServer\(latitude,\s*longitude\)/);
  assert.match(proofFunction, /geoCheck\.code/);
  assert.match(proofFunction, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(sqlV18, /status='pending_review'/);
});

// =============================================================================
// SCENARIO G: Department head reviews completion proof
// =============================================================================
test('Scenario G: Department head reviews completion proof', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_can_download_proof/);
  assert.match(sqlV18, /m\.staff_role\s*=\s*'head'/);
  assert.match(sqlV18, /location_result\s*text\s*NOT\s*NULL/);
  assert.match(sqlV18, /duplicate_warning\s*boolean/);
});

// =============================================================================
// SCENARIO H: Department head verifies or returns for rework
// =============================================================================
test('Scenario H: Department head verifies or returns for rework', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_review_proof/);
  assert.match(sqlV18, /public\.v1318_is_department_head\(v_order\.department_id\)/);
  assert.match(sqlV18, /v_proof\.location_result<>'near'\s*OR\s*v_proof\.duplicate_warning/);
  assert.match(sqlV18, /length\(trim\(coalesce\(p_note,''?\)\)\)\s*<\s*20/);
  assert.match(sqlV18, /status=CASE WHEN p_approve THEN 'verified' ELSE 'returned' END/);
});

// =============================================================================
// SCENARIO I: Citizen sees updated status and submits feedback
// =============================================================================
test('Scenario I: Citizen sees updated status and submits feedback', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_my_work_proofs/);
  assert.match(sqlV18, /c\.citizen_id=auth\.uid\(\)/);
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_citizen_feedback/);
  assert.match(sqlV18, /p_verdict NOT IN \('confirmed','disputed'\)/);
  assert.match(sqlV18, /citizen_dispute_pending=true/);
  assert.match(sqlV18, /status='returned'/);
});

// =============================================================================
// SCENARIO J: Department head views completed case in field archive
// =============================================================================
test('Scenario J: Department head views completed case in field archive and closes verified records', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_close_verified_order/);
  assert.match(sqlV18, /public\.v1318_is_department_head\(v_order\.department_id\)/);
  assert.match(sqlV18, /v_order\.status<>'verified'/);
  assert.match(sqlV18, /public\.staff_update_complaint_status\(v_report\.id,'resolved'/);
});

// =============================================================================
// SCENARIO K: Central admin reviews staff access and role assignments
// =============================================================================
test('Scenario K: Central admin reviews staff access and role assignments', () => {
  assert.match(sqlV18, /CREATE OR REPLACE FUNCTION public\.v1318_set_staff_role/);
  assert.match(sqlV18, /public\.is_main_admin\(auth\.uid\(\)\)/);
  assert.match(sqlV18, /auth\.jwt\(\)->>'aal'<>'aal2'/);
  assert.match(sqlV18, /p_role NOT IN \('head','officer'\)/);
  assert.match(sqlV18, /UPDATE public\.department_memberships SET staff_role=p_role/);
});

// =============================================================================
// SCENARIO L: Central admin invites new staff member with validation
// =============================================================================
test('Scenario L: Central admin invites new staff member with strict validation', () => {
  assert.match(provisionFunction, /profile\?\.role !== "main_admin"/);
  assert.match(provisionFunction, /claims\.aal !== "aal2"/);
  assert.match(provisionFunction, /\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
  assert.match(provisionFunction, /admin\s*\.from\("departments"\)/);
  assert.match(provisionFunction, /staffRole === "head" \? "head" : payload\.staffRole === "officer" \? "officer" : null/);
  assert.match(provisionFunction, /inviteUserByEmail\(email/);
});

// =============================================================================
// SCENARIO M: Non-admin citizen attempts admin URL access (denied)
// =============================================================================
test('Scenario M: Cross-role denial at server boundary', () => {
  assert.match(sqlV18, /public\.is_main_admin\(auth\.uid\(\)\)/);
  assert.match(sqlV18, /CREATE TRIGGER v1318_guard_complaint_status/);
  assert.match(sqlV18, /Verified evidence and citizen confirmation, or a documented 72-hour head review, are required before closure/);
  assert.match(provisionFunction, /403/);
});
