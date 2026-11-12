import React, { useState, useEffect } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { complaintService } from '../../../services/MockComplaintService';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import { X, AlertCircle, Loader2 } from 'lucide-react';

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
    descEn: 'Record that the complaint is being reviewed.',
    descUr: 'درج کریں کہ شکایت کا جائزہ لیا جا رہا ہے۔',
  },
  {
    status: 'in_progress',
    labelEn: 'In Progress',
    labelUr: 'زیرِ کارروائی',
    descEn: 'Record that work is in progress.',
    descUr: 'درج کریں کہ کام جاری ہے۔',
  },
  {
    status: 'resolved',
    labelEn: 'Resolved',
    labelUr: 'حل شدہ',
    descEn: 'Record the complaint as resolved.',
    descUr: 'شکایت کو حل شدہ کے طور پر درج کریں۔',
  },
  {
    status: 'rejected',
    labelEn: 'Closed / Not Actionable',
    labelUr: 'شکایت بند',
    descEn: 'Record the complaint as closed.',
    descUr: 'شکایت کو بند کے طور پر درج کریں۔',
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
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !departmentId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await complaintService.updateComplaintStatus(
        departmentId,
        complaint.referenceNumber,
        selectedStatus,
        note.trim() || undefined
      );

      if (res.success) {
        onUpdated(res.complaint);
        onClose();
      } else {
        setError('Failed to update status.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dept-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--dept-border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--dept-border)] bg-[var(--dept-panel)] px-5 py-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--dept-tint)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--dept-primary)]">
                {complaint.referenceNumber}
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--dept-ink)] sm:text-lg">
              {t('deptUpdateStatus')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--dept-border)] text-[var(--dept-muted)] transition-colors hover:bg-[var(--dept-tint)] hover:text-[var(--dept-ink)]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--dept-ink)]">
              {language === 'ur' ? 'نیا سٹیٹس منتخب کریں' : 'Select Target Status'}
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.status;
                return (
                  <label
                    key={opt.status}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--dept-primary)] bg-[var(--dept-tint)] ring-1 ring-[var(--dept-accent)]'
                        : 'border-[var(--dept-border)] bg-white hover:bg-[var(--dept-panel)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complaintStatus"
                      value={opt.status}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.status)}
                      className="mt-0.5 text-[#122E32] focus:ring-[#122E32]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--dept-ink)] sm:text-sm">
                        {language === 'ur' ? opt.labelUr : opt.labelEn}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--dept-muted)]">
                        {language === 'ur' ? opt.descUr : opt.descEn}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Progress / Resolution Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="statusNote"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--dept-ink)]"
            >
              {t('deptRemediationNote')}
            </label>
            <textarea
              id="statusNote"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('deptRemediationNotePlaceholder')}
              className="w-full resize-none rounded-xl border border-[var(--dept-border)] bg-white p-3 text-xs text-[var(--dept-ink)] placeholder:text-[var(--dept-muted)] focus:border-[var(--dept-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--dept-accent)] sm:text-sm"
            />
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-[var(--dept-border)] pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="dept-btn-secondary h-10 px-4 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t('deptCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="dept-btn-primary h-10 px-5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('deptSaving')}</span>
                </>
              ) : (
                <span>{t('deptSave')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
