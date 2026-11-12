import React, { useState } from 'react';
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
}[] = [
  {
    status: 'under_review',
    labelEn: 'Under Review',
    labelUr: 'زیرِ جائزہ',
  },
  {
    status: 'in_progress',
    labelEn: 'In Progress',
    labelUr: 'زیرِ کارروائی',
  },
  {
    status: 'resolved',
    labelEn: 'Resolved',
    labelUr: 'حل شدہ',
  },
  {
    status: 'rejected',
    labelEn: 'Closed / Not Actionable',
    labelUr: 'شکایت بند',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1E21]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-2xl max-w-md w-full shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E1E4E6] flex items-center justify-between bg-[#FAFBFB]">
          <div>
            <h3 className="font-semibold text-sm text-[#0F1E21]">
              {t('deptUpdateStatus')}
            </h3>
            <p className="font-mono text-xs text-[#5B646B]">{complaint.referenceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#F4F6F6] text-[#5B646B] hover:text-[#0F1E21] flex items-center justify-center transition-colors"
            aria-label={t('deptCancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F1E21] uppercase tracking-wider">
              {language === 'ur' ? 'نیا سٹیٹس' : 'Select Status'}
            </label>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.status;
                return (
                  <label
                    key={opt.status}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'border-[#122E32] bg-[#F0F4F5] font-medium text-[#0F1E21]'
                        : 'border-[#E1E4E6] hover:bg-[#FAFBFB] text-[#5B646B]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.status}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.status)}
                      className="text-[#122E32] focus:ring-[#122E32]"
                    />
                    <span>{language === 'ur' ? opt.labelUr : opt.labelEn}</span>
                    {opt.status === complaint.status && (
                      <span className="ml-auto text-[10px] text-[#5B646B] bg-[#ECEEEF] px-1.5 py-0.2 rounded">
                        {language === 'ur' ? 'موجودہ' : 'Current'}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F1E21]">
              {t('deptRemediationNote')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('deptRemediationNotePlaceholder')}
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg border border-[#E1E4E6] bg-[#FFFFFF] text-[#0F1E21] placeholder-[#8A9298] focus:outline-none focus:border-[#2C4A52] focus:ring-1 focus:ring-[#2C4A52]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ECEEEF]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg border border-[#E1E4E6] text-xs font-medium text-[#5B646B] hover:bg-[#F4F6F6] transition-colors"
            >
              {t('deptCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#122E32] hover:bg-[#0F1E21] text-[#FFFFFF] text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
