import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { User, Phone, Mail, ArrowRight } from 'lucide-react';
import { ApplicantFormData } from '../../../types';

export interface Stage1DetailsProps {
  data: ApplicantFormData;
  onChange: (field: keyof ApplicantFormData, value: string) => void;
  errors: Partial<Record<keyof ApplicantFormData, string>>;
  onContinue: () => void;
}

export const Stage1Details: React.FC<Stage1DetailsProps> = ({
  data,
  onChange,
  errors,
  onContinue,
}) => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-start">
      {/* Full Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="citizenName"
          className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
        >
          {t('formCitizenName')} <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} pointer-events-none text-white/55`}>
            <User className="w-4 h-4" />
          </div>
          <input
            id="citizenName"
            type="text"
            required
            autoComplete="name"
            aria-label="Full Name"
            placeholder={t('formCitizenNamePlaceholder')}
            value={data.citizenName}
            onChange={(e) => onChange('citizenName', e.target.value)}
            className={`w-full h-[52px] sm:h-14 rounded-[16px] border-[1.5px] text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui ${
              isRTL ? 'pe-4 ps-11' : 'ps-11 pe-4'
            } ${
              errors.citizenName
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/14 bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.09] focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)]'
            }`}
          />
        </div>
        {errors.citizenName && (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.citizenName}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <label
          htmlFor="citizenPhone"
          className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
        >
          {t('formPhone')} <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} pointer-events-none text-white/55`}>
            <Phone className="w-4 h-4" />
          </div>
          <input
            id="citizenPhone"
            type="tel"
            dir="ltr"
            required
            autoComplete="tel"
            aria-label="Phone Number"
            placeholder={t('formPhonePlaceholder')}
            value={data.citizenPhone}
            onChange={(e) => onChange('citizenPhone', e.target.value)}
            className={`w-full h-[52px] sm:h-14 rounded-[16px] border-[1.5px] text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui text-start ${
              isRTL ? 'pe-4 ps-11' : 'ps-11 pe-4'
            } ${
              errors.citizenPhone
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/14 bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.09] focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)]'
            }`}
          />
        </div>
        {errors.citizenPhone ? (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.citizenPhone}</p>
        ) : (
          <p className="text-[11.5px] text-white/55 font-mono">
            {ur ? 'پاکستانی نمبر درج کریں (مثلاً: 03001234567)' : 'e.g. 03001234567 or +923001234567'}
          </p>
        )}
      </div>

      {/* Email Address (Optional) */}
      <div className="space-y-1.5">
        <label
          htmlFor="citizenEmail"
          className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
        >
          {t('formEmail')}
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} pointer-events-none text-white/55`}>
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="citizenEmail"
            type="email"
            dir="ltr"
            autoComplete="email"
            aria-label="Email Address"
            placeholder={t('formEmailPlaceholder')}
            value={data.citizenEmail}
            onChange={(e) => onChange('citizenEmail', e.target.value)}
            className={`w-full h-[52px] sm:h-14 rounded-[16px] border-[1.5px] text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui text-start ${
              isRTL ? 'pe-4 ps-11' : 'ps-11 pe-4'
            } ${
              errors.citizenEmail
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/14 bg-white/[0.07] hover:border-white/25 hover:bg-white/[0.09] focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)]'
            }`}
          />
        </div>
        {errors.citizenEmail ? (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.citizenEmail}</p>
        ) : (
          <p className="text-[11.5px] text-white/55 font-ui leading-relaxed">
            {t('glassEmailTruthfulNote')}
          </p>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-3">
        <button
          type="submit"
          className="w-full h-[52px] sm:h-14 rounded-[16px] bg-gradient-to-r from-[#681822] to-[#801D2A] hover:from-[#781B27] hover:to-[#922230] active:scale-[0.99] text-white font-semibold text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer shadow-[0_12px_28px_rgba(104,24,34,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_16px_36px_rgba(104,24,34,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <span>{t('glassBtnContinue')}</span>
          <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </form>
  );
};
