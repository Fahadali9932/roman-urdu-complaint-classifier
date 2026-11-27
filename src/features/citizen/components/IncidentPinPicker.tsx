import { useState } from 'react';
import { Crosshair, MapPin, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import { verifySindhLocation } from '../../../lib/geo/sindhEligibility';
import { useLanguage } from '../../../context/LanguageContext';

export type IncidentPin = { latitude: number; longitude: number };

export interface IncidentPinPickerProps {
  value: IncidentPin | null;
  onChange: (point: IncidentPin | null) => void;
  error?: string;
}

/**
 * Clean, mapless incident location attachment flow.
 * - No heavy map canvas or third-party tile dependencies.
 * - One-click browser geolocation with silent Sindh verification.
 * - Restrained, human confirmation (zero raw green coordinates).
 * - Accessible fallback for keyboard entry / automated integration tests.
 */
export function IncidentPinPicker({
  value,
  onChange,
  error,
}: IncidentPinPickerProps) {
  const { language } = useLanguage();
  const ur = language === 'ur';

  const [isLocating, setIsLocating] = useState(false);
  const [regionAlert, setRegionAlert] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState(() => (value ? String(value.latitude) : ''));
  const [manualLon, setManualLon] = useState(() => (value ? String(value.longitude) : ''));
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleApplyCoordinates = (lat: number, lon: number) => {
    const check = verifySindhLocation(lat, lon);
    setManualLat(lat.toFixed(6));
    setManualLon(lon.toFixed(6));
    onChange({ latitude: lat, longitude: lon });

    if (!check.eligible) {
      setRegionAlert(ur ? check.messageUrdu : check.message);
      setStatusMessage('');
      return false;
    }
    setRegionAlert(null);
    setStatusMessage('');
    return true;
  };

  const handleLocate = () => {
    setRegionAlert(null);
    if (!navigator.geolocation) {
      setStatusMessage(
        ur
          ? 'اس ڈیوائس پر لوکیشن دستیاب نہیں ہے۔ نیچے علاقہ اور نشانی درج کریں۔'
          : 'Location access is unavailable. Please enter the area and landmark below.'
      );
      return;
    }

    setIsLocating(true);
    setStatusMessage(ur ? 'مقام کی تصدیق کی جا رہی ہے…' : 'Locating issue site…');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        const verified = handleApplyCoordinates(coords.latitude, coords.longitude);
        if (verified) {
          setStatusMessage('');
        }
      },
      () => {
        setIsLocating(false);
        setStatusMessage(
          ur
            ? 'مقام کی اجازت نہیں ملی۔ نیچے دیا گیا فارم پُر کریں۔'
            : 'Location access was not granted. Please enter the area and landmark below.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualVerify = () => {
    const lat = Number(manualLat.trim());
    const lon = Number(manualLon.trim());
    if (!manualLat.trim() || !manualLon.trim() || isNaN(lat) || isNaN(lon)) {
      const check = verifySindhLocation(undefined, undefined);
      setRegionAlert(ur ? check.messageUrdu : check.message);
      return;
    }
    handleApplyCoordinates(lat, lon);
  };

  const handleClear = () => {
    onChange(null);
    setManualLat('');
    setManualLon('');
    setRegionAlert(null);
    setStatusMessage('');
  };

  const isAttached = Boolean(value && !regionAlert);

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
              {ur ? 'مسئلے کا درست مقام' : 'Precise issue location'}
            </h3>
            <p className="text-[11px] text-[#77716E]">
              {ur
                ? 'فیلڈ انسپکشن کے لیے اپنے موجودہ مقام کی تصدیق کریں۔'
                : 'Confirm device location to help field officers reach the spot.'}
            </p>
          </div>
        </div>

        {/* Status Confirmation Badge */}
        {isAttached && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#126B53] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#126B53]" />
            {ur ? 'مقام شامل ہو گیا' : 'Location attached successfully'}
          </span>
        )}
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F2EFEA] border border-[#D9D3CC] text-[#141414] font-ui font-semibold text-xs transition shadow-2xs active:scale-[0.99] cursor-pointer"
        >
          {isLocating ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#681822] border-t-transparent motion-reduce:animate-none" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-[#681822]" />
          )}
          <span>
            {isLocating
              ? ur
                ? 'مقام دیکھا جا رہا ہے…'
                : 'Checking location…'
              : isAttached
                ? ur
                  ? 'مقام تبدیل کریں'
                  : 'Update current location'
                : ur
                  ? 'موجودہ مقام استعمال کریں'
                  : 'Use current issue location'}
          </span>
        </button>

        {isAttached && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#77716E] hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{ur ? 'مقام ہٹائیں' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Informative status or permission guidance */}
      {statusMessage && (
        <p className="text-xs text-[#625D58] leading-relaxed" aria-live="polite">
          {statusMessage}
        </p>
      )}

      {/* Geographic Boundary Alert */}
      {regionAlert && (
        <div
          role="alert"
          data-testid="outside-sindh-alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{regionAlert}</span>
        </div>
      )}

      {/* Form Error */}
      {error && !regionAlert && (
        <p role="alert" className="text-xs font-semibold text-[#B4233E]">
          {error}
        </p>
      )}

      {/* Keyboard-Accessible Coordinate Verification Fallback (Accessible & Automated Tests) */}
      <details className="pt-1 text-[11px] text-[#77716E]">
        <summary className="cursor-pointer font-medium hover:text-[#141414] select-none">
          {ur ? 'کی بورڈ سے نقاط درج کریں (اختیاری)' : 'Manual coordinates fallback (optional)'}
        </summary>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end p-3 rounded-xl bg-white border border-[#E8E5E1]" dir="ltr">
          <div>
            <label htmlFor="incident-lat-input" className="block text-[11px] font-medium text-[#55524D]">
              Latitude
            </label>
            <input
              id="incident-lat-input"
              type="number"
              step="any"
              placeholder="24.8607"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D4CEC6] bg-[#FAF9F7] px-2.5 py-1.5 text-xs text-[#171717] outline-none focus:bg-white focus:border-[#141414]"
            />
          </div>
          <div>
            <label htmlFor="incident-lon-input" className="block text-[11px] font-medium text-[#55524D]">
              Longitude
            </label>
            <input
              id="incident-lon-input"
              type="number"
              step="any"
              placeholder="67.0011"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#D4CEC6] bg-[#FAF9F7] px-2.5 py-1.5 text-xs text-[#171717] outline-none focus:bg-white focus:border-[#141414]"
            />
          </div>
          <button
            type="button"
            onClick={handleManualVerify}
            className="min-h-[34px] rounded-lg bg-[#141414] hover:bg-[#323232] px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
          >
            {ur ? 'مقام کی تصدیق کریں' : 'Verify location'}
          </button>
        </div>
      </details>
    </div>
  );
}
