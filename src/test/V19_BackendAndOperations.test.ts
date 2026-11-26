import { describe, expect, it } from 'vitest';
import { fieldOperations } from '../features/department/services/fieldOperations';

describe('V19 Backend Migrations & Operations Service', () => {
  it('1. startWorkOrder sets commencement-based deadline based on assigned_duration_hours', async () => {
    const res = await fieldOperations.startWorkOrder('local-dev-order-03');
    expect(res.success).toBe(true);
    expect(res.effectiveDeadlineAt).toBeDefined();

    const deadlineMs = new Date(res.effectiveDeadlineAt).getTime();
    const nowMs = Date.now();
    // Default 72h duration => ~259,200,000 ms in future
    const diffHours = Math.round((deadlineMs - nowMs) / 3600000);
    expect(diffHours).toBeGreaterThanOrEqual(71);
    expect(diffHours).toBeLessThanOrEqual(73);
  });

  it('2. submitWorkCompletion verifies GPS proximity and queues proof for supervisor review', async () => {
    const coords = { latitude: 24.9312, longitude: 67.1123, accuracy: 4.5 };
    const res = await fieldOperations.submitWorkCompletion('local-dev-order-01', 'proofs/completion-photo.jpg', coords);

    expect(res.success).toBe(true);
    expect(res.gpsVerified).toBe(true);
    expect(res.distanceMeters).toBeLessThanOrEqual(30);

    const proof = await fieldOperations.proof('local-dev-order-01');
    expect(proof).not.toBeNull();
    expect(proof?.decision).toBe('pending');
    expect(proof?.storage_path).toBe('proofs/completion-photo.jpg');
  });

  it('3. approveResolution verifies order and updates proof decision to approved', async () => {
    const res = await fieldOperations.approveResolution('local-dev-order-01');
    expect(res.success).toBe(true);

    const proof = await fieldOperations.proof('local-dev-order-01');
    expect(proof?.decision).toBe('approved');
  });

  it('4. returnCorrection extends deadline by correction hours and updates review note', async () => {
    const res = await fieldOperations.returnCorrection('local-dev-order-02', 'Inadequate asphalt leveling at boundary curb.', 48);
    expect(res.success).toBe(true);
    expect(res.newDeadline).toBeDefined();

    const deadlineMs = new Date(res.newDeadline).getTime();
    const nowMs = Date.now();
    const diffHours = Math.round((deadlineMs - nowMs) / 3600000);
    expect(diffHours).toBeGreaterThanOrEqual(47);
    expect(diffHours).toBeLessThanOrEqual(49);
  });

  it('5. rejectDepartmentComplaint records rejection with reason', async () => {
    const res = await fieldOperations.rejectDepartmentComplaint('c-reject-test', 'Jurisdiction belongs to Sindh Building Control Authority.');
    expect(res.success).toBe(true);
  });

  it('6. fetchNotifications and fetchOfficerWarnings return structured communication ledgers', async () => {
    const notifs = await fieldOperations.fetchNotifications('kmc');
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0]).toHaveProperty('title');
    expect(notifs[0]).toHaveProperty('notification_type');

    const warnings = await fieldOperations.fetchOfficerWarnings('kmc', 'local-officer-b');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].reason).toContain('water pipe burst');
  });
});
