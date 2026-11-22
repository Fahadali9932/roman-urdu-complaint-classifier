import { useEffect, useState } from 'react';
import { Camera, MapPin, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';

/** Exact incident evidence is fetched only with an authorized authenticated staff session. */
export function ComplaintEvidencePanel({ complaintId }: { complaintId: string }) {
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    let active = true;
    const load = async () => {
      const client = supabase!;
      const [geo, evidence] = await Promise.all([
        client.from('complaint_geo_points').select('latitude,longitude').eq('complaint_id', complaintId).maybeSingle(),
        client.from('complaint_evidence').select('storage_path').eq('complaint_id', complaintId).maybeSingle(),
      ]);
      if (!active) return;
      if (geo.error || evidence.error) { setLoadError('Evidence is unavailable or you do not have permission to view it.'); return; }
      if (geo.data) setPoint({ latitude: Number(geo.data.latitude), longitude: Number(geo.data.longitude) });
      if (evidence.data?.storage_path) {
        const { data: signed, error } = await client.storage.from('complaint-evidence-private')
          .createSignedUrl(evidence.data.storage_path, 600);
        if (active) {
          if (error) setLoadError('The attached photo is temporarily unavailable.');
          else setPhotoUrl(signed.signedUrl);
        }
      }
    };
    void load().catch(() => { if (active) setLoadError('Evidence could not be loaded.'); });
    return () => { active = false; };
  }, [complaintId]);

  if (!isSupabaseConfigured()) return null;
  return (
    <section className="reading-card" aria-label="Incident evidence" style={{ marginTop: '18px' }}>
      <h3 style={{ display:'flex', alignItems:'center', gap:'8px' }}><ShieldCheck size={18}/> Incident evidence (restricted)</h3>
      {loadError && <p role="alert" style={{ color:'#a23430' }}>{loadError}</p>}
      {!loadError && !point && !photoUrl && <p>No citizen-confirmed pin or photograph is attached to this report.</p>}
      {point && (
        <div style={{ marginTop:'12px' }}>
          <p style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px' }}><MapPin size={17}/> Citizen-confirmed incident location</p>
          <p>{point.latitude.toFixed(5)}° N, {point.longitude.toFixed(5)}° E</p>
          <a href={`https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`}
            target="_blank" rel="noopener noreferrer" style={{ color:'var(--brand)', fontWeight:700, textDecoration:'underline' }}>
            Open incident location on map (external site)
          </a>
        </div>
      )}
      {photoUrl && (
        <div style={{ marginTop:'16px' }}>
          <p style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'10px' }}><Camera size={17}/> Citizen-provided photo</p>
          <img alt="Citizen-provided photograph of the reported public issue" src={photoUrl} loading="lazy"
            style={{ width:'100%', maxWidth:'580px', maxHeight:'430px', objectFit:'contain', borderRadius:'12px', border:'1px solid #ded9d3' }} />
          <p style={{ marginTop:'8px', fontSize:'12px' }}>Private signed image link expires automatically after 10 minutes.</p>
        </div>
      )}
    </section>
  );
}
