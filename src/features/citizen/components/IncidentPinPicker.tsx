import { useState } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { verifySindhLocation } from '../../../lib/geo/sindhEligibility';
import { useLanguage } from '../../../context/LanguageContext';

export type IncidentPin = { latitude: number; longitude: number };

export interface IncidentPinPickerProps {
  value: IncidentPin | null;
  onChange: (point: IncidentPin | null) => void;
  onLocatingChange?: (isLocating: boolean) => void;
  error?: string;
}

/**
 * Mandatory Live Incident Location Section.
 * - Single clean action: "Add location"
 * - In-progress: "Getting your location..." with subtle spinner
 * - Attached: "Location attached." with maroon/neutral checkmark, "Update location" & "Clear"
 * - Zero maps, zero manual coordinates inputs, zero lat/lon display, zero centroid fallback.
 */
export function IncidentPinPicker({
  value,
  onChange,
  onLocatingChange,
  error,
}: IncidentPinPickerProps) {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLocate = () => {
    setErrorMessage(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMessage(
        ur
          ? 'مقام حاصل نہیں ہو سکا۔ براہِ کرم دوبارہ کوشش کریں۔'
          : 'Unable to get your location. Please try again.'
      );
      return;
    }

    setIsLocating(true);
    onLocatingChange?.(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        onLocatingChange?.(false);

        const lat = coords.latitude;
        const lon = coords.longitude;
        const check = verifySindhLocation(lat, lon);

        if (!check.eligible) {
          onChange(null);
          setErrorMessage(
            ur
              ? 'یہ مقام ہماری سروس کے دائرہ کار سے باہر ہے۔'
              : 'This location is outside our service area.'
          );
          return;
        }

        setErrorMessage(null);
        onChange({ latitude: lat, longitude: lon });
      },
      (geoError) => {
        setIsLocating(false);
        onLocatingChange?.(false);
        onChange(null);

        if (geoError.code === 1) {
          // GeolocationPositionError.PERMISSION_DENIED
          setErrorMessage(
            ur
              ? 'جاری رکھنے کے لیے مقام کی اجازت دیں۔'
              : 'Allow location access to continue.'
          );
        } else {
          setErrorMessage(
            ur
              ? 'مقام حاصل نہیں ہو سکا۔ براہِ کرم دوبارہ کوشش کریں۔'
              : 'Unable to get your location. Please try again.'
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClear = () => {
    onChange(null);
    setErrorMessage(null);
  };

  const isAttached = Boolean(value && !errorMessage);

  return (
    <div
      id="incidentLocation"
      data-testid="incident-pin-picker"
      className="rounded-2xl border border-[#E0DCD6] bg-[#FAF9F7] p-4 sm:p-5 space-y-3.5 text-start"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7EFF0] text-[#681822] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-[13px] font-bold text-[#141414]">
              {ur ? 'مسئلے کا مقام' : 'Issue location'}
            </h3>
            <p className="text-[11px] text-[#77716E]">
              {ur
                ? 'مسئلے کی جگہ پر موجود ہوتے ہوئے اپنا مقام منسلک کریں۔'
                : 'Attach your location while at the issue site.'}
            </p>
          </div>
        </div>

        {/* Status Confirmation Badge */}
        {isAttached && (
          <span
            data-testid="location-attached-badge"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#681822] bg-[#F7EFF0] border border-[#ECD9DC] px-2.5 py-1 rounded-full"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#681822]" />
            {ur ? 'مقام منسلک ہو گیا۔' : 'Location attached.'}
          </span>
        )}
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F2EFEA] border border-[#D9D3CC] text-[#141414] font-ui font-semibold text-xs transition shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocating ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#681822] border-t-transparent motion-reduce:animate-none" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-[#681822]" />
          )}
          <span>
            {isLocating
              ? ur
                ? 'آپ کا مقام حاصل کیا جا رہا ہے…'
                : 'Getting your location...'
              : isAttached
                ? ur
                  ? 'مقام تبدیل کریں'
                  : 'Update location'
                : ur
                  ? 'مقام شامل کریں'
                  : 'Add location'}
          </span>
        </button>

        {isAttached && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#77716E] hover:text-[#681822] hover:bg-[#F7EFF0] transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{ur ? 'مقام ہٹائیں' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Dynamic Error / Permission / Boundary Alert */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="outside-sindh-alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Form-Level Error */}
      {error && !errorMessage && (
        <p role="alert" className="text-xs font-semibold text-[#B4233E]">
          {error}
        </p>
      )}
    </div>
  );
}
