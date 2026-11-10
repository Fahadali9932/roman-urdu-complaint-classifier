import React from 'react';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiDistrict, ProblemLocationData } from '../../../types';
import { KarachiAreaCombobox } from './KarachiAreaCombobox';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const KARACHI_DISTRICTS_OPTIONS: { value: KarachiDistrict; label: string }[] = KARACHI_DISTRICTS_DATA.map((d) => ({
  value: d.id,
  label: `${d.name} (${d.headquarters})`,
}));

export interface ProblemLocationSectionProps {
  data: ProblemLocationData;
  onChange: (updates: Partial<ProblemLocationData>) => void;
  errors: Partial<Record<keyof ProblemLocationData, string>>;
}

export const ProblemLocationSection: React.FC<ProblemLocationSectionProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { t } = useLanguage();

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
      // Automatically identified verified district - clears any stale or conflicting district!
      onChange({
        locality: localityName,
        district: resolution.district,
        isDistrictAutoResolved: true,
        districtNeedsConfirmation: false,
      });
    } else if (resolution.status === 'ambiguous') {
      // Ambiguous area across districts (e.g. multiple matching localities)
      onChange({
        locality: localityName,
        district: '',
        isDistrictAutoResolved: false,
        districtNeedsConfirmation: true,
      });
    } else {
      // Unlisted / custom area
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

  return (
    <div className="space-y-4">
      {/* Editorial Section Heading */}
      <div className="pb-2 border-b border-[#E5E3E0]">
        <h2 className="font-display font-black text-sm tracking-widest text-[#141414] uppercase">
          {t('sectionProblemLocation')}
        </h2>
      </div>

      {/* Grid: Area Combobox and District Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Locality Search Combobox */}
        <KarachiAreaCombobox
          id="locality"
          label={t('formLocality')}
          required
          value={data.locality}
          onChange={(val, matchedDistrict) => handleLocalityChange(val, matchedDistrict)}
          error={errors.locality}
          placeholder={t('formLocalityPlaceholder')}
        />

        {/* District Display (Automatically Identified OR Confirmation Dropdown) */}
        <div>
          {data.isDistrictAutoResolved && data.district ? (
            <div className="space-y-1.5 text-start">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="district"
                  className="block font-ui text-xs sm:text-sm font-bold tracking-wide uppercase text-[#141414]"
                >
                  {t('formDistrict')} <span className="text-[#681822]">*</span>
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {t('districtAutoIdentified')}
                </span>
              </div>
              <input
                id="district"
                readOnly
                tabIndex={0}
                aria-label="Karachi District"
                value={data.district}
                className="w-full rounded-md border border-[#D8D6D2] bg-[#FAF9F7] py-2.5 px-3.5 font-sans text-sm font-semibold text-[#141414] outline-none cursor-default"
              />
            </div>
          ) : data.districtNeedsConfirmation ? (
            <div className="space-y-1.5 text-start">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="district"
                  className="block font-ui text-xs sm:text-sm font-bold tracking-wide uppercase text-[#141414]"
                >
                  {t('formDistrict')} <span className="text-[#681822]">*</span>
                </label>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#681822] font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-[#681822]" />
                  {t('districtNeedsConfirmation')}
                </span>
              </div>
              <Select
                id="district"
                label="Karachi District"
                required
                placeholder={t('confirmDistrictPlaceholder')}
                options={KARACHI_DISTRICTS_OPTIONS}
                value={data.district}
                onChange={(e) => handleDistrictChange(e.target.value as KarachiDistrict)}
                error={errors.district}
              />
            </div>
          ) : (
            <div className="space-y-1.5 text-start">
              <label
                htmlFor="district"
                className="block font-ui text-xs sm:text-sm font-bold tracking-wide uppercase text-[#141414]"
              >
                {t('formDistrict')} <span className="text-[#681822]">*</span>
              </label>
              <Select
                id="district"
                label="Karachi District"
                required
                placeholder={t('formDistrictPlaceholder')}
                options={KARACHI_DISTRICTS_OPTIONS}
                value={data.district}
                onChange={(e) => handleDistrictChange(e.target.value as KarachiDistrict)}
                error={errors.district}
              />
            </div>
          )}
        </div>
      </div>

      {/* Street, Block or Nearby Landmark Input */}
      <Input
        label={t('formStreetLandmark')}
        required
        id="publicLocation"
        aria-label="Public issue location"
        placeholder={t('formStreetLandmarkPlaceholder')}
        value={data.publicLocation}
        onChange={(e) => onChange({ publicLocation: e.target.value })}
        error={errors.publicLocation}
      />
    </div>
  );
};
