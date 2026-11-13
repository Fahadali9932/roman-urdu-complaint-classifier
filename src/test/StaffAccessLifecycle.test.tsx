import { describe, it, expect, beforeEach } from 'vitest';
import { staffAuthService } from '../services/staffAuthService';

describe('AWAAZ-E-AWAM — Phase 2: Staff Access Lifecycle (Database & Auth Integration)', () => {
  beforeEach(() => {
    // Reset database to initial state before each test
    staffAuthService.resetLocalDatabase();
  });

  it('1. Department employee submits access request and request enters pending status', async () => {
    const res = await staffAuthService.requestDepartmentAccess({
      departmentId: 'kelectric',
      fullName: 'Tariq Mansoor',
      workEmail: 'tariq.mansoor@ke.com.pk',
      password: 'SecurePassword123!',
    });

    expect(res.success).toBe(true);
    expect(res.requestId).toBeDefined();

    // Verify stored pending request
    const pendingReqs = await staffAuthService.getPendingDepartmentRequests();
    expect(pendingReqs.length).toBe(1);
    expect(pendingReqs[0].work_email).toBe('tariq.mansoor@ke.com.pk');
    expect(pendingReqs[0].full_name).toBe('Tariq Mansoor');
    expect(pendingReqs[0].department_id).toBe('kelectric');
    expect(pendingReqs[0].status).toBe('pending');

    // Verify audit log entry
    const audit = staffAuthService.getAccessAuditLog();
    const submitLog = audit.find((a) => a.action === 'request_submitted');
    expect(submitLog).toBeDefined();
    expect(submitLog?.target_email).toBe('tariq.mansoor@ke.com.pk');
  });

  it('2. Pending employee is blocked from logging in until approved', async () => {
    // Submit request
    await staffAuthService.requestDepartmentAccess({
      departmentId: 'kwsc',
      fullName: 'Fatima Noor',
      workEmail: 'fatima.noor@kwsc.gov.pk',
      password: 'WaterSecurity2026!',
    });

    // Attempt sign-in with correct password while still pending
    const signInRes = await staffAuthService.signInDepartmentStaff(
      'fatima.noor@kwsc.gov.pk',
      'WaterSecurity2026!'
    );

    expect(signInRes.success).toBe(false);
    expect(signInRes.status).toBe('pending');
    expect(signInRes.session).toBeUndefined();
    expect(signInRes.error).toContain('pending review');
  });

  it('3. Main Administrator signs in, reviews pending request, and approves access', async () => {
    // 1. Applicant submits
    const reqRes = await staffAuthService.requestDepartmentAccess({
      departmentId: 'sswmb',
      fullName: 'Kamran Akram',
      workEmail: 'kamran.akram@sswmb.gos.pk',
      password: 'CleanKarachi123!',
    });
    const requestId = reqRes.requestId!;

    // 2. Main Admin logs in
    const adminLogin = await staffAuthService.signInMainAdmin(
      'admin@example.org',
      'AdminPass123!'
    );
    expect(adminLogin.success).toBe(true);
    expect(adminLogin.session?.role).toBe('main_admin');

    // 3. Admin retrieves pending queue
    const queue = await staffAuthService.getPendingDepartmentRequests();
    const target = queue.find((r) => r.id === requestId);
    expect(target).toBeDefined();
    expect(target?.status).toBe('pending');

    // 4. Admin approves request
    const approveRes = await staffAuthService.approveDepartmentRequest(requestId);
    expect(approveRes.success).toBe(true);

    // 5. Verify request is no longer in pending queue
    const remainingPending = await staffAuthService.getPendingDepartmentRequests();
    expect(remainingPending.find((r) => r.id === requestId)).toBeUndefined();

    // 6. Verify audit log recorded approval
    const audit = staffAuthService.getAccessAuditLog();
    const approveLog = audit.find((a) => a.action === 'request_approved');
    expect(approveLog).toBeDefined();
    expect(approveLog?.target_email).toBe('kamran.akram@sswmb.gos.pk');
  });

  it('4. Approved employee successfully signs in and establishes department session', async () => {
    // Request & approve
    const reqRes = await staffAuthService.requestDepartmentAccess({
      departmentId: 'ssgc',
      fullName: 'Rashid Minhas',
      workEmail: 'rashid.minhas@ssgc.com.pk',
      password: 'GasInfrastructure2026!',
    });
    await staffAuthService.approveDepartmentRequest(reqRes.requestId!);

    // Employee logs in
    const loginRes = await staffAuthService.signInDepartmentStaff(
      'rashid.minhas@ssgc.com.pk',
      'GasInfrastructure2026!'
    );

    expect(loginRes.success).toBe(true);
    expect(loginRes.status).toBe('approved');
    expect(loginRes.session).toBeDefined();
    expect(loginRes.session?.departmentId).toBe('ssgc');
    expect(loginRes.session?.role).toBe('department_staff');
    expect(loginRes.session?.email).toBe('rashid.minhas@ssgc.com.pk');
  });

  it('5. Main Administrator revokes access and employee is immediately locked out in real-time', async () => {
    // 1. Employee registers & is approved
    const reqRes = await staffAuthService.requestDepartmentAccess({
      departmentId: 'kmc',
      fullName: 'Zubair Khan',
      workEmail: 'zubair.khan@kmc.gos.pk',
      password: 'KmcMunicipalPass123!',
    });
    await staffAuthService.approveDepartmentRequest(reqRes.requestId!);

    // 2. Employee logs in
    const staffLogin = await staffAuthService.signInDepartmentStaff(
      'zubair.khan@kmc.gos.pk',
      'KmcMunicipalPass123!'
    );
    expect(staffLogin.success).toBe(true);
    const staffUserId = staffLogin.session!.userId;

    // Verify initial active access check
    const preRevokeCheck = staffAuthService.checkCurrentStaffAccess(staffUserId);
    expect(preRevokeCheck.authorized).toBe(true);
    expect(preRevokeCheck.status).toBe('active');

    // 3. Admin lists approved memberships
    const memberships = await staffAuthService.getApprovedDepartmentMemberships();
    const targetMembership = memberships.find((m) => m.profile?.email === 'zubair.khan@kmc.gos.pk');
    expect(targetMembership).toBeDefined();

    // 4. Admin revokes access with reason
    const revocationReason = 'Employee transferred to district office outside scope';
    const revokeRes = await staffAuthService.revokeDepartmentAccess(
      targetMembership!.id,
      revocationReason
    );
    expect(revokeRes.success).toBe(true);

    // 5. IMMEDIATE REAL-TIME CHECK: Active token/user is blocked instantly
    const postRevokeCheck = staffAuthService.checkCurrentStaffAccess(staffUserId);
    expect(postRevokeCheck.authorized).toBe(false);
    expect(postRevokeCheck.status).toBe('revoked');
    expect(postRevokeCheck.reason).toBe(revocationReason);

    // 6. Attempted sign in is blocked with revocation details
    const reLogin = await staffAuthService.signInDepartmentStaff(
      'zubair.khan@kmc.gos.pk',
      'KmcMunicipalPass123!'
    );
    expect(reLogin.success).toBe(false);
    expect(reLogin.status).toBe('revoked');
    expect(reLogin.error).toContain('revoked');

    // 7. Verify audit log entry
    const audit = staffAuthService.getAccessAuditLog();
    const revokeLog = audit.find((a) => a.action === 'access_revoked');
    expect(revokeLog).toBeDefined();
    expect(revokeLog?.target_email).toBe('zubair.khan@kmc.gos.pk');
  });

  it('6. Main Administrator rejects request with reason and employee is informed', async () => {
    // 1. Employee submits
    const reqRes = await staffAuthService.requestDepartmentAccess({
      departmentId: 'sbca',
      fullName: 'Unverified Applicant',
      workEmail: 'unverified@external-domain.invalid',
      password: 'RandomPassword123!',
    });

    // 2. Admin rejects with explicit reason
    const rejectionReason = 'Work email domain does not match official SBCA registry';
    const rejectRes = await staffAuthService.rejectDepartmentRequest(
      reqRes.requestId!,
      rejectionReason
    );
    expect(rejectRes.success).toBe(true);

    // 3. Applicant attempts sign-in and sees the rejection reason
    const loginRes = await staffAuthService.signInDepartmentStaff(
      'unverified@external-domain.invalid',
      'RandomPassword123!'
    );
    expect(loginRes.success).toBe(false);
    expect(loginRes.status).toBe('rejected');
    expect(loginRes.rejectionReason).toBe(rejectionReason);
    expect(loginRes.error).toContain('SBCA registry');

    // 4. Audit log records rejection
    const audit = staffAuthService.getAccessAuditLog();
    const rejectLog = audit.find((a) => a.action === 'request_rejected');
    expect(rejectLog).toBeDefined();
    expect(rejectLog?.target_email).toBe('unverified@external-domain.invalid');
  });

  it('7. Re-application after rejection allows employee to correct details and get approved', async () => {
    // 1. Rejected request
    const firstReq = await staffAuthService.requestDepartmentAccess({
      departmentId: 'kwsc',
      fullName: 'Naveed Akhtar',
      workEmail: 'naveed@external.com',
      password: 'InitialPassword123!',
    });
    await staffAuthService.rejectDepartmentRequest(firstReq.requestId!, 'Use official email');

    // 2. Re-apply with official email
    const secondReq = await staffAuthService.requestDepartmentAccess({
      departmentId: 'kwsc',
      fullName: 'Naveed Akhtar',
      workEmail: 'naveed.akhtar@kwsc.gos.pk',
      password: 'CorrectedPassword123!',
    });
    expect(secondReq.success).toBe(true);

    // 3. Admin approves second request
    await staffAuthService.approveDepartmentRequest(secondReq.requestId!);

    // 4. Employee signs in successfully
    const login = await staffAuthService.signInDepartmentStaff(
      'naveed.akhtar@kwsc.gos.pk',
      'CorrectedPassword123!'
    );
    expect(login.success).toBe(true);
    expect(login.status).toBe('approved');
  });
});
