import { describe, expect, it } from 'vitest';
import { isLocalFieldDemo, officerRating, workDeadline } from '../features/department/services/fieldOperations';

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
});
