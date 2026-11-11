import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { FullComplaintFormState } from '../../../types';
import { Edit2, CheckCircle2, User, MapPin, FileText, AlertCircle } from 'lucide-react';

export interface ReviewStepProps {
  formData: FullComplaintFormState;
  onEditSection: (stepIndex: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  onEditSection,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  return (
    <div className="space-y-4 text-start divide-y divide-[#F1EFEC]">
      {/* SECTION 1: COMPLAINT */}
      <div className="space-y-2 pt-1 first:pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#141414]">
            <FileText className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-xs tracking-wider uppercase text-[#141414]">
              {t('wizardSummaryProblem')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryProblem')}`}
          >
            <Edit2 className="w-3 h-3" />
            <span>{t('wizardEditSection')}</span>
          </button>
        </div>

        <div className="space-y-1 ps-6">
          <p className="font-ui text-sm font-bold text-[#141414]">
            {formData.complaint.title || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
          </p>
          <p className="font-ui text-xs text-[#555] leading-relaxed line-clamp-3">
            {formData.complaint.description || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
          </p>
        </div>
      </div>

      {/* SECTION 2: LOCATION */}
      <div className="space-y-2 pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#141414]">
            <MapPin className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-xs tracking-wider uppercase text-[#141414]">
              {t('wizardSummaryLocation')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(2)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryLocation')}`}
          >
            <Edit2 className="w-3 h-3" />
            <span>{t('wizardEditSection')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-ui ps-6">
          <div>
            <span className="text-[#77716E]">{t('formLocality')}:</span>{' '}
            <span className="font-semibold text-[#141414]">
              {formData.location.locality || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#77716E]">{t('formDistrict')}:</span>{' '}
            {formData.location.district ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#141414]">
                <CheckCircle2 className="w-3 h-3 text-[#681822]" />
                {formData.location.district}
              </span>
            ) : (
              <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>
            )}
          </div>

          <div className="sm:col-span-2">
            <span className="text-[#77716E]">{t('formStreetLandmark')}:</span>{' '}
            <span className="text-[#141414]">
              {formData.location.publicLocation || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: CONTACT */}
      <div className="space-y-2 pt-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#141414]">
            <User className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-xs tracking-wider uppercase text-[#141414]">
              {t('wizardSummaryApplicant')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(3)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryApplicant')}`}
          >
            <Edit2 className="w-3 h-3" />
            <span>{t('wizardEditSection')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-ui ps-6">
          <div>
            <span className="text-[#77716E]">{t('formCitizenName')}:</span>{' '}
            <span className="font-semibold text-[#141414]">
              {formData.applicant.citizenName || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
            </span>
          </div>

          <div>
            <span className="text-[#77716E]">{t('formPhone')}:</span>{' '}
            <span dir="ltr" className="font-semibold text-[#141414]">
              {formData.applicant.citizenPhone || <span className="text-[#A8A29E] italic">{t('wizardNotProvided')}</span>}
            </span>
          </div>

          {formData.applicant.citizenEmail && (
            <div>
              <span className="text-[#77716E]">{t('formEmail')}:</span>{' '}
              <span dir="ltr" className="text-[#141414]">
                {formData.applicant.citizenEmail}
              </span>
            </div>
          )}

          {formData.applicant.applicantAddress && (
            <div className="sm:col-span-2">
              <span className="text-[#77716E]">{t('formApplicantAddress')}:</span>{' '}
              <span className="text-[#141414]">
                {formData.applicant.applicantAddress}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quiet Honest Prototype Notice */}
      <div className="pt-3.5">
        <div className="flex items-center gap-2 text-[#77716E] text-xs font-ui">
          <AlertCircle className="w-3.5 h-3.5 text-[#681822] shrink-0" />
          <span>
            {ur
              ? 'پیش منظر: یہ ایک تعلیمی پروٹوٹائپ ہے۔ سبمٹ کرنے سے تصدیقی پیش منظر ظاہر ہوگا۔'
              : 'Prototype Preview: Submitting opens a verification preview. No live complaint is dispatched.'}
          </span>
        </div>
      </div>
    </div>
  );
};
