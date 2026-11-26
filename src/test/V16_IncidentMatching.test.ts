import { describe, expect, it } from 'vitest';
import { findPotentialIncidentMatches, incidentDistanceMetres, type ActiveIncident, type IncidentIdentity } from '../features/department/services/incidentMatching';

const source: IncidentIdentity = { complaintId: 'new', departmentId: 'kmc', issueTypes: ['road_damage'], pin: { latitude: 24.9, longitude: 67.1 } };
const order: ActiveIncident = { ...source, complaintId: 'old', orderId: 'order-1', status: 'in_progress' };

describe('V16 potential incident matching', () => {
  it('suggests a nearby same-type active order', () => {
    const result = findPotentialIncidentMatches(source, [{ ...order, pin: { latitude: 24.9001, longitude: 67.1 } }]);
    expect(result).toHaveLength(1);
    expect(result[0].distanceMetres).toBeGreaterThan(10);
    expect(result[0].distanceMetres).toBeLessThan(12);
  });
  it('keeps different departments, problem types and distant incidents separate', () => {
    expect(findPotentialIncidentMatches(source, [
      { ...order, departmentId: 'kelectric' },
      { ...order, issueTypes: ['streetlight_failure'] },
      { ...order, pin: { latitude: 24.901, longitude: 67.1 } },
    ])).toEqual([]);
  });
  it('excludes closed work, self, unknown types and invalid or missing pins', () => {
    expect(findPotentialIncidentMatches(source, [
      { ...order, status: 'verified' }, { ...order, complaintId: 'new' },
      { ...order, issueTypes: ['general'] }, { ...order, pin: null },
      { ...order, pin: { latitude: '', longitude: 67.1 } },
    ])).toEqual([]);
    expect(incidentDistanceMetres(source.pin, { latitude: 91, longitude: 67 })).toBeNull();
  });
  it('matches complete issue sets, independent of case and order', () => {
    const mixed = { ...source, issueTypes: ['road_damage', 'footpath'] };
    expect(findPotentialIncidentMatches(mixed, [order])).toEqual([]);
    expect(findPotentialIncidentMatches(mixed, [{ ...order, issueTypes: ['FOOTPATH', 'road_damage'] }])).toHaveLength(1);
  });
  it('warns about pending proof without merging', () => {
    expect(findPotentialIncidentMatches(source, [{ ...order, status: 'pending_review' }])).toHaveLength(1);
    expect(source.complaintId).toBe('new');
  });
});
