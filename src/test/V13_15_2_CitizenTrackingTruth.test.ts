import { describe, expect, it } from 'vitest';
import { getConfirmedDepartments, getTrackingCopy, getTrackingStage, type GuestTrackingRecord } from '../features/citizen/guestTrackingPresentation';

const base = (status: string): GuestTrackingRecord => ({
  found: true,
  public_status: status,
  public_category: 'Electricity',
  public_issues: [{ department_name: 'K-Electric', department_id: 'kelectric', status, display_status: status }],
});

describe('V13.15.2: concise public status without invented progress or unverified departments', () => {
  it.each([
    ['submitted', 'received'],
    ['under_review', 'review'],
    ['assigned', 'assigned'],
    ['accepted', 'assigned'],
    ['in_progress', 'in_progress'],
    ['partly_resolved', 'partial'],
    ['resolved', 'resolved'],
    ['rejected', 'rejected'],
  ] as const)('maps %s to only the recorded stage %s', (status, expected) => {
    expect(getTrackingStage(base(status))).toBe(expected);
  });

  it('never suggests that work started on an assigned but not started case', () => {
    const copy = getTrackingCopy(getTrackingStage(base('assigned')), false);
    expect(copy.title).toBe('Sent to department');
    expect(copy.explanation).toMatch(/not yet been confirmed as started/i);
  });

  it('does not disclose classifier candidates while the complaint is under review', () => {
    expect(getConfirmedDepartments(base('under_review'))).toEqual([]);
    expect(getConfirmedDepartments(base('submitted'))).toEqual([]);
  });

  it('shows at most two unique confirmed departments after assignment', () => {
    const record = base('assigned');
    record.public_issues = [
      record.public_issues![0],
      { department_name: 'KMC', department_id: 'kmc', status: 'assigned', display_status: 'Assigned' },
      { department_name: 'KMC', department_id: 'kmc', status: 'assigned', display_status: 'Assigned' },
    ];
    expect(getConfirmedDepartments(record)).toEqual(['K-Electric', 'KMC']);
  });
});
