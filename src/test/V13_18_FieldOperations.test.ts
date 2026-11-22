import { describe, expect, it } from 'vitest';
import { fieldOperations, isLocalFieldDemo, officerRating, workDeadline } from '../features/department/services/fieldOperations';
import { localSupabaseAdapter } from '../services/LocalSupabaseAdapter';
import { getLocalDemoCredentials } from '../services/localDemoCredentials';

describe('V13.18 field operations calculations and isolation', () => {
  it('does not rank officers with fewer than five verified assignments', () => {
    expect(officerRating({verified_cases:4,on_time_cases:4,disputed_cases:0})).toBeNull();
    expect(officerRating({verified_cases:0,on_time_cases:0,disputed_cases:0})).toBeNull();
  });
  it('uses on-time work and genuine citizen disputes rather than assignment volume', () => {
    const strong = officerRating({verified_cases:10,on_time_cases:10,disputed_cases:0});
    const weak = officerRating({verified_cases:10,on_time_cases:5,disputed_cases:4});
    expect(strong).toBe(5);
    expect(weak).toBeLessThan(strong!);
    expect(weak).toBeGreaterThanOrEqual(1);
  });
  it('clamps implausible inputs and never returns a grade above five', () => {
    expect(officerRating({verified_cases:5,on_time_cases:10,disputed_cases:0})).toBe(5);
  });
  it('uses deterministic overdue, approaching and complete windows', () => {
    const now = Date.UTC(2026,10,22,0,0,0);
    expect(workDeadline({status:'in_progress',due_at:new Date(now-1).toISOString()},now)).toBe('overdue');
    expect(workDeadline({status:'assigned',due_at:new Date(now+3600000).toISOString()},now)).toBe('approaching');
    expect(workDeadline({status:'assigned',due_at:new Date(now+172800000).toISOString()},now)).toBe('on_track');
    expect(workDeadline({status:'verified',due_at:new Date(now-1).toISOString()},now)).toBe('verified');
  });
  it('marks demo-only helpers only in test/development unconfigured environments', () => {
    expect(isLocalFieldDemo()).toBe(true);
  });
  it('gives the two KMC demo logins distinct roles without granting role by URL', async () => {
    expect(await fieldOperations.getMyRole('kmc', 'staff-kmc-demo-01')).toBe('head');
    expect(await fieldOperations.getMyRole('kmc', 'local-officer-a')).toBe('officer');
    expect(await fieldOperations.getMyRole('kelectric', 'local-officer-a')).toBeNull();
    expect(await fieldOperations.getMyRole('kmc', 'unknown-user')).toBeNull();
  });
  it('authenticates the KMC officer demo under the same department with its own identity', async () => {
    const result = localSupabaseAdapter.authenticateStaffWithUsername(
      'roads-02', getLocalDemoCredentials().staffPassword, 'kmc',
    );
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe('local-officer-a');
    expect(result.membership?.staff_role).toBe('officer');
    expect(await fieldOperations.getMyRole('kmc', result.user!.id)).toBe('officer');
  });
});
