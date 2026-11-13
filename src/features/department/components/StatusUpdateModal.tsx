import React, { useState, useEffect } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { complaintService } from '../../../services/MockComplaintService';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: DepartmentComplaintView;
  onUpdated: (updated: DepartmentComplaintView) => void;
}

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
    status: 'in_progress',
    labelEn: 'In Progress',
    labelUr: 'زیرِ کارروائی',
    descEn: 'Field team or operational crew actively addressing issue',
    descUr: 'فیلڈ عملہ مسئلے کے حل پر کام کر رہا ہے',
  },
  {
    status: 'resolved',
    labelEn: 'Resolved',
    labelUr: 'حل شدہ',
    descEn: 'On-ground civic action completed and verified',
    descUr: 'مسئلہ حل کر دیا گیا ہے',
  },
  {
    status: 'rejected',
    labelEn: 'Closed / Not Actionable',
    labelUr: 'شکایت بند',
    descEn: 'Duplicate, insufficient location details, or outside jurisdiction',
    descUr: 'دائرہ کار سے باہر یا ناکافی تفصیلات',
  },
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onUpdated,
}) => {
  const { departmentId } = useDepartmentAuth();
  const { language, t } = useLanguage();

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(complaint.status);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(complaint.status);
      setNotes('');
      setError(null);
    }
  }, [isOpen, complaint]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    if (selectedStatus === 'resolved' && !notes.trim()) {
      setError('Resolution notes are required when marking a complaint as resolved.');
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-black/[0.08] p-6 sm:p-8 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-black/[0.08]">
          <div>
            <h3 id="status-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#111827]">
              {t('deptUpdateStatus')}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {complaint.referenceNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1 rounded-xl text-slate-400 hover:text-[#111827] hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Status Radio List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('deptStatusManagement')}
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.status;
                return (
                  <label
                    key={opt.status}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#111827] bg-black/[0.03] ring-1 ring-[#111827]'
                        : 'border-black/[0.08] hover:border-black/20 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complaintStatus"
                      value={opt.status}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.status)}
                      className="mt-1 text-[#111827] focus:ring-[#111827]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[#111827]">
                        {language === 'ur' ? opt.labelUr : opt.labelEn}
                      </div>
                      <div className="text-[11px] text-slate-500">
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
            <label htmlFor="status-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('deptRemediationNote')}
              {selectedStatus === 'resolved' && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              id="status-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('deptRemediationNotePlaceholder')}
              className="w-full text-xs sm:text-sm rounded-xl p-3 bg-white border border-black/15 text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#111827] focus:ring-1 focus:ring-[#111827]/10"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-black/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-[#111827] hover:bg-black/5 transition-colors cursor-pointer"
            >
              {t('deptCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
      </div>
    </div>
  );
};
