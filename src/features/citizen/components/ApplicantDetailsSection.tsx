import React from 'react';
import { Input } from '../../../components/common/Input';
import { useLanguage } from '../../../context/LanguageContext';
import { ApplicantFormData } from '../../../types';

export interface ApplicantDetailsSectionProps {
  data: ApplicantFormData;
  onChange: (field: keyof ApplicantFormData, value: string) => void;
  errors: Partial<Record<keyof ApplicantFormData, string>>;
}

export const ApplicantDetailsSection: React.FC<ApplicantDetailsSectionProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  return (
    <div className="space-y-5">
      {/* Group Heading (Level 2) */}
      <div className="pb-3 border-b border-[#E5E3E0]">
        <h2 className="font-display font-bold text-lg sm:text-xl text-[#141414] tracking-tight">
          {t('sectionApplicantDetails')}
        </h2>
      </div>

      {/* Fields Column */}
      <div className="space-y-4">
        <Input
          label={t('formCitizenName')}
          required
          id="citizenName"
          autoComplete="name"
          placeholder={t('formCitizenNamePlaceholder')}
          value={data.citizenName}
          onChange={(e) => onChange('citizenName', e.target.value)}
          error={errors.citizenName}
        />

        <Input
          label={t('formPhone')}
          required
          id="citizenPhone"
          type="tel"
          autoComplete="tel"
          placeholder={t('formPhonePlaceholder')}
          value={data.citizenPhone}
          onChange={(e) => onChange('citizenPhone', e.target.value)}
          error={errors.citizenPhone}
          helperText={
            ur
              ? 'پاکستانی فارمیٹ: 03XXXXXXXXX یا +923XXXXXXXXX'
              : 'Pakistani format: 03XXXXXXXXX or +923XXXXXXXXX'
          }
        />

        <Input
          label={t('formEmail')}
          id="citizenEmail"
          type="email"
          autoComplete="email"
          placeholder={t('formEmailPlaceholder')}
          value={data.citizenEmail}
          onChange={(e) => onChange('citizenEmail', e.target.value)}
          error={errors.citizenEmail}
        />

        <Input
          label={t('formApplicantAddress')}
          id="applicantAddress"
          autoComplete="street-address"
          placeholder={t('formApplicantAddressPlaceholder')}
          value={data.applicantAddress}
          onChange={(e) => onChange('applicantAddress', e.target.value)}
          error={errors.applicantAddress}
        />
      </div>

      {/* Transparent Privacy Reassurance */}
      <p className="text-xs text-[#666] font-ui leading-relaxed pt-0.5">
        {t('applicantPrivacyNote')}
      </p>
    </div>
  );
};
