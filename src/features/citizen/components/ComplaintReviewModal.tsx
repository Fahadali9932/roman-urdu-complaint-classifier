import React from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { FullComplaintFormState } from '../../../types';

export interface ComplaintReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FullComplaintFormState;
}

export const ComplaintReviewModal: React.FC<ComplaintReviewModalProps> = ({
  isOpen,
  onClose,
  formData,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  const { applicant, location, complaint } = formData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modalTitle')}>
      <div className="space-y-5 text-start">
        {/* Verification Success Pill */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          <div className="space-y-1">
            <span className="block text-sm font-bold text-[#141414] tracking-wide">
              {ur ? 'فارم جائزے کے لیے تیار ہے' : 'Your form is ready to review'}
            </span>
            <p className="text-xs text-[#555]">
              {ur
                ? 'تمام ضروری خانے، الفاظ کی حد اور کراچی لوکیشن ویلیڈیٹ ہو چکی ہیں۔'
                : 'Required fields, 200-word limit, and Karachi locality have been validated.'}
            </p>
          </div>
        </div>

        {/* Clean Structured Review Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-[#D8D6D2] bg-white space-y-3 font-sans text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F0EFEB] gap-1">
            <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider">
              {ur ? 'درخواست گزار' : 'Applicant'}
            </span>
            <span className="font-semibold text-[#141414]">{applicant.citizenName}</span>
          </div>

          {applicant.citizenEmail && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F0EFEB] gap-1">
              <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider">
                {ur ? 'ای میل' : 'Email'}
              </span>
              <span className="font-mono text-[#141414]">{applicant.citizenEmail}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F0EFEB] gap-1">
            <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider">
              {ur ? 'علاقہ و ضلع' : 'Locality & District'}
            </span>
            <span className="font-semibold text-[#141414]">
              {location.locality} &bull; {location.district}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F0EFEB] gap-1">
            <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider">
              {ur ? 'مسئلے کی عوامی جگہ' : 'Issue Location'}
            </span>
            <span className="font-medium text-[#141414]">{location.publicLocation}</span>
          </div>

          <div className="pt-2 space-y-1">
            <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider block">
              {ur ? 'عنوان' : 'Subject'}
            </span>
            <p className="font-bold text-[#141414] text-sm">{complaint.title}</p>
          </div>

          <div className="pt-2 space-y-1 border-t border-[#F0EFEB]">
            <span className="text-[#666] font-mono text-[11px] uppercase tracking-wider block">
              {ur ? 'شکایت کی تفصیل' : 'Description'}
            </span>
            <p className="text-xs sm:text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>
        </div>

        {/* Honest Prototype Notice & Privacy Guarantee */}
        <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E5E3E0] flex items-start gap-3 text-xs text-[#555] font-ui">
          <ShieldAlert className="w-4 h-4 text-[#681822] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[#141414]">
              {t('modalNoticeHeader')}
            </p>
            <p className="leading-relaxed">
              {t('modalNoticeText')}
            </p>
            <p className="text-[11px] font-mono text-[#777] pt-1">
              {ur
                ? 'رازداری کا اصول: آپ کا فون نمبر اور رہائشی پتہ ڈیٹا بیس میں محفوظ نہیں کیا جاتا۔'
                : 'Privacy guarantee: Phone number and residential address are not saved by the application.'}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto px-5 tracking-wide text-xs font-bold"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            {ur ? 'درخواست پر واپس جائیں' : 'Return to form'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
