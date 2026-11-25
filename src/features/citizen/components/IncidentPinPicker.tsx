import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './incident-map.css';
import { Crosshair, MapPin, AlertTriangle } from 'lucide-react';
import { verifySindhLocation } from '../../../lib/geo/sindhEligibility';
import { useLanguage } from '../../../context/LanguageContext';

export type IncidentPin = { latitude: number; longitude: number };

/**
 * Mandatory incident location picker validated strictly against the local
 * Sindh boundary GeoJSON polygon (never bbox-only, never trusted client-side alone).
 * Never requests geolocation automatically on mount; only explicit user action triggers GPS.
 */
export function IncidentPinPicker({
  value,
  onChange,
  error,
}: {
  value: IncidentPin | null;
  onChange: (point: IncidentPin | null) => void;
  error?: string;
}) {
  const { language } = useLanguage();
  const ur = language === 'ur';
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const urRef = useRef(ur);
  urRef.current = ur;
  const [status, setStatus] = useState('');
  const [regionAlert, setRegionAlert] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState(() => (value ? String(value.latitude) : ''));
  const [manualLon, setManualLon] = useState(() => (value ? String(value.longitude) : ''));

  onChangeRef.current = onChange;

  const applyCoordinates = (lat: number, lon: number, sourceLabel: string) => {
    const check = verifySindhLocation(lat, lon);
    if (!check.eligible) {
      setRegionAlert(ur ? check.messageUrdu : check.message);
      setStatus('');
      return false;
    }
    setRegionAlert(null);
    setManualLat(lat.toFixed(6));
    setManualLon(lon.toFixed(6));
    onChangeRef.current({ latitude: lat, longitude: lon });
    setStatus(sourceLabel);
    map.current?.setView([lat, lon], Math.max(map.current.getZoom(), 12), { animate: false });
    return true;
  };

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([24.8607, 67.0011], 10);
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(instance);

    instance.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      const isUrdu = urRef.current;
      const check = verifySindhLocation(lat, lng);
      if (!check.eligible) {
        setRegionAlert(isUrdu ? check.messageUrdu : check.message);
        return;
      }
      setRegionAlert(null);
      setManualLat(lat.toFixed(6));
      setManualLon(lng.toFixed(6));
      setStatus(
        isUrdu
          ? 'مقام کی تصدیق ہو گئی۔ تبدیل کرنے کے لیے نقشے پر کسی اور جگہ ٹیپ کریں۔'
          : 'Sindh location verified. Tap another point on the map to adjust.'
      );
      onChangeRef.current({ latitude: lat, longitude: lng });
    });

    const timer = window.setTimeout(() => instance.invalidateSize(), 60);
    return () => {
      window.clearTimeout(timer);
      try {
        instance.stop();
        instance.off();
        instance.remove();
      } catch {
        // Ignore teardown race during unmount
      }
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const latLng: L.LatLngExpression = [value.latitude, value.longitude];
    if (marker.current) marker.current.setLatLng(latLng);
    else {
      marker.current = L.marker(latLng, {
        icon: L.divIcon({
          className: 'incident-pin-marker',
          html: '<span aria-hidden="true"></span>',
          iconSize: [22, 22],
        }),
      }).addTo(map.current);
    }
    map.current.panTo(latLng);
  }, [value]);

  const locate = () => {
    setRegionAlert(null);
    if (!navigator.geolocation) {
      setStatus(
        ur
          ? 'اس آلے پر GPS دستیاب نہیں ہے۔ نقشے پر مقام منتخب کریں یا نقاط درج کریں۔'
          : 'GPS is unavailable. Tap the map or enter coordinates within Sindh.'
      );
      return;
    }
    setStatus(ur ? 'مقام کی اجازت طلب کی جا رہی ہے…' : 'Requesting current location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        applyCoordinates(
          coords.latitude,
          coords.longitude,
          ur
            ? 'آپ کا موجودہ مقام سندھ میں تصدیق شدہ ہے۔'
            : 'GPS position verified inside Sindh. Confirm it matches the incident site.'
        );
      },
      () =>
        setStatus(
          ur
            ? 'مقام کی اجازت دستیاب نہیں تھی۔ براہِ کرم نقشے پر واقعے کا مقام منتخب کریں۔'
            : 'Location permission was unavailable. Tap the incident location on the map.'
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };

  const applyManualCoordinates = () => {
    const lat = Number(manualLat.trim());
    const lon = Number(manualLon.trim());
    if (!manualLat.trim() || !manualLon.trim()) {
      const check = verifySindhLocation(undefined, undefined);
      setRegionAlert(ur ? check.messageUrdu : check.message);
      return;
    }
    applyCoordinates(
      lat,
      lon,
      ur
        ? 'درج کردہ جغرافیائی نقاط سندھ کے اندر تصدیق شدہ ہیں۔'
        : 'Coordinates verified inside Sindh.'
    );
  };

  return (
    <div className="incident-pin-picker" id="incidentLocation" data-testid="incident-pin-picker">
      <div className="incident-picker-heading">
        <MapPin size={17} />
        <div>
          <strong>
            {ur
              ? 'نقشے پر واقعے کا مقام منتخب کریں (لازمی) *'
              : 'Mark the incident location on the map (required) *'}
          </strong>
          <p>
            {ur
              ? 'آوازِ عوام فی الحال صرف سندھ کے اندر شکایات قبول کرتا ہے۔ نقشے پر ٹیپ کریں، GPS استعمال کریں، یا نقاط درج کریں۔'
              : 'Service is restricted to Sindh. Tap the incident spot on the map, use GPS, or verify coordinates.'}
          </p>
        </div>
      </div>

      <div
        ref={container}
        className="incident-picker-map"
        aria-label={ur ? 'سندھ واقعے کا انٹرایکٹو نقشہ' : 'Interactive Sindh incident location map'}
      />

      <div className="incident-picker-actions">
        <button type="button" onClick={locate}>
          <Crosshair size={16} /> {ur ? 'میرا موجودہ مقام استعمال کریں' : 'Use my location'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setManualLat('');
              setManualLon('');
              setStatus(
                ur
                  ? 'مقام ہٹا دیا گیا۔ جمع کرانے کے لیے نیا مقام منتخب کرنا لازمی ہے۔'
                  : 'Pin cleared. Select an eligible Sindh location to continue.'
              );
            }}
          >
            {ur ? 'مقام ہٹائیں' : 'Clear location'}
          </button>
        )}
      </div>

      {/* Keyboard-accessible coordinate verification fallback */}
      <details className="mt-2 rounded-lg border border-[#E0DCD6] bg-[#FAF9F7] px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold text-[#171717]">
          {ur ? 'کی بورڈ سے نقاط (Latitude / Longitude) درج کریں' : 'Enter latitude / longitude manually'}
        </summary>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end" dir="ltr">
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
              className="mt-1 w-full rounded-md border border-[#D4CEC6] bg-white px-2.5 py-2 text-xs text-[#171717]"
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
              className="mt-1 w-full rounded-md border border-[#D4CEC6] bg-white px-2.5 py-2 text-xs text-[#171717]"
            />
          </div>
          <button
            type="button"
            onClick={applyManualCoordinates}
            className="min-h-[38px] rounded-md bg-[#171717] px-3 py-2 text-xs font-semibold text-white hover:bg-[#323232] cursor-pointer"
          >
            {ur ? 'مقام کی تصدیق کریں' : 'Verify location'}
          </button>
        </div>
      </details>

      {regionAlert && (
        <div
          role="alert"
          data-testid="outside-sindh-alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-[#B4233E]/30 bg-[#FEF2F2] px-3 py-2.5 text-xs font-medium text-[#8D1B30]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{regionAlert}</span>
        </div>
      )}

      {error && !regionAlert && (
        <p role="alert" className="mt-2 text-xs font-semibold text-[#B4233E]">
          {error}
        </p>
      )}

      {value && !regionAlert && (
        <p className="incident-pin-confirmed">
          {ur
            ? `واقعے کا مقام سندھ میں محفوظ ہو گیا (${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)})؛ درست مقام صرف مجاز عملے کو نظر آتا ہے۔`
            : `Sindh incident location verified (${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}); exact coordinates remain visible only to authorized staff.`}
        </p>
      )}

      <p className="incident-picker-status" aria-live="polite">
        {status ||
          (ur
            ? 'سندھ کے اندر واقعے کا مقام منتخب کرنا ضروری ہے۔'
            : 'Selecting an incident location within Sindh is required before submission.')}
      </p>
    </div>
  );
}
