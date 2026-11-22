import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, RefreshCw, ShieldAlert } from 'lucide-react';
import { fieldOperations, type CitizenWorkProof } from '../../features/department/services/fieldOperations';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

/** Private, owner-only proof panel. Never loads from the anonymous public map. */
export const CitizenProofPanel: React.FC<{ complaintId: string }> = ({ complaintId }) => {
  const [proofs,setProofs] = useState<CitizenWorkProof[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState<string|null>(null);
  const [signedIn,setSignedIn] = useState(false);

  useEffect(()=>{
    let active=true;
    if (!isSupabaseConfigured() || !supabase) return;
    void (async()=>{
      const auth=await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(Boolean(auth.data.user));
      if (!auth.data.user) return;
      setLoading(true);
      try {const rows=await fieldOperations.citizenProofs(complaintId); if(active)setProofs(rows);}
      catch (err) {if(active)setError(err instanceof Error?err.message:'Work evidence is unavailable.');}
      finally{if(active)setLoading(false);}
    })();
    return ()=>{active=false};
  },[complaintId]);

  const submit=async (orderId:string,decision:'confirmed'|'disputed')=>{
    setError('');setBusy(orderId);
    try{
      await fieldOperations.citizenReview(orderId,complaintId,decision,notes[orderId]||'');
      setProofs(prev=>prev.map(p=>p.order_id===orderId?{
        ...p,feedback:decision,can_respond:false,
        order_status:decision==='disputed'?'returned':p.order_status,
      }:p));
    }catch(err){setError(err instanceof Error?err.message:'Feedback could not be sent.');}
    finally{setBusy(null);}
  };

  if (!signedIn || !isSupabaseConfigured()) return null;
  return <section className="space-y-3 pt-4" aria-label="Verified department work evidence">
    <h3 className="flex gap-2 items-center text-sm sm:text-base font-black text-[#681822]"><FileCheck2 size={17}/> Department work evidence</h3>
    {loading&&<div className="text-xs text-[#625D58]">Checking secure work records…</div>}
    {error&&<p className="text-xs p-3 bg-red-50 text-red-700 rounded-xl" role="alert">{error}</p>}
    {!loading&&!error&&proofs.length===0&&<p className="text-xs text-[#625D58] rounded-xl border border-[#E5E3E0] p-4">No department-approved work photos have been shared for this complaint yet.</p>}
    {proofs.map(proof=><article key={proof.order_id} className="rounded-2xl border border-[#E5E3E0] p-4 bg-[#FAF9F7] space-y-3">
      <div className="flex items-center justify-between gap-2"><span className="inline-flex gap-1.5 items-center text-xs font-bold text-emerald-700"><CheckCircle2 size={16}/> Department-reviewed evidence</span><small className="text-[11px] text-[#625D58]">{proof.department_id.toUpperCase()}</small></div>
      {proof.order_status==='returned'&&<p className="rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900" role="status">This repair was returned for further work. The department must submit and review fresh evidence.</p>}
      {proof.order_status==='verified'&&proof.response_expires_at&&<p className="text-xs text-[#625D58]">Review period ends {new Intl.DateTimeFormat('en-PK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Karachi'}).format(new Date(proof.response_expires_at))} (Pakistan time).</p>}
      {proof.signed_url?<img className="max-w-full max-h-64 w-full object-contain rounded-lg bg-[#E5E3E0]" src={proof.signed_url} alt="Private photo of work submitted and approved by department staff" loading="lazy"/>:<div className="text-xs text-[#625D58] p-3 rounded-lg bg-white">This private photo could not be loaded. Please sign in again to refresh access.</div>}
      <div className="flex gap-2 items-start text-xs text-[#625D58]"><ShieldAlert size={15} className="shrink-0"/><span>Department review checks the image and GPS proximity. This does not scientifically prove that an image was camera-original or free of AI manipulation.</span></div>
      {proof.feedback?<div className="text-xs font-semibold text-[#141414] p-3 bg-white rounded-lg">You marked this work as {proof.feedback}. Your feedback has been recorded.</div>:proof.can_respond?<>
        <label htmlFor={`citizen-work-note-${proof.order_id}`} className="block text-xs font-bold text-[#141414]">Your feedback (required if reporting a problem)</label>
        <textarea id={`citizen-work-note-${proof.order_id}`} className="w-full p-3 border border-[#D9D3CC] rounded-lg text-xs" rows={2} maxLength={1000} value={notes[proof.order_id]||''} onChange={e=>setNotes(prev=>({...prev,[proof.order_id]:e.target.value}))} placeholder="Tell us if the issue still needs work."/>
        <div className="flex gap-2 flex-wrap"><button className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-xs font-bold" type="button" disabled={busy===proof.order_id} onClick={()=>void submit(proof.order_id,'confirmed')}><CheckCircle2 size={13} className="inline mr-1"/>Work looks complete</button><button className="rounded-lg bg-white border border-[#681822] text-[#681822] px-4 py-2 text-xs font-bold" type="button" disabled={busy===proof.order_id||(notes[proof.order_id]||'').trim().length<10} onClick={()=>void submit(proof.order_id,'disputed')}><RefreshCw size={13} className="inline mr-1"/>Issue remains</button></div>
      </>:<p className="rounded-lg bg-white p-3 text-xs text-[#625D58]">Feedback is unavailable for this evidence. It may be under rework, already closed, or past the 72-hour response window. You may submit a new complaint if the issue remains unresolved.</p>}
    </article>)}
  </section>;
};
