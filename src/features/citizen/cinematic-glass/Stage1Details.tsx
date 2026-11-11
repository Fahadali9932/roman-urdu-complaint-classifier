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
    <form noValidate onSubmit={handleSubmit} className="space-y-4 text-start">
      {/* Full Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="citizenName"
          className="block text-xs sm:text-sm font-medium text-white/90 select-none font-ui"
        >
          {t('formCitizenName')} <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'} pointer-events-none text-white/50`}>
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
            className={`w-full h-11 sm:h-12 rounded-xl border text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui ${
              isRTL ? 'pe-4 ps-10' : 'ps-10 pe-4'
            } ${
              errors.citizenName
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/15 bg-white/[0.06] hover:border-white/30 focus:border-[#681822] focus:bg-white/[0.1] focus:ring-2 focus:ring-[#681822]/40'
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
          className="block text-xs sm:text-sm font-medium text-white/90 select-none font-ui"
        >
          {t('formPhone')} <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'} pointer-events-none text-white/50`}>
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
            className={`w-full h-11 sm:h-12 rounded-xl border text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui text-start ${
              isRTL ? 'pe-4 ps-10' : 'ps-10 pe-4'
            } ${
              errors.citizenPhone
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/15 bg-white/[0.06] hover:border-white/30 focus:border-[#681822] focus:bg-white/[0.1] focus:ring-2 focus:ring-[#681822]/40'
            }`}
          />
        </div>
        {errors.citizenPhone ? (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.citizenPhone}</p>
        ) : (
          <p className="text-[11px] text-white/50 font-mono">
            {ur ? 'پاکستانی نمبر درج کریں (مثلاً: 03001234567)' : 'e.g. 03001234567 or +923001234567'}
          </p>
        )}
      </div>

      {/* Email Address (Optional) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="citizenEmail"
            className="block text-xs sm:text-sm font-medium text-white/90 select-none font-ui"
          >
            {t('formEmail')}
          </label>
        </div>
        <div className="relative">
          <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'} pointer-events-none text-white/50`}>
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
            className={`w-full h-11 sm:h-12 rounded-xl border text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui text-start ${
              isRTL ? 'pe-4 ps-10' : 'ps-10 pe-4'
            } ${
              errors.citizenEmail
                ? 'border-rose-400 bg-rose-950/30 focus:ring-1 focus:ring-rose-400'
                : 'border-white/15 bg-white/[0.06] hover:border-white/30 focus:border-[#681822] focus:bg-white/[0.1] focus:ring-2 focus:ring-[#681822]/40'
            }`}
          />
        </div>
        {errors.citizenEmail ? (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.citizenEmail}</p>
        ) : (
          <p className="text-[11px] text-white/50 font-ui leading-relaxed">
            {t('glassEmailTruthfulNote')}
          </p>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-[#681822] hover:bg-[#52131b] active:scale-[0.99] text-white font-semibold text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer shadow-lg shadow-[#681822]/30 flex items-center justify-center gap-2"
        >
          <span>{t('glassBtnContinue')}</span>
          <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </form>
  );
};
