import React from 'react';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { useLanguage } from '../../../context/LanguageContext';
import { KarachiDistrict, ProblemLocationData } from '../../../types';
import { KarachiAreaCombobox } from './KarachiAreaCombobox';
import { KARACHI_DISTRICTS_DATA } from '../../../data/karachi/districts';
import { defaultLocalityResolver } from '../../../data/karachi/locationResolver';
import { CheckCircle2, AlertCircle, ExternalLink, MapPin, Building2 } from 'lucide-react';

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
    <div className="bg-[#FCFBF9] rounded-2xl border border-[#E8E5E1] p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(20,20,20,0.03)] flex flex-col justify-between">
      <div>
        {/* Designed Panel Header */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-[#F1EFEC]">
          <div className="w-10 h-10 rounded-xl bg-[#F7EFF0] text-[#681822] flex items-center justify-center shrink-0 border border-[#681822]/10">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm tracking-widest text-[#141414] uppercase">
              {t('sectionProblemLocation')}
            </h2>
            <p className="text-xs text-[#77716E] font-ui mt-0.5">
              {t('panelLocationSubtitle')}
            </p>
          </div>
        </div>

        {/* Fields Area */}
        <div className="space-y-4.5 py-5">
          {/* Locality Search Combobox */}
          <div>
            <KarachiAreaCombobox
              id="locality"
              label={t('formLocality')}
              required
              value={data.locality}
              onChange={(val, matchedDistrict) => handleLocalityChange(val, matchedDistrict)}
              error={errors.locality}
              placeholder={t('formLocalityPlaceholder')}
            />
            <div className="flex items-center justify-end text-xs pt-1.5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  data.locality ? `${data.locality}, Karachi, Pakistan` : 'Karachi, Pakistan'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822] hover:text-[#53131B] hover:underline underline-offset-2 transition-colors py-0.5"
                aria-label={ur ? 'گوگل میپس پر تلاش کریں (نئی ونڈو میں کھلے گا)' : 'Find on Google Maps (opens in new tab)'}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {ur ? 'گوگل میپس پر دیکھیں' : 'Find on Google Maps'}
              </a>
            </div>
          </div>

          {/* District Display: Signature Designed Surface */}
          <div>
            {data.isDistrictAutoResolved && data.district ? (
              <div className="rounded-xl border border-[#E8E5E1] bg-white p-3.5 transition-all shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="district"
                    className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#77716E]"
                  >
                    {t('formDistrict')} <span className="text-[#681822]">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#681822] font-ui">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#681822]" />
                    {t('districtAutoIdentified')}
                  </span>
                </div>
                <input
                  id="district"
                  readOnly
                  tabIndex={0}
                  aria-label="Karachi District"
                  value={data.district}
                  className="w-full bg-transparent font-ui text-base font-bold text-[#141414] outline-none cursor-default"
                />
              </div>
            ) : data.districtNeedsConfirmation ? (
              <div className="rounded-xl border border-[#681822]/30 bg-white p-3.5 transition-all shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="district"
                    className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#77716E]"
                  >
                    {t('formDistrict')} <span className="text-[#681822]">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#681822] font-ui">
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
              <div className="rounded-xl border border-[#E8E5E1] bg-white p-3.5 transition-all shadow-2xs space-y-2">
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
      </div>

      {/* Transparent Municipal Dispatch Note */}
      <div className="pt-4 border-t border-[#F1EFEC] flex items-center gap-2 text-xs text-[#77716E] font-ui">
        <Building2 className="w-4 h-4 text-[#681822] shrink-0" />
        <span>
          {ur
            ? 'یہ مقام متعلقہ میونسپل کارپوریشن کو حل کے لیے روانہ کیا جاتا ہے۔'
            : 'The specified issue location directs municipal authorities to the exact site.'}
        </span>
      </div>
    </div>
  );
};
