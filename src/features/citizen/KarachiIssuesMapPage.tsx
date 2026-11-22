import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Info, MapPinned, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import './components/incident-map.css';

interface PublicCell { lat: number; lon: number; report_count: number }

const categories = [
  { value: '', label: 'All services' },
  { value: 'kmc', label: 'Roads & infrastructure' },
  { value: 'kwsc', label: 'Water & sewerage' },
  { value: 'kelectric', label: 'Electricity' },
  { value: 'ssgc', label: 'Gas' },
  { value: 'sswmb', label: 'Solid waste' },
  { value: 'sbca', label: 'Buildings' },
];

export function KarachiIssuesMapPage() {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const [category, setCategory] = useState('');
  const [days, setDays] = useState(90);
  const [cells, setCells] = useState<PublicCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!element.current || map.current) return;
    const instance = L.map(element.current, { scrollWheelZoom: false })
      .setView([24.91, 67.04], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
    }).addTo(instance);
    const layer = L.layerGroup().addTo(instance);
    markers.current = layer;
    map.current = instance;
    const sizeTimer = window.setTimeout(() => instance.invalidateSize(), 100);
    return () => { window.clearTimeout(sizeTimer); instance.remove(); map.current = null; markers.current = null; };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setCells([]);
      setError('Live map data is unavailable until the civic database is connected.');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.resolve(supabase.rpc('public_karachi_issue_cells', { p_department: category || null, p_days: days }))
      .then(({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError) { setCells([]); setError('The map could not load right now. Please try again.'); }
        else setCells((Array.isArray(data) ? data : []).map((point) => ({
          lat: Number(point.lat), lon: Number(point.lon), report_count: Number(point.report_count),
        })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && point.report_count >= 8));
      })
      .catch(() => { if (active) { setCells([]); setError('Map connection failed. Try again later.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, days, retry]);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    for (const cell of cells) {
      L.marker([cell.lat, cell.lon], {
        icon: L.divIcon({
          className: 'civic-cluster-icon',
          html: `<span aria-hidden="true">${cell.report_count.toLocaleString('en-PK')}</span>`,
          iconSize: [62, 62], iconAnchor: [31, 31],
        }),
        keyboard: true,
        title: `${cell.report_count} complaints in this approximate area`,
      }).bindPopup(`${cell.report_count} active reports in this approximate area. Exact locations are private.`).addTo(layer);
    }
  }, [cells]);

  return (
    <main className="civic-issue-map-page">
      <div className="civic-issue-map-shell">
        <Link to="/track" className="civic-map-back"><ArrowLeft size={17}/> Back to complaint tracking</Link>
        <div className="civic-map-heading">
          <div><p className="civic-map-overline">AWAAZ-E-AWAM / KARACHI</p>
            <h1>Where the city needs attention.</h1>
            <p>Explore active public-service complaints by area. Numbers represent reports in broad map zones, never individual addresses.</p>
          </div>
          <MapPinned className="civic-map-heading-icon" size={43} aria-hidden="true" />
        </div>
        <div className="civic-map-toolbar">
          <label htmlFor="map-category">Service
            <select id="map-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label htmlFor="map-period">Reported in
            <select id="map-period" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last year</option>
            </select>
          </label>
          <button type="button" onClick={() => setRetry((n) => n + 1)} aria-label="Refresh map"><RefreshCw size={16}/> Refresh</button>
        </div>
        <div className="civic-map-stage">
          <div ref={element} className="civic-public-map" aria-label="Karachi public complaint density map" />
          <div className="civic-map-info" role="status" aria-live="polite">
            {loading ? 'Loading verified reports…' : error ? error : cells.length === 0
              ? 'No areas meet the public privacy threshold for these filters yet.'
              : `${cells.length} broad area${cells.length === 1 ? '' : 's'} shown. Dark circles count verified submitted complaints.`}
          </div>
        </div>
        <p className="civic-map-privacy"><Info size={16}/>
          Only areas with at least eight confirmed, geolocated complaints appear. Pins indicate approximate zones, not street addresses. Older reports without a confirmed pin are not plotted. Map tiles © OpenStreetMap contributors.
        </p>
      </div>
    </main>
  );
}
