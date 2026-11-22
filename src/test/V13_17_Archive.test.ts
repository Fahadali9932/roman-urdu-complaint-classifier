import { describe, expect, it, beforeEach } from 'vitest';
import { caseOperationsService } from '../services/CaseOperationsService';
import type { WorkQueueFilter } from '../types';

const filter: WorkQueueFilter = {
  savedView: 'all', displayMode: 'cases', searchQuery: '', area: 'All areas',
  issueType: 'All issues', sort: 'attention', page: 0, pageSize: 200,
};

describe('V13.17 operational records archive', () => {
  beforeEach(() => caseOperationsService.resetToDefault());

  it('keeps resolved cases out of the actionable queue without removing their records', async () => {
    const active = await caseOperationsService.listDepartmentCases('kmc', filter);
    const archived = await caseOperationsService.listDepartmentCases('kmc', { ...filter, savedView: 'completed' });
    expect(active.items.every((item) => item.workStatus !== 'completed')).toBe(true);
    expect(archived.items.every((item) => item.workStatus === 'completed')).toBe(true);
    const activeIds = new Set(active.items.map((item) => item.id));
    expect(archived.items.some((item) => activeIds.has(item.id))).toBe(false);
    expect(active.total + archived.total).toBeGreaterThan(0);
  });

  it('does not present unassigned cases as belonging to the signed-in staff member', async () => {
    const mine = await caseOperationsService.listDepartmentCases('kmc', {
      ...filter, savedView: 'mine', actorId: 'user-not-assigned-to-any-case',
    });
    expect(mine.total).toBe(0);
  });
});
