import React from 'react';
import { Input } from '../../../components/common/Input';
import { useLanguage } from '../../../context/LanguageContext';
import { ApplicantFormData } from '../../../types';
import { User, ShieldCheck } from 'lucide-react';

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
    <div id="applicant-details-panel" className="bg-white rounded-2xl border border-[#E8E5E1] p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(20,20,20,0.03)] flex flex-col justify-between">
      <div>
        {/* Designed Panel Header */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-[#F1EFEC]">
          <div className="w-10 h-10 rounded-xl bg-[#F7EFF0] text-[#681822] flex items-center justify-center shrink-0 border border-[#681822]/10">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm tracking-widest text-[#141414] uppercase">
              {t('sectionApplicantDetails')}
            </h2>
            <p className="text-xs text-[#77716E] font-ui mt-0.5">
              {t('panelApplicantSubtitle')}
            </p>
          </div>
        </div>

        {/* Form Fields: Balanced 2x2 Grid on Tablet/Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
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
      </div>

      {/* Transparent Privacy Reassurance Footer */}
      <div className="pt-4 border-t border-[#F1EFEC] flex items-center gap-2 text-xs text-[#77716E] font-ui">
        <ShieldCheck className="w-4 h-4 text-[#681822] shrink-0" />
        <span>{t('applicantPrivacyNote')}</span>
      </div>
    </div>
  );
};
