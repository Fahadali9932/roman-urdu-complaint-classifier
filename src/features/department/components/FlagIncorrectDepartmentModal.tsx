import React, { useState } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { aiReviewService } from '../../../services/aiReviewService';
import { complaintService } from '../../../services';
import { isSupabaseConfigured } from '../../../lib/supabase';
import {
  type DepartmentComplaintView,
  type DepartmentId,
} from '../../../types';
import { X, AlertTriangle, Loader2, Flag } from 'lucide-react';

interface FlagIncorrectDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: DepartmentComplaintView;
  onFlagged: (updated: DepartmentComplaintView) => void;
}

const DEPARTMENT_TARGETS: { id: DepartmentId | 'out_of_scope'; label: string; agency: string }[] = [
  { id: 'kmc', label: 'KMC', agency: 'Roads, stormwater drains, footpaths' },
  { id: 'kwsc', label: 'KWSC', agency: 'Water supply lines & sewerage overflows' },
  { id: 'kelectric', label: 'K-Electric', agency: 'Power outages, loose wires & transformers' },
  { id: 'ssgc', label: 'SSGC', agency: 'Gas leaks, meter faults & pipeline pressure' },
  { id: 'sswmb', label: 'SSWMB', agency: 'Solid waste, overflowing bins & street garbage' },
  { id: 'sbca', label: 'SBCA', agency: 'Dangerous construction & unauthorized buildings' },
  { id: 'out_of_scope', label: 'Out of Municipal Scope', agency: 'Private tenant dispute, crime, family issue' },
];

export const FlagIncorrectDepartmentModal: React.FC<FlagIncorrectDepartmentModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onFlagged,
}) => {
  const { departmentId, session } = useDepartmentAuth();
  const [suggestedDept, setSuggestedDept] = useState<DepartmentId | 'out_of_scope'>('out_of_scope');
  const [flagReason, setFlagReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDept = (complaint.assignedDepartmentId || departmentId || 'kmc') as DepartmentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagReason.trim()) {
      setError('Please provide a brief reason explaining why this complaint is misclassified.');
      return;
    }
    if (!session || !departmentId ||
        !(complaint.assignedDepartmentIds ?? [complaint.assignedDepartmentId]).includes(departmentId)) {
      setError('Sign in to the department assigned to this complaint before flagging it.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const staffName = session.username || `Staff Member (${departmentId.toUpperCase()})`;
      const staffId = session.userId || 'local-staff-session';

      // In live mode this single authenticated RPC creates the shared review
      // entry and moves the complaint under review in one database transaction.
      // Do not perform an independent status change before that RPC.
      const liveMode = isSupabaseConfigured();
      let locallyUpdated: DepartmentComplaintView | null = null;
      if (!liveMode) {
        const updated = await complaintService.updateComplaintStatus(
          departmentId, complaint.referenceNumber, 'under_review',
          `Flagged as misclassified by ${departmentId.toUpperCase()} staff: ${flagReason.trim()}`
        );
        if (!updated.success) throw new Error('The complaint could not be moved to review.');
        locallyUpdated = updated.complaint;
      }

      await aiReviewService.flagComplaintForReview({
        complaintId: complaint.id,
        referenceNumber: complaint.referenceNumber || complaint.id,
        text: complaint.sanitizedDescription || complaint.description || '',
        originalDepartments: complaint.assignedDepartmentIds ?? [departmentId],
        suggestedDepartment: suggestedDept,
        flaggedByStaffId: staffId,
        flaggedByStaffName: staffName,
        flaggedByDepartment: departmentId,
        flagReason: flagReason.trim(),
      });

      if (liveMode) {
        onFlagged({ ...complaint, status: 'under_review', updatedAt: new Date().toISOString() });
      } else {
        onFlagged(locallyUpdated || { ...complaint, status: 'under_review' });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to flag complaint.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flag size={18} />
            </div>
            <div>
              <h2
                id="flag-modal-title"
                style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}
              >
                Flag Incorrect Department
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Case #{complaint.referenceNumber || complaint.id} · Assigned to {currentDept.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{
              padding: '12px 14px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
              fontSize: '12.5px',
              color: '#334155',
              lineHeight: 1.5,
            }}
          >
            Flagging requests an <strong>Under Review</strong> status.{' '}
            {isSupabaseConfigured()
              ? 'The authenticated review and status transition are saved together in the shared administrator queue.'
              : 'Offline demonstration: the review copy is stored only in this browser.'}
            {' '}No model is retrained or department reassigned by this action.
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              Suggested Target Department or Jurisdiction:
            </label>
            <select
              value={suggestedDept}
              onChange={(e) => setSuggestedDept(e.target.value as DepartmentId | 'out_of_scope')}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                background: '#fff',
                color: '#0f172a',
              }}
            >
              {DEPARTMENT_TARGETS.filter((t) => t.id !== currentDept).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.agency}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
              }}
            >
              Reason for Misclassification Flag <span style={{ color: '#ef4444' }}>*</span>:
            </label>
            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g. Complaint concerns an open sewer overflow on main street, which belongs to KWSC rather than KMC road repairs."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#d97706',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Flagging Case...</span>
                </>
              ) : (
                <>
                  <Flag size={15} />
                  <span>Confirm & Flag for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
