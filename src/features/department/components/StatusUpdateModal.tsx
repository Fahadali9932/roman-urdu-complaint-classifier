import React, { useState, useEffect, useMemo } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { complaintService } from '../../../services';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { X, AlertCircle, Loader2, CheckCircle2, Lock } from 'lucide-react';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: DepartmentComplaintView;
  onUpdated: (updated: DepartmentComplaintView) => void;
  initialStatus?: ComplaintStatus;
}

export const getAllowedTransitions = (currentStatus: ComplaintStatus): ComplaintStatus[] => {
  switch (currentStatus) {
    case 'submitted':
      return ['under_review', 'assigned', 'rejected'];
    case 'under_review':
      return ['assigned', 'in_progress', 'rejected'];
    case 'assigned':
      return ['accepted', 'rejected'];
    case 'accepted':
      return ['in_progress', 'rejected'];
    case 'in_progress':
      return ['resolved', 'rejected'];
    case 'resolved':
    case 'rejected':
    default:
      return [];
  }
};

const STATUS_OPTIONS: {
  status: ComplaintStatus;
  labelEn: string;
  labelUr: string;
  descEn: string;
  descUr: string;
}[] = [
  {
    status: 'under_review',
    labelEn: 'Under Review',
    labelUr: 'زیرِ جائزہ',
    descEn: 'Assigned engineering team is verifying details',
    descUr: 'متعلقہ ٹیم شکایت کی تصدیق کر رہی ہے',
  },
  {
    status: 'assigned',
    labelEn: 'Pending Acceptance',
    labelUr: 'توثیق کے منتظر',
    descEn: 'Routed to department queue, awaiting official staff acceptance',
    descUr: 'متعلقہ محکمے کے ریکارڈ میں شامل، عملے کی توثیق کے منتظر',
  },
  {
    status: 'accepted',
    labelEn: 'Accept Complaint',
    labelUr: 'شکایت منظور کریں',
    descEn: 'Formally accept complaint and commit department to field remediation',
    descUr: 'محکمہ کی جانب سے شکایت منظور کر لی گئی ہے',
  },
  {
    status: 'in_progress',
    labelEn: 'In Progress (Start Work)',
    labelUr: 'زیرِ کارروائی (کام شروع کریں)',
    descEn: 'Field team or operational crew actively addressing issue on-ground',
    descUr: 'فیلڈ عملہ مسئلے کے حل پر کام کر رہا ہے',
  },
  {
    status: 'resolved',
    labelEn: 'Work Done / Resolved',
    labelUr: 'حل شدہ',
    descEn: 'On-ground civic action completed and verified',
    descUr: 'مسئلہ حل کر دیا گیا ہے',
  },
  {
    status: 'rejected',
    labelEn: 'Reject Complaint / Not Actionable',
    labelUr: 'شکایت مسترد کریں',
    descEn: 'Outside municipal jurisdiction, invalid location, or duplicate issue',
    descUr: 'دائرہ کار سے باہر یا غلط تفصیلات',
  },
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onUpdated,
  initialStatus,
}) => {
  const { departmentId } = useDepartmentAuth();
  const { language, t } = useLanguage();

  const allowedNextStatuses = useMemo(
    () => getAllowedTransitions(complaint.status),
    [complaint.status]
  );

  const availableOptions = useMemo(
    () => STATUS_OPTIONS.filter((opt) => allowedNextStatuses.includes(opt.status)),
    [allowedNextStatuses]
  );

  const isTerminal = allowedNextStatuses.length === 0;

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    (initialStatus && allowedNextStatuses.includes(initialStatus))
      ? initialStatus
      : (allowedNextStatuses[0] ?? complaint.status)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultStatus = (initialStatus && allowedNextStatuses.includes(initialStatus))
        ? initialStatus
        : (allowedNextStatuses[0] ?? complaint.status);
      setSelectedStatus(defaultStatus);
      setNotes('');
      setError(null);
    }
  }, [isOpen, complaint, allowedNextStatuses, initialStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    if (isTerminal) {
      setError('Cannot update complaint in terminal status.');
      return;
    }

    if (!allowedNextStatuses.includes(selectedStatus)) {
      setError(`Invalid status transition from "${complaint.status}" to "${selectedStatus}".`);
      return;
    }

    if (selectedStatus === 'resolved' && !notes.trim()) {
      setError('Resolution notes are required when marking a complaint as resolved.');
      return;
    }

    if (selectedStatus === 'rejected' && !notes.trim()) {
      setError('A rejection reason is required when rejecting or closing a complaint.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await complaintService.updateComplaintStatus(
        departmentId,
        complaint.referenceNumber,
        selectedStatus,
        notes.trim() || undefined
      );

      if (res.success && res.complaint) {
        onUpdated(res.complaint);
        onClose();
      } else {
        setError('Failed to update status. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#1b1a1f]/95 border border-white/15 p-6 sm:p-7 shadow-[0_32px_90px_rgba(0,0,0,0.7)] text-white transition-all">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 id="status-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {t('deptUpdateStatus')}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {complaint.referenceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isTerminal ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">
                  Complaint Closed ({complaint.status.replace('_', ' ').toUpperCase()})
                </div>
                <p className="text-xs text-slate-400">
                  This complaint has concluded its municipal workflow. Status and timeline are sealed under municipal audit protocol.
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Status Radio List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('deptStatusManagement')}
              </label>
              <div className="space-y-2">
                {availableOptions.map((opt) => {
                  const isSelected = selectedStatus === opt.status;
                  return (
                    <label
                      key={opt.status}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--dept-accent)] bg-white/[0.06] ring-1 ring-[var(--dept-accent)]'
                          : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="complaintStatus"
                        value={opt.status}
                        checked={isSelected}
                        onChange={() => setSelectedStatus(opt.status)}
                        className="mt-1 text-[var(--dept-accent)] focus:ring-[var(--dept-accent)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white">
                          {language === 'ur' ? opt.labelUr : opt.labelEn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {language === 'ur' ? opt.descUr : opt.descEn}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Operational Notes */}
            <div className="space-y-1.5">
              <label htmlFor="status-notes" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('deptRemediationNote')}
                {(selectedStatus === 'resolved' || selectedStatus === 'rejected') && (
                  <span className="text-amber-400 ml-1">*</span>
                )}
              </label>
              <textarea
                id="status-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('deptRemediationNotePlaceholder')}
                className="w-full text-xs sm:text-sm rounded-xl p-3 bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {t('deptCancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--dept-accent)',
                  color: '#151417',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('deptSaving')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('deptSave')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
