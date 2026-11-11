import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiAreaCombobox } from '../components/KarachiAreaCombobox';
import { ProblemLocationData, KarachiDistrict } from '../../../types';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Home,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const KARACHI_DISTRICTS_OPTIONS: { value: KarachiDistrict; label: string }[] = KARACHI_DISTRICTS_DATA.map((d) => ({
  value: d.id,
  label: `${d.name} (${d.headquarters})`,
}));

export interface Stage2LocationProps {
  data: ProblemLocationData;
  applicantAddress?: string;
  onChangeLocation: (updates: Partial<ProblemLocationData>) => void;
  onChangeAddress: (address: string) => void;
  errors: Partial<Record<keyof ProblemLocationData, string>>;
  onContinue: () => void;
  onBack: () => void;
}

export const Stage2Location: React.FC<Stage2LocationProps> = ({
  data,
  applicantAddress = '',
  onChangeLocation,
  onChangeAddress,
  errors,
  onContinue,
  onBack,
}) => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  // Toggle for optional residential address
  const [showHomeAddress, setShowHomeAddress] = useState<boolean>(Boolean(applicantAddress.trim()));

  // Google Maps helper link
  const mapsQuery = data.locality
    ? `${data.locality}, Karachi, Pakistan`
    : 'Karachi, Sindh, Pakistan';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  // Handle locality change
  const handleLocalityChange = (localityName: string, explicitDistrict?: KarachiDistrict) => {
    if (!localityName.trim()) {
      onChangeLocation({
        locality: '',
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: false,
      });
      return;
    }

    if (explicitDistrict) {
      onChangeLocation({
        locality: localityName,
        district: explicitDistrict,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      });
      return;
    }

    const resolution = defaultLocalityResolver.resolve(localityName);

    if (resolution.status === 'verified' && resolution.district) {
      onChangeLocation({
        locality: localityName,
        district: resolution.district,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      });
    } else {
      onChangeLocation({
        locality: localityName,
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: true,
      });
    }
  };

  // Handle district manual change
  const handleDistrictChange = (district: KarachiDistrict) => {
    onChangeLocation({
      district,
      isDistrictAutoResolved: false,
      districtNeedsConfirmation: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-start">
      {/* 1. Karachi Area / Locality Combobox with glass styling */}
      <div className="space-y-1.5">
        <KarachiAreaCombobox
          id="locality"
          label={t('formLocality')}
          required
          variant="glass"
          placeholder={t('formLocalityPlaceholder')}
          value={data.locality}
          onChange={(name, matchedDist) => {
            if (matchedDist) {
              onChangeLocation({
                locality: name,
                district: matchedDist,
                isDistrictAutoResolved: true,
                districtNeedsConfirmation: false,
              });
            } else {
              handleLocalityChange(name);
            }
          }}
          selectedDistrict={data.district}
          error={errors.locality}
        />

        {/* Free Official Google Maps Companion Link */}
        <div className="flex justify-end pt-0.5">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#E89BA4] hover:text-white hover:underline font-ui transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{ur ? 'گوگل میپس پر دیکھیں' : 'Find on Google Maps'}</span>
          </a>
        </div>
      </div>

      {/* 2. Karachi District Indicator / Selector */}
      <div className="space-y-1.5">
        {data.isDistrictAutoResolved && data.district ? (
          <div className="rounded-[16px] border border-white/20 bg-white/[0.08] backdrop-blur-md px-4 py-3.5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="district"
                className="text-[11.5px] font-mono font-bold tracking-wider uppercase text-white/75"
              >
                {t('formDistrict')}:
              </label>
              <input
                id="district"
                readOnly
                tabIndex={0}
                aria-label="Karachi District"
                value={data.district}
                className="bg-transparent font-ui text-sm sm:text-base font-bold text-white outline-none cursor-default"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFCCD2] font-ui shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#FFCCD2]" />
              {t('districtAutoIdentified')}
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="district"
                className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
              >
                {t('formDistrict')} <span className="text-[#FFCCD2] ms-0.5" aria-hidden="true">*</span>
              </label>
              {data.districtNeedsConfirmation && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFCCD2] font-ui">
                  <AlertCircle className="w-3.5 h-3.5 text-[#FFCCD2]" />
                  {t('districtNeedsConfirmation')}
                </span>
              )}
            </div>
            <select
              id="district"
              aria-label="Karachi District"
              required
              value={data.district}
              onChange={(e) => handleDistrictChange(e.target.value as KarachiDistrict)}
              className={`w-full h-[52px] sm:h-14 rounded-[16px] border-[1.5px] bg-[rgba(22,20,24,0.65)] backdrop-blur-md text-sm sm:text-base text-white transition-all outline-none font-ui px-4 ${
                errors.district
                  ? 'border-rose-400 bg-rose-950/30'
                  : 'border-white/14 hover:border-white/25 focus:border-[#E89BA4] focus:ring-2 focus:ring-[#681822]/40'
              }`}
            >
              <option value="" disabled className="bg-[#181818] text-white/50">
                {t('formDistrictPlaceholder')}
              </option>
              {KARACHI_DISTRICTS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#181818] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {errors.district && (
          <p className="text-xs text-[#FFCCD2] font-ui pt-0.5">{errors.district}</p>
        )}
      </div>

      {/* 3. Optional Residential Home Address (Kept Private) */}
      <div className="pt-1">
        {!showHomeAddress ? (
          <button
            type="button"
            onClick={() => setShowHomeAddress(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#E89BA4] hover:text-white hover:underline font-ui py-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{ur ? 'رہائشی پتہ شامل کریں (اختیاری)' : 'Add home address (optional)'}</span>
          </button>
        ) : (
          <div className="space-y-1.5 p-4 rounded-[18px] border border-white/14 bg-white/[0.05] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <label
                htmlFor="applicantAddress"
                className="block text-[13px] sm:text-sm font-semibold text-white/90 select-none font-ui"
              >
                {ur ? 'گھر کا پتہ' : 'Home Address'}{' '}
                <span className="text-xs text-white/55 font-normal">({ur ? 'اختیاری' : 'Optional'})</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onChangeAddress('');
                  setShowHomeAddress(false);
                }}
                className="text-white/60 hover:text-white text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{ur ? 'ہٹائیں' : 'Remove'}</span>
              </button>
            </div>
            <div className="relative">
              <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} pointer-events-none text-white/55`}>
                <Home className="w-4 h-4" />
              </div>
              <input
                id="applicantAddress"
                type="text"
                autoComplete="street-address"
                aria-label="Home Address"
                placeholder={ur ? 'مثلاً: مکان نمبر، گلی، بلاک' : 'e.g., House #, Street, Block'}
                value={applicantAddress}
                onChange={(e) => onChangeAddress(e.target.value)}
                className={`w-full h-[52px] sm:h-14 rounded-[16px] border-[1.5px] border-white/14 bg-white/[0.07] text-sm sm:text-base text-white placeholder:text-white/40 transition-all outline-none font-ui ${
                  isRTL ? 'pe-4 ps-11' : 'ps-11 pe-4'
                } hover:border-white/25 focus:border-[#E89BA4] focus:bg-white/[0.11] focus:ring-2 focus:ring-[#681822]/40 focus:shadow-[0_0_16px_rgba(104,24,34,0.35)]`}
              />
            </div>
            <p className="text-[11.5px] text-white/55 font-ui leading-relaxed">
              {t('glassAddressTruthfulNote')}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-[52px] sm:h-14 px-6 rounded-[16px] border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.99] text-white font-medium text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('glassBtnBack')}</span>
        </button>

        <button
          type="submit"
          className="flex-1 h-[52px] sm:h-14 rounded-[16px] bg-gradient-to-r from-[#681822] to-[#801D2A] hover:from-[#781B27] hover:to-[#922230] active:scale-[0.99] text-white font-semibold text-sm sm:text-base font-ui transition-all duration-200 cursor-pointer shadow-[0_12px_28px_rgba(104,24,34,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_16px_36px_rgba(104,24,34,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <span>{t('glassBtnContinueToComplaint')}</span>
          <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </form>
  );
};
