/**
 * AWAAZ-E-AWAM — PHASE 3B: DATABASE SECURITY & PRIVACY VERIFICATION TEST SUITE
 *
 * Verifies the Core Supabase Database Foundation:
 * 1. Citizen complaint intake without requiring a subject/title
 * 2. Database-enforced citizen ownership (NO header-based bypass)
 * 3. Department isolation (KWSC staff sees only KWSC; SSWMB sees only SSWMB)
 * 4. STRICT ZERO-PII RETRIEVAL: Department staff never receive private citizen names,
 *    phone numbers, email addresses or residential addresses.
 * 5. Direct mutation denials (Citizens and staff cannot directly update/delete complaints)
 * 6. Status workflow transitions via privileged RPC (submitted -> under_review -> assigned -> in_progress -> resolved/rejected)
 * 7. Immediate denial of protected operations after access revocation
 * 8. Server-enforced authentication rate limiting with progressive backoff
 * 9. Admin staff provisioning and complaint reassignment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';

describe('Phase 3B — Core Supabase Database Foundation & Security Tests', () => {
  const CITIZEN_A_ID = 'cit-user-bilal-001';
  const CITIZEN_B_ID = 'cit-user-aisha-002';
  const KWSC_STAFF_ID = 'staff-kwsc-tariq-003';
  const SSWMB_STAFF_ID = 'staff-sswmb-farhan-004';
  const MAIN_ADMIN_ID = 'admin-tariq-mansoor-seed-2026';

  beforeEach(() => {
    localSupabaseAdapter.resetToDefault();

    // Setup Test Citizen Profiles
    localSupabaseAdapter.createTestProfile(
      CITIZEN_A_ID,
      'Muhammad Bilal',
      'bilal.citizen@awaaz-e-awam.pk',
      'citizen'
    );
    localSupabaseAdapter.createTestProfile(
      CITIZEN_B_ID,
      'Aisha Khan',
      'aisha.citizen@awaaz-e-awam.pk',
      'citizen'
    );

    // Setup Test Department Staff Profiles & Active Memberships
    localSupabaseAdapter.createTestProfile(
      KWSC_STAFF_ID,
      'Tariq Aziz (KW&SC)',
      'tariq.aziz@kwsc.gov.pk',
      'department_staff'
    );
    localSupabaseAdapter.createTestMembership(KWSC_STAFF_ID, 'kwsc', 'active');

    localSupabaseAdapter.createTestProfile(
      SSWMB_STAFF_ID,
      'Farhan Ahmed (SSWMB)',
      'farhan.ahmed@sswmb.gov.pk',
      'department_staff'
    );
    localSupabaseAdapter.createTestMembership(SSWMB_STAFF_ID, 'sswmb', 'active');

    // Setup Test Main Admin Profile
    localSupabaseAdapter.createTestProfile(
      MAIN_ADMIN_ID,
      'Chief Administrator',
      'chief.admin@awaaz-e-awam.pk',
      'main_admin'
    );
  });

  // ---------------------------------------------------------------------------
  // 1. Citizen Complaint Intake: Title is Optional/Not Required
  // ---------------------------------------------------------------------------
  it('allows citizens to file complaints without a subject/title (title defaults to null)', () => {
    const insertRes = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-0001',
        citizen_id: CITIZEN_A_ID,
        // No title provided
        description: 'Main pipeline leak in Gulshan Block 5 causing water disruption.',
        incident_district: 'District East',
        incident_locality: 'Gulshan-e-Iqbal',
        incident_public_location: 'Near Disco Bakery, Block 5',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID
    );

    expect(insertRes.success).toBe(true);
    expect(insertRes.complaint).toBeDefined();
    expect(insertRes.complaint?.title).toBeNull();
    expect(insertRes.complaint?.status).toBe('submitted');
    expect(insertRes.complaint?.assigned_department_id).toBe('kwsc');
  });

  // ---------------------------------------------------------------------------
  // 2. Database-Enforced Citizen Ownership (No Header Bypass)
  // ---------------------------------------------------------------------------
  it('enforces database-level citizen ownership: Citizen A cannot view Citizen B complaints', () => {
    // Citizen A files Complaint A
    const resA = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-0001',
        citizen_id: CITIZEN_A_ID,
        description: 'Citizen A complaint regarding water supply.',
        incident_district: 'District East',
        incident_locality: 'Gulshan-e-Iqbal',
        incident_public_location: 'Block 5',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID
    );

    // Citizen B files Complaint B
    const resB = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-0002',
        citizen_id: CITIZEN_B_ID,
        description: 'Citizen B complaint regarding garbage heap.',
        incident_district: 'District South',
        incident_locality: 'Clifton',
        incident_public_location: 'Block 2',
        assigned_department_id: 'sswmb',
      },
      CITIZEN_B_ID
    );

    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);

    // Query as Citizen A
    const citizenAComplaints = localSupabaseAdapter.selectComplaints(CITIZEN_A_ID);
    expect(citizenAComplaints).toHaveLength(1);
    expect(citizenAComplaints[0].reference_number).toBe('KHI-2026-0001');

    // Query as Citizen B
    const citizenBComplaints = localSupabaseAdapter.selectComplaints(CITIZEN_B_ID);
    expect(citizenBComplaints).toHaveLength(1);
    expect(citizenBComplaints[0].reference_number).toBe('KHI-2026-0002');
  });

  it('rejects complaint insertion if caller attempts to impersonate another citizen id', () => {
    const maliciousInsert = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-SPOOF',
        citizen_id: CITIZEN_B_ID, // Citizen B's ID
        description: 'Spoofed complaint attempt',
        incident_district: 'District East',
        incident_locality: 'Gulshan',
        incident_public_location: 'Block 1',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID // Authenticated as Citizen A
    );

    expect(maliciousInsert.success).toBe(false);
    expect(maliciousInsert.error).toContain('RLS Permission Denied');
  });

  // ---------------------------------------------------------------------------
  // 3. Department Isolation
  // ---------------------------------------------------------------------------
  it('enforces strict department isolation: KWSC staff sees only KWSC cases; SSWMB sees only SSWMB', () => {
    // 2 KWSC complaints, 1 SSWMB complaint
    localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-KWSC-1',
        citizen_id: CITIZEN_A_ID,
        description: 'Water leak',
        incident_district: 'District East',
        incident_locality: 'Gulshan',
        incident_public_location: 'Block 5',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID
    );
    localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-KWSC-2',
        citizen_id: CITIZEN_B_ID,
        description: 'Sewer overflow',
        incident_district: 'District Central',
        incident_locality: 'Nazimabad',
        incident_public_location: 'Block 3',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_B_ID
    );
    localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-SSWMB-1',
        citizen_id: CITIZEN_A_ID,
        description: 'Garbage dump',
        incident_district: 'District South',
        incident_locality: 'Saddar',
        incident_public_location: 'Preedy Street',
        assigned_department_id: 'sswmb',
      },
      CITIZEN_A_ID
    );

    // KWSC Staff Query
    const kwscCases = localSupabaseAdapter.selectComplaints(KWSC_STAFF_ID);
    expect(kwscCases).toHaveLength(2);
    expect(kwscCases.every((c) => c.assigned_department_id === 'kwsc')).toBe(true);

    // SSWMB Staff Query
    const sswmbCases = localSupabaseAdapter.selectComplaints(SSWMB_STAFF_ID);
    expect(sswmbCases).toHaveLength(1);
    expect(sswmbCases[0].reference_number).toBe('KHI-2026-SSWMB-1');

    // Admin sees all 3
    const adminCases = localSupabaseAdapter.selectComplaints(MAIN_ADMIN_ID);
    expect(adminCases).toHaveLength(3);
  });

  // ---------------------------------------------------------------------------
  // 4. Zero PII Leakage: Department Staff CANNOT Retrieve Private Citizen Details
  // ---------------------------------------------------------------------------
  it('strictly protects private citizen details: Department staff receive NULL / zero PII rows', () => {
    const complaint = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-PRIV-1',
        citizen_id: CITIZEN_A_ID,
        description: 'Severe contamination in drinking line.',
        incident_district: 'District East',
        incident_locality: 'Gulshan-e-Iqbal',
        incident_public_location: 'Main Road near Masjid',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID
    ).complaint!;

    // Citizen inserts private contact & residential address
    const piiInsert = localSupabaseAdapter.insertCitizenPrivateDetails(
      {
        complaint_id: complaint.id,
        citizen_name: 'Muhammad Bilal',
        citizen_phone: '+92 300 2345678',
        citizen_email: 'bilal@personal-mail.com',
        residential_address: 'Flat 402, Al-Ghafoor Residency, Gulshan Block 13-D, Karachi',
      },
      CITIZEN_A_ID
    );
    expect(piiInsert.success).toBe(true);

    // Citizen can read own private PII
    const citizenRead = localSupabaseAdapter.selectCitizenPrivateDetails(complaint.id, CITIZEN_A_ID);
    expect(citizenRead).not.toBeNull();
    expect(citizenRead?.citizen_phone).toBe('+92 300 2345678');
    expect(citizenRead?.residential_address).toContain('Al-Ghafoor Residency');

    // Other citizen cannot read private PII
    const otherCitizenRead = localSupabaseAdapter.selectCitizenPrivateDetails(complaint.id, CITIZEN_B_ID);
    expect(otherCitizenRead).toBeNull();

    // Department staff assigned to this case attempts to read private PII -> RETURNS NULL!
    const staffRead = localSupabaseAdapter.selectCitizenPrivateDetails(complaint.id, KWSC_STAFF_ID);
    expect(staffRead).toBeNull(); // ZERO PII ACCESS

    // Admin can read private PII for authorized audit
    const adminRead = localSupabaseAdapter.selectCitizenPrivateDetails(complaint.id, MAIN_ADMIN_ID);
    expect(adminRead).not.toBeNull();
    expect(adminRead?.citizen_name).toBe('Muhammad Bilal');
  });

  // ---------------------------------------------------------------------------
  // 5. Direct Mutation Denials
  // ---------------------------------------------------------------------------
  it('denies direct UPDATE and DELETE on complaints to department staff and citizens', () => {
    const complaint = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-MUT-1',
        citizen_id: CITIZEN_A_ID,
        description: 'Road damage near Korangi crossing.',
        incident_district: 'District Korangi',
        incident_locality: 'Korangi',
        incident_public_location: 'Crossing Road',
        assigned_department_id: 'kmc',
      },
      CITIZEN_A_ID
    ).complaint!;

    // Citizen attempts direct update
    const citizenUpdate = localSupabaseAdapter.directUpdateComplaint(
      complaint.id,
      { status: 'resolved' },
      CITIZEN_A_ID
    );
    expect(citizenUpdate.success).toBe(false);
    expect(citizenUpdate.error).toContain('RLS Permission Denied');

    // Staff attempts direct update bypassing RPC
    const staffUpdate = localSupabaseAdapter.directUpdateComplaint(
      complaint.id,
      { status: 'resolved' },
      KWSC_STAFF_ID
    );
    expect(staffUpdate.success).toBe(false);
    expect(staffUpdate.error).toContain('RLS Permission Denied');

    // Staff attempts direct deletion
    const staffDelete = localSupabaseAdapter.directDeleteComplaint(complaint.id, KWSC_STAFF_ID);
    expect(staffDelete.success).toBe(false);
    expect(staffDelete.error).toContain('RLS Permission Denied');

    // Admin direct update is allowed
    const adminUpdate = localSupabaseAdapter.directUpdateComplaint(
      complaint.id,
      { title: 'Korangi Crossing Road Repair' },
      MAIN_ADMIN_ID
    );
    expect(adminUpdate.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Status Workflow Transitions via Privileged RPC
  // ---------------------------------------------------------------------------
  it('enforces valid status workflow transitions and rejects illegal jumps or unauthorized departments', () => {
    const complaint = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-WORKFLOW-1',
        citizen_id: CITIZEN_A_ID,
        description: 'KWSC pipe broken.',
        incident_district: 'District East',
        incident_locality: 'Gulshan',
        incident_public_location: 'Block 2',
        assigned_department_id: 'kwsc',
        status: 'submitted',
      },
      CITIZEN_A_ID
    ).complaint!;

    // 1. SSWMB staff tries to update KWSC complaint -> Rejected (Unauthorized department)
    const illegalDeptUpdate = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'under_review',
        title_en: 'Review',
        title_ur: 'جائزہ',
        note_en: 'Illegal attempt',
        note_ur: 'غیر قانونی کوشش',
      },
      SSWMB_STAFF_ID
    );
    expect(illegalDeptUpdate.success).toBe(false);
    expect(illegalDeptUpdate.error).toContain('Unauthorized');

    // 2. KWSC staff tries illegal jump: submitted -> resolved -> Rejected
    const illegalJump = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'resolved',
        title_en: 'Resolved immediately',
        title_ur: 'فوری حل',
        note_en: 'Premature resolution',
        note_ur: 'قبل از وقت حل',
      },
      KWSC_STAFF_ID
    );
    expect(illegalJump.success).toBe(false);
    expect(illegalJump.error).toContain('Invalid status transition');

    // 3. Valid transition: submitted -> under_review -> Succeeded
    const step1 = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'under_review',
        title_en: 'Under Review',
        title_ur: 'زیر غور',
        note_en: 'Assigned to field engineer',
        note_ur: 'فیلڈ انجینئر کو تفویض',
      },
      KWSC_STAFF_ID
    );
    expect(step1.success).toBe(true);
    expect(step1.new_status).toBe('under_review');

    // 4. Valid transition: under_review -> in_progress -> Succeeded
    const step2 = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'in_progress',
        title_en: 'Excavation Started',
        title_ur: 'کھدائی شروع',
        note_en: 'Machinery on site',
        note_ur: 'مشینری پہنچ گئی ہے',
      },
      KWSC_STAFF_ID
    );
    expect(step2.success).toBe(true);
    expect(step2.new_status).toBe('in_progress');

    // 5. Valid transition: in_progress -> resolved -> Succeeded
    const step3 = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'resolved',
        title_en: 'Pipeline Replaced',
        title_ur: 'پائپ لائن تبدیل کر دی گئی',
        note_en: 'Water pressure restored',
        note_ur: 'پانی کا پریشر بحال',
      },
      KWSC_STAFF_ID
    );
    expect(step3.success).toBe(true);
    expect(step3.new_status).toBe('resolved');

    // 6. Trying to modify terminal resolved complaint -> Rejected
    const postResolve = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'under_review',
        title_en: 'Reopen',
        title_ur: 'دوبارہ کھولیں',
        note_en: 'Attempt',
        note_ur: 'کوشش',
      },
      KWSC_STAFF_ID
    );
    expect(postResolve.success).toBe(false);
    expect(postResolve.error).toContain('Invalid status transition');

    // Verify timeline has 3 immutable records
    const timeline = localSupabaseAdapter.selectTimelineEvents(complaint.id, CITIZEN_A_ID);
    expect(timeline).toHaveLength(3);
    expect(timeline[0].status).toBe('under_review');
    expect(timeline[1].status).toBe('in_progress');
    expect(timeline[2].status).toBe('resolved');
  });

  // ---------------------------------------------------------------------------
  // 7. Immediate Revocation Denial
  // ---------------------------------------------------------------------------
  it('immediately denies complaint access and status updates when staff access is revoked', () => {
    const complaint = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-REV-1',
        citizen_id: CITIZEN_A_ID,
        description: 'KWSC pipeline issue.',
        incident_district: 'District East',
        incident_locality: 'Gulshan',
        incident_public_location: 'Block 1',
        assigned_department_id: 'kwsc',
      },
      CITIZEN_A_ID
    ).complaint!;

    // Initial check: KWSC staff sees 1 complaint
    expect(localSupabaseAdapter.selectComplaints(KWSC_STAFF_ID)).toHaveLength(1);

    // Admin revokes KWSC staff membership
    const membership = localSupabaseAdapter.getApprovedMemberships().find((m) => m.user_id === KWSC_STAFF_ID);
    expect(membership).toBeDefined();

    const revokeRes = localSupabaseAdapter.revokeStaffAccess(
      membership!.id,
      'Staff member transferred from department',
      MAIN_ADMIN_ID
    );
    expect(revokeRes.success).toBe(true);

    // Immediate check: Revoked staff receives 0 complaints
    const complaintsAfterRevoke = localSupabaseAdapter.selectComplaints(KWSC_STAFF_ID);
    expect(complaintsAfterRevoke).toHaveLength(0);

    // Attempting status update fails immediately
    const updateAttempt = localSupabaseAdapter.staffUpdateComplaintStatus(
      {
        complaint_id: complaint.id,
        new_status: 'under_review',
        title_en: 'Update',
        title_ur: 'اپ ڈیٹ',
        note_en: 'Post-revocation attempt',
        note_ur: 'منسوخی کے بعد کوشش',
      },
      KWSC_STAFF_ID
    );
    expect(updateAttempt.success).toBe(false);
    expect(updateAttempt.error).toContain('Unauthorized');
  });

  // ---------------------------------------------------------------------------
  // 8. Server-Enforced Progressive Authentication Rate Limiting
  // ---------------------------------------------------------------------------
  it('enforces progressive server-side backoff and locks out after 10 failed login attempts', () => {
    const testEmail = 'attacker-brute-force@example.org';

    // 0 failed attempts: allowed, 0s delay
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(0);

    // 3 failed attempts: allowed, 0s delay
    for (let i = 0; i < 3; i++) {
      localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    }
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).allowed).toBe(true);
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(0);

    // 4th and 5th failed attempt: 2-second progressive backoff
    localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(2);

    localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(2);

    // 6th to 9th failed attempt: 5-second progressive backoff
    localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(5);

    for (let i = 7; i <= 9; i++) {
      localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    }
    expect(localSupabaseAdapter.checkAuthRateLimit(testEmail).delay_seconds).toBe(5);

    // 10th failed attempt: 15-minute lock penalty
    localSupabaseAdapter.recordAuthAttempt(testEmail, false);
    const lockCheck = localSupabaseAdapter.checkAuthRateLimit(testEmail);
    expect(lockCheck.allowed).toBe(false);
    expect(lockCheck.retry_after_seconds).toBeGreaterThan(0);
    expect(lockCheck.error).toContain('Account locked');

    // Successful login resets rate limiter
    localSupabaseAdapter.recordAuthAttempt(testEmail, true);
    const resetCheck = localSupabaseAdapter.checkAuthRateLimit(testEmail);
    expect(resetCheck.allowed).toBe(true);
    expect(resetCheck.delay_seconds).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 9. Admin Provisioning and Reassignment
  // ---------------------------------------------------------------------------
  it('allows main administrator to provision staff and reassign misclassified complaints', () => {
    // 1. Provision new staff
    const NEW_STAFF_ID = 'staff-new-kelectric-005';
    const provisionRes = localSupabaseAdapter.adminProvisionDepartmentStaff(
      {
        userId: NEW_STAFF_ID,
        email: 'electrician.farooq@ke.gov.pk',
        fullName: 'Farooq Electrician',
        departmentId: 'kelectric',
      },
      MAIN_ADMIN_ID
    );
    expect(provisionRes.success).toBe(true);

    const newStaffCases = localSupabaseAdapter.selectComplaints(NEW_STAFF_ID);
    expect(newStaffCases).toHaveLength(0); // Starts empty

    // 2. Citizen filed a transformer complaint that was misclassified to KWSC
    const complaint = localSupabaseAdapter.insertComplaint(
      {
        reference_number: 'KHI-2026-REASSIGN-1',
        citizen_id: CITIZEN_A_ID,
        description: 'Transformer sparked and caught fire near street pole.',
        incident_district: 'District Central',
        incident_locality: 'North Nazimabad',
        incident_public_location: 'Block H',
        assigned_department_id: 'kwsc', // Misrouted to water
      },
      CITIZEN_A_ID
    ).complaint!;

    expect(complaint.assigned_department_id).toBe('kwsc');

    // 3. Admin reassigns to K-Electric
    const reassignRes = localSupabaseAdapter.adminReassignComplaint(
      complaint.id,
      'kelectric',
      'Power transformer issue belongs to K-Electric',
      MAIN_ADMIN_ID
    );
    expect(reassignRes.success).toBe(true);

    // Complaint is now visible to K-Electric staff
    const keCases = localSupabaseAdapter.selectComplaints(NEW_STAFF_ID);
    expect(keCases).toHaveLength(1);
    expect(keCases[0].assigned_department_id).toBe('kelectric');
    expect(keCases[0].is_reviewed_by_admin).toBe(true);

    // And timeline records administrative routing correction
    const timeline = localSupabaseAdapter.selectTimelineEvents(complaint.id, MAIN_ADMIN_ID);
    expect(timeline.some((t) => t.title.includes('Reassigned'))).toBe(true);
  });
});
