import React, { useState } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { complaintService } from '../../../services/MockComplaintService';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../../types';
import {
  X,
  AlertCircle,
  Send,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

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
  descriptionEn: string;
  descriptionUr: string;
}[] = [
  {
    status: 'under_review',
    labelEn: 'Under Review',
    labelUr: 'زیرِ جائزہ',
    descriptionEn: 'Grievance assigned to engineering / technical desk for feasibility inspection.',
    descriptionUr: 'شکایت تکنیکی اور فیلڈ معائنے کے جائزے کے مرحلے میں ہے۔',
  },
  {
    status: 'assigned',
    labelEn: 'Field Team Dispatched',
    labelUr: 'فیلڈ ٹیم تفویض',
    descriptionEn: 'Maintenance crew or inspection vehicle scheduled and dispatched to site.',
    descriptionUr: 'متعلقہ مقام پر فیلڈ ٹیم یا عملہ روانہ کر دیا گیا ہے۔',
  },
  {
    status: 'in_progress',
    labelEn: 'Remediation In Progress',
    labelUr: 'مسئلے پر کام جاری ہے',
    descriptionEn: 'Active work underway on site (e.g. cable splicing, pipe repair, garbage clearance).',
    descriptionUr: 'موقع پر عملی کام اور مرمت جاری ہے۔',
  },
  {
    status: 'resolved',
    labelEn: 'Resolved & Restored',
    labelUr: 'مسئلہ حل ہو گیا',
    descriptionEn: 'Civic issue has been fully rectified, tested, and restored to service.',
    descriptionUr: 'مسئلہ مکمل حل ہو چکا ہے اور سروس بحال ہو چکی ہے۔',
  },
  {
    status: 'rejected',
    labelEn: 'Closed / Not Actionable',
    labelUr: 'شکایت بند / غیر متعلقہ',
    descriptionEn: 'Outside jurisdiction, duplicate report, or invalid location information.',
    descriptionUr: 'دائرہ اختیار سے باہر، پہلے سے درج، یا غلط معلومات کی بناء پر بند۔',
  },
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onUpdated,
}) => {
  const { departmentId, officer } = useDepartmentAuth();
  const { language, t } = useLanguage();

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    complaint.status
  );
  const [officerNote, setOfficerNote] = useState('');
  const [officerNoteUrdu, setOfficerNoteUrdu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await complaintService.updateComplaintStatus(
        departmentId,
        complaint.referenceNumber,
        selectedStatus,
        officerNote.trim() || undefined,
        officerNoteUrdu.trim() || undefined
      );

      if (res.success) {
        onUpdated(res.complaint);
        onClose();
      } else {
        setError('Failed to update status. Please try again.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FFFFFF] border border-[#E5E3E0] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E3E0] flex items-center justify-between bg-[#FAFAF8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#681822]/10 text-[#681822] flex items-center justify-center font-bold text-xs">
              {complaint.referenceNumber.slice(-4)}
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#141414]">
                {t('deptStatusModalTitle')}
              </h3>
              <p className="text-[11px] text-[#737373]">
                {complaint.referenceNumber} • {complaint.locality}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F0EDE6] text-[#737373] hover:text-[#141414] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#141414] uppercase tracking-wider">
              {t('deptSelectNewStatus')}
            </label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.status;
                return (
                  <label
                    key={opt.status}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#681822] bg-[#681822]/5 shadow-xs'
                        : 'border-[#E5E3E0] hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.status}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.status)}
                      className="mt-0.5 text-[#681822] focus:ring-[#681822]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#141414]">
                          {language === 'ur' ? opt.labelUr : opt.labelEn}
                        </span>
                        {opt.status === complaint.status && (
                          <span className="text-[10px] text-[#737373] bg-[#EBE8E1] px-1.5 py-0.5 rounded">
                            {language === 'ur' ? 'موجودہ سٹیٹس' : 'Current'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">
                        {language === 'ur' ? opt.descriptionUr : opt.descriptionEn}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Officer Remediation Notes (English) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#141414]">
              {t('deptOfficerNote')}
            </label>
            <textarea
              value={officerNote}
              onChange={(e) => setOfficerNote(e.target.value)}
              placeholder={t('deptOfficerNotePlaceholder')}
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-[#E5E3E0] bg-[#FFFFFF] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#681822]/20 focus:border-[#681822]"
            />
          </div>

          {/* Officer Remediation Notes (Urdu) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#141414]">
              {t('deptOfficerNoteUrdu')}
            </label>
            <textarea
              dir="rtl"
              value={officerNoteUrdu}
              onChange={(e) => setOfficerNoteUrdu(e.target.value)}
              placeholder={t('deptOfficerNoteUrduPlaceholder')}
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-[#E5E3E0] bg-[#FFFFFF] text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#681822]/20 focus:border-[#681822]"
            />
          </div>

          {/* Audit trail indicator */}
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E5E3E0] text-[11px] text-[#737373] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0" />
            <span>
              Action logged by {officer.name} ({officer.badgeNumber}). Updated timeline is immediately visible in citizen tracking.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E3E0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#E5E3E0] text-xs font-medium text-[#141414] hover:bg-[#FAFAF8] transition-colors"
            >
              {t('deptCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#681822] hover:bg-[#50131B] text-[#FFFFFF] text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#681822]/40 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('deptSaving')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('deptConfirmUpdate')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
