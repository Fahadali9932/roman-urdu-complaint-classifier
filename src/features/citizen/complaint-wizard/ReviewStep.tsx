import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { FullComplaintFormState } from '../../../types';
import { Edit2, AlertCircle, CheckCircle2, User, MapPin, FileText } from 'lucide-react';

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
    <div className="space-y-6 text-start">
      {/* SECTION 1: THE PROBLEM */}
      <div className="rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] p-5 space-y-3.5 transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5E1]/80">
          <div className="flex items-center gap-2 text-[#141414]">
            <FileText className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-sm tracking-wide uppercase text-[#141414]">
              {t('wizardSummaryProblem')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryProblem')}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('wizardEditSection')}
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formSubject')}
            </span>
            <p className="font-ui text-sm sm:text-base font-bold text-[#141414] mt-0.5">
              {formData.complaint.title || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formDescribeComplaint')}
            </span>
            <p className="font-ui text-sm text-[#141414] leading-relaxed whitespace-pre-wrap mt-0.5 bg-white p-3 rounded-lg border border-[#E8E5E1]/60">
              {formData.complaint.description || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: THE LOCATION */}
      <div className="rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] p-5 space-y-3.5 transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5E1]/80">
          <div className="flex items-center gap-2 text-[#141414]">
            <MapPin className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-sm tracking-wide uppercase text-[#141414]">
              {t('wizardSummaryLocation')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(2)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryLocation')}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('wizardEditSection')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formLocality')}
            </span>
            <p className="font-ui text-sm font-semibold text-[#141414] mt-0.5">
              {formData.location.locality || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formDistrict')}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {formData.location.district ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#681822]" />
                  <span className="font-ui text-sm font-bold text-[#141414]">
                    {formData.location.district}
                  </span>
                </>
              ) : (
                <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formStreetLandmark')}
            </span>
            <p className="font-ui text-sm text-[#141414] mt-0.5">
              {formData.location.publicLocation || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: YOUR DETAILS */}
      <div className="rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] p-5 space-y-3.5 transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5E1]/80">
          <div className="flex items-center gap-2 text-[#141414]">
            <User className="w-4 h-4 text-[#681822]" />
            <h2 className="font-display font-bold text-sm tracking-wide uppercase text-[#141414]">
              {t('wizardSummaryApplicant')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEditSection(3)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822] hover:text-[#52131b] hover:underline font-ui cursor-pointer transition-colors"
            aria-label={`${t('wizardEditSection')} ${t('wizardSummaryApplicant')}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('wizardEditSection')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formCitizenName')}
            </span>
            <p className="font-ui text-sm font-semibold text-[#141414] mt-0.5">
              {formData.applicant.citizenName || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formPhone')}
            </span>
            <p dir="ltr" className="font-ui text-sm font-semibold text-[#141414] mt-0.5 text-start">
              {formData.applicant.citizenPhone || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
              {t('formEmail')}
            </span>
            <p dir="ltr" className="font-ui text-sm text-[#141414] mt-0.5 text-start">
              {formData.applicant.citizenEmail || <span className="text-[#77716E] italic">{t('wizardNotProvided')}</span>}
            </p>
          </div>

          {formData.applicant.applicantAddress && (
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#77716E]">
                {t('formApplicantAddress')}
              </span>
              <p className="font-ui text-sm text-[#141414] mt-0.5">
                {formData.applicant.applicantAddress}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Honest Prototype Notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white border border-[#E8E5E1] text-[#77716E]">
        <AlertCircle className="w-4 h-4 text-[#681822] shrink-0 mt-0.5" />
        <p className="text-xs font-ui leading-relaxed">
          {ur
            ? 'نوٹ: یہ ایک تعلیمی کیپ اسٹون پروٹوٹائپ ہے۔ حتمی بٹن دبانے سے کلائنٹ سائیڈ تصدیقی پیش منظر کھلے گا۔ ابھی کوئی سرکاری یا بلدیاتی کارروائی شروع نہیں ہوگی۔'
            : 'Academic Prototype Note: Submitting will open a client-side verification preview. No complaint is sent or stored to a live municipal server yet.'}
        </p>
      </div>
    </div>
  );
};
