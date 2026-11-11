import React, { useState } from 'react';
import { Input } from '../../../components/common/Input';
import { useLanguage } from '../../../context/LanguageContext';
import { ApplicantFormData } from '../../../types';
import { ShieldCheck, Plus, X } from 'lucide-react';

export interface ApplicantStepProps {
  data: ApplicantFormData;
  onChange: (field: keyof ApplicantFormData, value: string) => void;
  errors: Partial<Record<keyof ApplicantFormData, string>>;
}

export const ApplicantStep: React.FC<ApplicantStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Address expandable toggle: auto-expand if applicantAddress already has a value
  const [showAddressField, setShowAddressField] = useState(Boolean(data.applicantAddress.trim()));

  const handleToggleAddress = () => {
    if (showAddressField) {
      onChange('applicantAddress', '');
      setShowAddressField(false);
    } else {
      setShowAddressField(true);
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Full Name & Phone Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 sm:gap-5">
        <div>
          <Input
            label={t('formCitizenName')}
            required
            id="citizenName"
            aria-label="Full Name"
            placeholder={t('formCitizenNamePlaceholder')}
            value={data.citizenName}
            onChange={(e) => onChange('citizenName', e.target.value)}
            error={errors.citizenName}
            className="text-base"
          />
        </div>

        <div>
          <Input
            label={t('formPhone')}
            required
            id="citizenPhone"
            type="tel"
            dir="ltr"
            aria-label="Phone Number"
            placeholder={t('formPhonePlaceholder')}
            value={data.citizenPhone}
            onChange={(e) => onChange('citizenPhone', e.target.value)}
            error={errors.citizenPhone}
            helperText={!errors.citizenPhone ? 'Format: 03XXXXXXXXX or +923XXXXXXXXX' : undefined}
            className="text-base text-start"
          />
        </div>
      </div>

      {/* Email Address (Optional) */}
      <div>
        <Input
          label={t('formEmail')}
          id="citizenEmail"
          type="email"
          dir="ltr"
          aria-label="Email Address"
          placeholder={t('formEmailPlaceholder')}
          value={data.citizenEmail}
          onChange={(e) => onChange('citizenEmail', e.target.value)}
          error={errors.citizenEmail}
          className="text-base text-start"
        />
      </div>

      {/* Discreet Expandable Residential Address Control */}
      <div>
        {!showAddressField ? (
          <button
            type="button"
            onClick={handleToggleAddress}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#681822] hover:text-[#52131b] hover:underline font-ui py-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('wizardAddAddress')}
          </button>
        ) : (
          <div className="space-y-2 p-4 rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] transition-all">
            <div className="flex items-center justify-between">
              <label
                htmlFor="applicantAddress"
                className="block text-xs sm:text-sm font-medium text-[#141414] select-none font-ui"
              >
                {t('formApplicantAddress')} <span className="text-[#77716E] font-normal text-xs">({ur ? 'اختیاری' : 'Optional'})</span>
              </label>
              <button
                type="button"
                onClick={handleToggleAddress}
                className="inline-flex items-center gap-1 text-xs text-[#77716E] hover:text-[#681822] transition-colors cursor-pointer font-ui"
              >
                <X className="w-3.5 h-3.5" />
                {t('wizardRemoveAddress')}
              </button>
            </div>
            <Input
              id="applicantAddress"
              aria-label="Applicant Address"
              placeholder={t('formApplicantAddressPlaceholder')}
              value={data.applicantAddress}
              onChange={(e) => onChange('applicantAddress', e.target.value)}
              className="text-base bg-white"
            />
          </div>
        )}
      </div>

      {/* Privacy Reassurance Note */}
      <div className="pt-2">
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FAF9F7] border border-[#E8E5E1] text-[#77716E]">
          <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0 mt-0.5" />
          <p className="text-xs font-ui leading-relaxed">
            {t('applicantPrivacyNote')}
          </p>
        </div>
      </div>
    </div>
  );
};
