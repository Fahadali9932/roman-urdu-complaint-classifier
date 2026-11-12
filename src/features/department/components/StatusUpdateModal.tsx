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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1E21]/50 backdrop-blur-xs dept-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFFFF] border border-[#E1E4E6] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E1E4E6] flex items-center justify-between bg-[#FAFBFB]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2C4A52] bg-[#2C4A52]/10 px-2 py-0.5 rounded-md">
                {complaint.referenceNumber}
              </span>
            </div>
            <h3 className="font-bold text-lg text-[#0F1E21]">
              {t('deptUpdateStatus')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-[#E1E4E6] text-[#5B646B] hover:text-[#0F1E21] hover:bg-[#F4F6F6] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0F1E21] uppercase tracking-wider">
              {language === 'ur' ? 'نیا سٹیٹس منتخب کریں' : 'Select Target Status'}
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.status;
                return (
                  <label
                    key={opt.status}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#122E32] bg-[#F0F4F5] shadow-xs ring-1 ring-[#122E32]/20'
                        : 'border-[#E1E4E6] bg-white hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complaintStatus"
                      value={opt.status}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.status)}
                      className="mt-1 text-[#122E32] focus:ring-[#122E32]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#0F1E21]">
                        {language === 'ur' ? opt.labelUr : opt.labelEn}
                      </div>
                      <div className="text-xs text-[#5B646B] mt-0.5">
                        {language === 'ur' ? opt.descUr : opt.descEn}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Progress / Resolution Note */}
          <div className="space-y-2">
            <label
              htmlFor="statusNote"
              className="block text-xs font-bold text-[#0F1E21] uppercase tracking-wider"
            >
              {t('deptRemediationNote')}
            </label>
            <textarea
              id="statusNote"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('deptRemediationNotePlaceholder')}
              className="w-full text-sm p-3.5 rounded-xl border border-[#E1E4E6] bg-white text-[#0F1E21] placeholder-[#8A9298] focus:outline-none focus:border-[#2C4A52] focus:ring-2 focus:ring-[#2C4A52]/15 transition-all resize-none"
            />
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#ECEEEF]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="dept-btn-secondary h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {t('deptCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="dept-btn-primary h-11 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
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
