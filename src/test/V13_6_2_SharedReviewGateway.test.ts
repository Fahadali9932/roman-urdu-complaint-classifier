import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  supabase: { rpc },
}));

import { AiReviewService } from '../services/aiReviewService';

const sharedReview = {
  id: 'review-server-1', complaintId: 'real-complaint-1', referenceNumber: 'KHI-2026-AB12',
  text: 'Meri gali mein taar gir gai, 03001234567 par call karo',
  originalDepartments: ['kelectric'], suggestedDepartment: 'kmc',
  flaggedByStaffId: 'server-staff', flaggedByStaffName: 'Authenticated department staff',
  flaggedByDepartment: 'kelectric', flagReason: 'Independent road defect as well',
  flaggedAt: '2026-11-20T10:00:00Z', status: 'pending', piiScrubbed: true,
};

describe('V13.6.2 authenticated shared review gateway', () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.clear();
  });

  it('loads the shared administrator queue and redacts phone numbers without touching local storage', async () => {
    rpc.mockResolvedValueOnce({ data: [sharedReview], error: null });
    const service = new AiReviewService();
    const rows = await service.refreshReviewQueue();
    expect(rpc).toHaveBeenCalledWith('get_ai_classification_review_queue');
    expect(rows[0].text).not.toContain('03001234567');
    expect(rows[0].text).toContain('[PHONE REDACTED]');
    expect(localStorage.getItem('awaaz_ai_review_queue_v11')).toBeNull();
  });

  it('fails closed when the admin is denied rather than showing a fake local queue', async () => {
    localStorage.setItem('awaaz_ai_review_queue_v11', JSON.stringify([sharedReview]));
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const service = new AiReviewService();
    await expect(service.refreshReviewQueue()).rejects.toThrow(/could not be loaded/i);
    expect(service.getReviewQueue()).toEqual([]);
  });

  it('flags through only one atomic authenticated RPC, with no direct complaint status write', async () => {
    rpc.mockResolvedValueOnce({ data: 'review-server-2', error: null });
    const service = new AiReviewService();
    const review = await service.flagComplaintForReview({
      complaintId: 'real-complaint-2', referenceNumber: 'KHI-2026-XY89',
      text: 'sadak toot gai', originalDepartments: ['kmc'], suggestedDepartment: 'kmc',
      flaggedByStaffId: 'untrusted-browser-user', flaggedByStaffName: 'browser display name',
      flaggedByDepartment: 'kmc', flagReason: 'This road is actually damaged',
    });
    expect(review.id).toBe('review-server-2');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('staff_flag_ai_classification_review', {
      p_complaint_id: 'real-complaint-2', p_suggested_department: 'kmc',
      p_reason: 'This road is actually damaged',
    });
    expect(service.getReviewQueue()).toEqual([]); // Staff cannot read the admin queue.
  });

  it('rejects more than two verified departments before any server mutation', async () => {
    const service = new AiReviewService();
    await expect(service.resolveReviewItem({
      itemId: 'review-server-1', adminId: 'admin-local', resolutionNotes: '',
      confirmedDepartments: ['kmc', 'kwsc', 'kelectric'],
    })).rejects.toThrow(/one or two/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('only exports administrator-confirmed corrections returned by the shared ledger', async () => {
    const service = new AiReviewService();
    rpc.mockResolvedValueOnce({ data: [sharedReview], error: null });
    await service.refreshReviewQueue();
    expect(service.getVerifiedCorrections()).toEqual([]);

    rpc.mockResolvedValueOnce({ data: null, error: null });
    rpc.mockResolvedValueOnce({ data: [{ ...sharedReview, status: 'resolved',
      confirmedDepartments: ['kelectric', 'kmc'],
      resolvedByAdminId: 'actual-admin', resolvedAt: '2026-11-20T11:00:00Z',
    }], error: null });
    await service.resolveReviewItem({ itemId: 'review-server-1', adminId: 'untrusted-browser-admin',
      confirmedDepartments: ['kelectric', 'kmc'], resolutionNotes: 'Two independent faults verified',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'admin_decide_ai_classification_review', {
      p_review_id: 'review-server-1', p_action: 'resolve',
      p_confirmed_departments: ['kelectric', 'kmc'], p_notes: 'Two independent faults verified',
    });
    const corrections = service.getVerifiedCorrections();
    expect(corrections).toHaveLength(1);
    expect(corrections[0].verified_by).toBe('actual-admin');
    expect(corrections[0].expected_departments).toEqual(['kelectric', 'kmc']);
  });
});
