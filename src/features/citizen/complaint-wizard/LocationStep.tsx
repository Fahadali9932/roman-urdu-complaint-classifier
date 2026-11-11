import React from 'react';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiDistrict, ProblemLocationData } from '../../../types';
import { KarachiAreaCombobox } from '../components/KarachiAreaCombobox';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const KARACHI_DISTRICTS_OPTIONS: { value: KarachiDistrict; label: string }[] = KARACHI_DISTRICTS_DATA.map((d) => ({
  value: d.id,
  label: `${d.name} (${d.headquarters})`,
}));

export interface LocationStepProps {
  data: ProblemLocationData;
  onChange: (updates: Partial<ProblemLocationData>) => void;
  errors: Partial<Record<keyof ProblemLocationData, string>>;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { t, language } = useLanguage();
  const ur = language === 'ur';

  // Handle locality change with immediate automatic district resolution
  const handleLocalityChange = (localityName: string, explicitDistrict?: KarachiDistrict) => {
    if (!localityName.trim()) {
      onChange({
        locality: '',
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: false,
      });
      return;
    }

    if (explicitDistrict) {
      onChange({
        locality: localityName,
        district: explicitDistrict,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      });
      return;
    }

    const resolution = defaultLocalityResolver.resolve(localityName);

    if (resolution.status === 'verified' && resolution.district) {
      onChange({
        locality: localityName,
        district: resolution.district,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      });
    } else if (resolution.status === 'ambiguous') {
      onChange({
        locality: localityName,
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: true,
      });
    } else {
      onChange({
        locality: localityName,
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: true,
      });
    }
  };

  const handleDistrictChange = (newDistrict: KarachiDistrict) => {
    onChange({
      district: newDistrict,
      isDistrictAutoResolved: false,
      districtNeedsConfirmation: false,
    });
  };

  const mapsQuery = data.locality
    ? `${data.locality}, Karachi, Pakistan`
    : 'Karachi, Pakistan';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="space-y-5 text-start">
      {/* Locality Search Combobox */}
      <div className="space-y-1">
        <KarachiAreaCombobox
          id="locality"
          label={t('formLocality')}
          required
          placeholder={t('formLocalityPlaceholder')}
          value={data.locality}
          onChange={(name, matchedDist) => {
            if (matchedDist) {
              onChange({ locality: name, district: matchedDist, isDistrictAutoResolved: true, districtNeedsConfirmation: false });
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
            className="inline-flex items-center gap-1.5 text-xs text-[#681822] hover:text-[#52131b] hover:underline font-ui transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {ur ? 'گوگل میپس پر دیکھیں' : 'Find on Google Maps'}
          </a>
        </div>
      </div>

      {/* Quiet District Indicator after resolution */}
      <div>
        {data.isDistrictAutoResolved && data.district ? (
          <div className="rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] px-3.5 py-2.5 flex items-center justify-between transition-all">
            <div className="flex items-center gap-2">
              <label
                htmlFor="district"
                className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#77716E]"
              >
                {t('formDistrict')}:
              </label>
              <input
                id="district"
                readOnly
                tabIndex={0}
                aria-label="Karachi District"
                value={data.district}
                className="bg-transparent font-ui text-sm font-bold text-[#141414] outline-none cursor-default"
              />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#681822] font-ui shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#681822]" />
              {t('districtAutoIdentified')}
            </span>
          </div>
        ) : data.districtNeedsConfirmation ? (
          <div className="rounded-xl border border-[#681822]/30 bg-white p-3 transition-all space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="district"
                className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#77716E]"
              >
                {t('formDistrict')} <span className="text-[#681822]">*</span>
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#681822] font-ui">
                <AlertCircle className="w-3.5 h-3.5 text-[#681822]" />
                {t('districtNeedsConfirmation')}
              </span>
            </div>
            <Select
              id="district"
              aria-label="Karachi District"
              required
              placeholder={t('confirmDistrictPlaceholder')}
              options={KARACHI_DISTRICTS_OPTIONS}
              value={data.district}
              onChange={(e) => handleDistrictChange(e.target.value as KarachiDistrict)}
              error={errors.district}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[#E8E5E1] bg-[#FAF9F7] p-3 transition-all space-y-1.5">
            <label
              htmlFor="district"
              className="block text-[11px] font-mono font-bold tracking-wider uppercase text-[#77716E]"
            >
              {t('formDistrict')} <span className="text-[#681822]">*</span>
            </label>
            <Select
              id="district"
              aria-label="Karachi District"
              required
              placeholder={t('formDistrictPlaceholder')}
              options={KARACHI_DISTRICTS_OPTIONS}
              value={data.district}
              onChange={(e) => handleDistrictChange(e.target.value as KarachiDistrict)}
              error={errors.district}
            />
          </div>
        )}

        {errors.district && !data.districtNeedsConfirmation && (
          <p className="text-xs text-[#681822] font-ui font-medium pt-1">
            {errors.district}
          </p>
        )}
      </div>

      {/* Street, Block or Nearby Landmark */}
      <div>
        <Input
          label={t('formStreetLandmark')}
          required
          id="publicLocation"
          aria-label="Public issue location"
          placeholder={t('formStreetLandmarkPlaceholder')}
          value={data.publicLocation}
          onChange={(e) => onChange({ publicLocation: e.target.value })}
          error={errors.publicLocation}
          className="text-sm sm:text-base h-[46px]"
        />
        <p className="text-[11px] text-[#77716E] font-ui pt-1">
          {ur
            ? 'مخصوص گلی، بلاک یا قریبی نشانی بلدیاتی عملے کو صحیح مقام پر پہنچنے میں مدد دیتی ہے۔'
            : 'Street, block number, or landmark helps authorities identify the site.'}
        </p>
      </div>
    </div>
  );
};
