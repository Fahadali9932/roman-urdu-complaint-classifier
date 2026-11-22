import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './incident-map.css';
import { Crosshair, MapPin } from 'lucide-react';

export type IncidentPin = { latitude: number; longitude: number };

const IN_KARACHI = (lat: number, lon: number) =>
  lat >= 24.45 && lat <= 25.65 && lon >= 66.25 && lon <= 67.85;

/** This picker never requests location on mount; only explicit button clicks trigger GPS. */
export function IncidentPinPicker({ value, onChange }: {
  value: IncidentPin | null;
  onChange: (point: IncidentPin | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState('');
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: true })
      .setView([24.8607, 67.0011], 11);
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
    }).addTo(instance);
    instance.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      if (!IN_KARACHI(lat, lng)) {
        setStatus('Choose an incident location within Karachi.');
        return;
      }
      setStatus('Pin confirmed. You can move it by tapping another point.');
      onChangeRef.current({ latitude: lat, longitude: lng });
    });
    const timer = window.setTimeout(() => instance.invalidateSize(), 60);
    return () => { window.clearTimeout(timer); instance.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (!value) { marker.current?.remove(); marker.current = null; return; }
    const latLng: L.LatLngExpression = [value.latitude, value.longitude];
    if (marker.current) marker.current.setLatLng(latLng);
    else marker.current = L.marker(latLng, {
      icon: L.divIcon({
        className: 'incident-pin-marker', html: '<span aria-hidden="true"></span>', iconSize: [22, 22],
      }),
    }).addTo(map.current);
    map.current.panTo(latLng);
  }, [value]);

  const locate = () => {
    if (!navigator.geolocation) { setStatus('GPS is unavailable. Tap a point on the map instead.'); return; }
    setStatus('Asking for location permission…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!IN_KARACHI(coords.latitude, coords.longitude)) {
          setStatus('Your current location is outside Karachi. Tap the incident location on the map.');
          return;
        }
        onChange({ latitude: coords.latitude, longitude: coords.longitude });
        map.current?.setView([coords.latitude, coords.longitude], 15);
        setStatus('GPS position selected. Confirm it matches the incident location.');
      },
      () => setStatus('Location permission was unavailable. Tap the incident location on the map.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <div className="incident-pin-picker">
      <div className="incident-picker-heading"><MapPin size={17}/>
        <div><strong>Mark the incident on the map (optional)</strong>
          <p>Use your current location only if you are at the issue. Otherwise tap the correct spot.</p></div>
      </div>
      <div ref={container} className="incident-picker-map" aria-label="Interactive Karachi incident location map" />
      <div className="incident-picker-actions">
        <button type="button" onClick={locate}><Crosshair size={16}/> Use my location</button>
        {value && <button type="button" onClick={() => { onChange(null); setStatus('Pin removed.'); }}>Remove pin</button>}
      </div>
      {value && <p className="incident-pin-confirmed">Incident pin selected; exact position is visible only to authorized complaint staff.</p>}
      <p className="incident-picker-status" aria-live="polite">{status || 'Location is optional. You can submit without a GPS pin.'}</p>
    </div>
  );
}
