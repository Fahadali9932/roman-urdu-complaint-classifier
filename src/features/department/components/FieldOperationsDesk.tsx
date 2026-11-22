import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Camera, Check, ChevronRight, Clock3, FileCheck2, MapPin, RefreshCw, Search, ShieldAlert, Star, Users, X } from 'lucide-react';
import { caseOperationsService } from '../../../services/CaseOperationsService';
import type { IncidentCaseSummary, WorkQueueFilter } from '../../../types/case-operations';
import { fieldOperations, officerRating, workDeadline, type DepartmentOfficer, type DepartmentProof, type DepartmentWorkOrder, type StaffPosition } from '../services/fieldOperations';
import { supabase } from '../../../lib/supabase';
import '../field-operations-v18.css';

interface Props { departmentId: string; userId: string; role: StaffPosition; view: 'dispatch' | 'field' | 'team' | 'verification' | 'field_archive'; }

const formatPKT = (value: string) => new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const dueInputDefault = () => {
  const date = new Date(Date.now() + 3 * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T17:00`;
};
const filter: WorkQueueFilter = { savedView:'all', displayMode:'cases', searchQuery:'',area:'All areas',issueType:'All issues',sort:'attention',page:0,pageSize:100 };

export const FieldOperationsDesk: React.FC<Props> = ({ departmentId, userId, role, view }) => {
  const [orders, setOrders] = useState<DepartmentWorkOrder[]>([]);
  const [team, setTeam] = useState<DepartmentOfficer[]>([]);
  const [cases, setCases] = useState<IncidentCaseSummary[]>([]);
  const [selected, setSelected] = useState<IncidentCaseSummary | null>(null);
  const [officer, setOfficer] = useState('');
  const [deadline, setDeadline] = useState(dueInputDefault);
  const [instructions, setInstructions] = useState('Inspect, repair and upload a clear photo from the issue location.');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ success: boolean; text:string } | null>(null);
  const [reviewing, setReviewing] = useState<{ order: DepartmentWorkOrder; proof: DepartmentProof; image?: string } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [extensionFor, setExtensionFor] = useState<string | null>(null);
  const [extensionDate, setExtensionDate] = useState(dueInputDefault);
  const [extensionReason, setExtensionReason] = useState('');
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [work, roster, casePage] = await Promise.all([
        fieldOperations.orders(departmentId),
        role === 'head' ? fieldOperations.team(departmentId) : Promise.resolve([]),
        role === 'head' ? caseOperationsService.listDepartmentCases(departmentId as never, filter) : Promise.resolve({ items: [] }),
      ]);
      setOrders(work); setTeam(roster); setCases(casePage.items);
      setMessage(null);
    } catch (error) { setMessage({success:false,text:error instanceof Error ? error.message : 'Unable to load field operations.'}); }
    finally { setLoading(false); }
  }, [departmentId, role]);
  useEffect(() => { void reload(); }, [reload]);

  const myOrders = role === 'head' ? orders : orders.filter((order) => order.officer_id === userId);
  const active = myOrders.filter((o) => o.status !== 'verified');
  const verified = myOrders.filter((o) => o.status === 'verified');
  const overdue = active.filter((o) => workDeadline(o) === 'overdue');
  const pending = orders.filter((o) => o.status === 'pending_review');
  const assignedKeys = new Set(orders.map((o) => o.anchor_complaint_id));
  const candidates = useMemo(() => cases.filter((c) => `${c.title} ${c.locality} ${c.caseNumber}`.toLowerCase().includes(search.toLowerCase())), [cases,search]);
  const isHead = role === 'head';
  const heading = view === 'team' ? 'The people behind the work.' : view === 'verification' ? 'Proof before closure.' : view === 'field_archive' ? 'The record of work completed.' : isHead ? 'A clearer way to move Karachi forward.' : 'Your work, clearly laid out.';
  const actionable = view === 'verification' ? pending : view === 'field_archive' ? verified : active;

  async function execute(action:()=>Promise<unknown>, success:string) {
    setBusy(true); setMessage(null);
    try { await action(); setMessage({ success:true,text:success }); await reload(); setMessage({success:true,text:success}); }
    catch(err) { setMessage({success:false,text:err instanceof Error ? err.message : 'The action could not be completed.'}); }
    finally { setBusy(false); }
  }

  async function assignCase(event:React.FormEvent) {
    event.preventDefault(); if (!selected || !officer) return;
    await execute(async () => {
      const reports = await caseOperationsService.listCaseReports(selected.id, '', 0, 100);
      if (!reports.items.length || reports.total > 100) throw new Error('This case has no eligible linked complaints or exceeds 100 reports. Review the case before assigning.');
      const reportIds = reports.items.map((r) => r.complaintId);
      await fieldOperations.assign({ departmentId, anchorComplaintId:reportIds[0], reportIds, caseLabel:selected.title.slice(0,80),officerId:officer,dueAt:new Date(deadline).toISOString(),instructions });
      setSelected(null);
    },'The work order has been assigned to the officer.');
  }

  async function showProof(order:DepartmentWorkOrder) {
    setBusy(true);
    try {
      const proof = await fieldOperations.proof(order.id);
      if (!proof) throw new Error('No evidence was found for this work order.');
      const signed = await supabase?.storage.from('department-work-proof-private').createSignedUrl(proof.storage_path, 300);
      setReviewNote(''); setReviewing({order,proof,image:signed?.data?.signedUrl});
    } catch(err) { setMessage({success:false,text:err instanceof Error ? err.message : 'Unable to load proof.'}); }
    finally { setBusy(false); }
  }

  function getPosition() {
    setLocationError(''); setLocation(null);
    if (!navigator.geolocation) { setLocationError('Location is unavailable on this device.'); return; }
    navigator.geolocation.getCurrentPosition((p) => setLocation(p.coords), (err) => setLocationError(err.message || 'Location permission denied.'), { enableHighAccuracy:true,timeout:20000,maximumAge:0 });
  }

  return <section className="field-desk" aria-label="Verified field operations">
    <div className="field-intro"><div><p className="field-kicker">AWAAZ-E-AWAM <span>/</span> {isHead?'OPERATIONS LEAD':'FIELD SERVICE'} <span>/</span> {view.toUpperCase().replace('_',' ')}</p><h1>{heading}</h1><p className="field-intro-copy">{isHead?'Assign responsibility. Set a deadline. Verify the result before citizens see it.':'Keep every assignment, deadline and proof of work in one place.'}</p></div><button className="field-refresh" onClick={()=>void reload()} disabled={loading} type="button"><RefreshCw size={15}/> Refresh</button></div>
    {message && <div className={`field-feedback ${message.success?'good':'bad'}`} role="status">{message.text}<button aria-label="Dismiss message" type="button" onClick={()=>setMessage(null)}><X size={16}/></button></div>}
    <div className="field-metrics"><div><span>01 / OPEN WORK</span><strong>{active.length}</strong><small>{isHead?'Across this department':'Assigned to you'}</small></div><div><span>02 / PAST DEADLINE</span><strong className={overdue.length?'critical':''}>{overdue.length}</strong><small>Needs immediate attention</small></div><div><span>03 / AWAITING REVIEW</span><strong>{pending.length}</strong><small>Submitted photos and location</small></div><div><span>04 / VERIFIED</span><strong>{verified.length}</strong><small>Approved by a department head</small></div></div>
    {loading ? <div className="field-empty">Loading department operations…</div> : <>
      {view === 'team' && isHead ? <div className="field-panel"><div className="field-panel-heading"><h2>Officer roster</h2><p>Performance is based on verified cases, completion time and citizen disputes—not raw complaint volume.</p></div><div className="field-roster">{team.filter(o=>o.staff_role==='officer').map((o)=><div key={o.user_id} className="field-person"><div className="field-avatar">{o.display_name.slice(0,1).toUpperCase()}</div><div className="field-person-name"><strong>{o.display_name}</strong><small>{o.active_cases} open · {o.overdue_cases} overdue · {o.verified_cases} verified</small></div><div className="field-rating"><Star size={16} fill={officerRating(o)?'currentColor':'none'}/><strong>{officerRating(o)?.toFixed(1) || 'New'}</strong><small>{officerRating(o)?'Performance':'Awaiting 5 cases'}</small></div></div>)}</div>{!team.some(o=>o.staff_role==='officer')&&<p className="field-empty">No approved officers. The central administrator must invite officers first.</p>}</div> : null}
      {view === 'dispatch' && isHead && <div className="field-columns"><div className="field-panel"><div className="field-panel-heading"><div><p className="field-label">INCOMING CASES</p><h2>Ready for assignment</h2></div><div className="field-search"><Search size={15}/><input aria-label="Search cases" placeholder="Find a case or area" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="field-cases">{candidates.slice(0,35).map(c=><button type="button" key={c.id} onClick={()=>{setSelected(c);setOfficer('');}} className={`field-case ${selected?.id===c.id?'selected':''}`}><span className="field-case-index">{c.caseNumber}</span><span className="field-case-main"><strong>{c.title}</strong><small><MapPin size={12}/>{c.locality} · {c.linkedReportCount} citizen reports</small></span>{c.priority==='critical'&&<span className="field-urgent">URGENT</span>}{assignedKeys.has(c.id)&&<span className="field-pending-tag">CHECK ACTIVE</span>}<ChevronRight size={17}/></button>)}</div>{!cases.length&&<p className="field-empty">No cases are available for assignment. Live complaints appear after department routing.</p>}</div><div className="field-panel field-assign"><div className="field-panel-heading"><p className="field-label">NEW ASSIGNMENT</p><h2>{selected?'Assign this case':'Select a case'}</h2></div>{selected?<form onSubmit={e=>void assignCase(e)} className="field-form"><div className="field-selected"><strong>{selected.title}</strong><small>{selected.publicPlace} · {selected.locality}</small></div><label htmlFor="field-officer">Responsible officer</label><select id="field-officer" value={officer} onChange={e=>setOfficer(e.target.value)} required><option value="">Choose approved officer</option>{team.filter(o=>o.staff_role==='officer').map(o=><option key={o.user_id} value={o.user_id}>{o.display_name} — {o.active_cases} active</option>)}</select><label htmlFor="field-due">Work deadline</label><input id="field-due" type="datetime-local" required value={deadline} min={new Date().toISOString().slice(0,16)} onChange={e=>setDeadline(e.target.value)}/><label htmlFor="field-instructions">Instructions to officer</label><textarea id="field-instructions" rows={4} minLength={8} maxLength={1200} value={instructions} onChange={e=>setInstructions(e.target.value)}/><button className="field-primary" type="submit" disabled={busy||!officer}>Assign with deadline <ArrowRight size={16}/></button><p className="field-hint">Assignments are logged and cannot close without reviewed proof.</p></form>:<div className="field-empty field-onboard"><Users size={29}/><p>Choose an incoming case on the left, then assign one officer and a clear deadline.</p></div>}</div></div>}
      {(view==='field'||view==='dispatch'||view==='verification'||view==='field_archive') && <div className="field-panel field-order-section"><div className="field-panel-heading"><div><p className="field-label">{view==='verification'?'EVIDENCE INBOX':view==='field_archive'?'COMPLETED / ARCHIVED':'WORK IN MOTION'}</p><h2>{view==='verification'?'Awaiting a decision':view==='field_archive'?'Verified work history':isHead?'Assigned work orders':'My assigned work'}</h2></div><span className="field-count">{actionable.length} records</span></div><div className="field-orders">{actionable.map(o=>{const state=workDeadline(o);return <article className="field-order" key={o.id}><div className="field-order-body"><span className={`field-deadline ${state}`}>{state==='overdue'?'PAST DUE':state==='approaching'?'DUE SOON':o.status.replace('_',' ').toUpperCase()}</span><h3>{o.case_label}</h3><p>{o.instructions}</p><div className="field-order-meta"><span><CalendarClock size={14}/> Due {formatPKT(o.due_at)}</span><span><Clock3 size={14}/>{o.status.replace('_',' ')}</span>{isHead&&<span>Officer: {team.find(t=>t.user_id===o.officer_id)?.display_name||o.officer_id.slice(0,8)}</span>}</div>{o.extension_requested_due_at&&<p className="field-extension">Extension requested until {formatPKT(o.extension_requested_due_at)}. Reason: {o.extension_reason}</p>}</div><div className="field-order-actions">{isHead? <>{o.status==='pending_review'&&<button className="field-primary" type="button" disabled={busy} onClick={()=>void showProof(o)}><FileCheck2 size={15}/> Review evidence</button>}{o.extension_requested_due_at&&<><button type="button" disabled={busy} onClick={()=>void execute(()=>fieldOperations.decideExtension(o.id,true),'Extension approved.')}>Approve extension</button><button type="button" disabled={busy} onClick={()=>void execute(()=>fieldOperations.decideExtension(o.id,false),'Extension declined.')}>Decline</button></>}</>: <>{(o.status==='assigned'||o.status==='returned')&&<button className="field-primary" type="button" disabled={busy} onClick={()=>void execute(()=>fieldOperations.start(o.id),'Work has started.')}>Start work <ArrowRight size={15}/></button>}{o.status==='in_progress'&&<button className="field-primary" type="button" onClick={()=>{setUploadFor(o.id);setPhoto(null);setLocation(null);}}> <Camera size={15}/> Submit field proof</button>}{o.status!=='verified'&&o.status!=='pending_review'&&<button type="button" onClick={()=>setExtensionFor(o.id)}>Request extra time</button>}</>}</div></article>;})}</div>{!actionable.length&&<p className="field-empty">{view==='verification'?'No proof is waiting for approval.':view==='field_archive'?'No supervisor-verified work to archive yet.':'No active work orders in this view.'}</p>}{isHead&&view==='verification'&&<p className="field-hint field-gap"><ShieldAlert size={16}/> Location proximity and image fingerprints are warnings, not a guarantee that a photo is genuine. Review the evidence manually.</p>}</div>}
    </>}
    {view==='field_archive' && isHead && verified.length>0 && <div className="field-panel field-close-records"><div className="field-panel-heading"><p className="field-label">CITIZEN CASE CLOSURE</p><h2>Finish the record, not just the repair.</h2><p>When every assigned department has verified its work and each complaint is already in progress, close its citizen record and send the official status notification.</p></div>{verified.map(order=><div className="field-close-row" key={`close-${order.id}`}><span>{order.case_label}</span><button type="button" disabled={busy} onClick={()=>void execute(()=>fieldOperations.closeVerified(order.id),'Eligible citizen records were closed and official updates were queued.')}>Close verified reports <ArrowRight size={14}/></button></div>)}</div>}
    {reviewing&&<div className="field-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setReviewing(null)}}><section className="field-dialog" role="dialog" aria-modal="true" aria-label="Review submitted proof"><button className="field-dialog-close" type="button" onClick={()=>setReviewing(null)} aria-label="Close"><X/></button><p className="field-label">SUPERVISOR VERIFICATION</p><h2>{reviewing.order.case_label}</h2><div className="field-evidence">{reviewing.image?<img src={reviewing.image} alt="Private officer-submitted work evidence"/>:<p>Secure preview could not be retrieved. Verify storage access before approving.</p>}</div><p className="field-proof-summary">Location: <strong>{reviewing.proof.location_result.replaceAll('_',' ')}</strong> · {reviewing.proof.original_distance_m==null?'Original citizen pin not available':`${Math.round(reviewing.proof.original_distance_m)} metres from complaint pin`} · Accuracy ±{Math.round(reviewing.proof.accuracy_m)}m</p>{reviewing.proof.duplicate_warning&&<p className="field-warn">This photograph matches an earlier uploaded image.</p>}<label htmlFor="field-review-note">Decision notes {reviewing.proof.location_result!=='near'||reviewing.proof.duplicate_warning?'(mandatory for approval)':''}</label><textarea id="field-review-note" rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Explain why this work should be approved or returned."/><div className="field-dialog-actions"><button type="button" disabled={busy} onClick={()=>void execute(async()=>{await fieldOperations.review(reviewing.order.id,false,reviewNote);setReviewing(null);},'Evidence returned to the officer.')}>Return for correction</button><button className="field-primary" type="button" disabled={busy||!reviewing.image||((reviewing.proof.location_result!=='near'||reviewing.proof.duplicate_warning)&&reviewNote.trim().length<20)} onClick={()=>void execute(async()=>{await fieldOperations.review(reviewing.order.id,true,reviewNote);setReviewing(null);},'Evidence approved and available to linked citizens.')}>Approve verified work <Check size={15}/></button></div></section></div>}
    {extensionFor&&<div className="field-overlay"><form className="field-dialog" role="dialog" aria-modal="true" aria-label="Request a deadline extension" onSubmit={e=>{e.preventDefault();void execute(async()=>{await fieldOperations.requestExtension(extensionFor,new Date(extensionDate).toISOString(),extensionReason);setExtensionFor(null);},'Extension request sent to your department head.');}}><button className="field-dialog-close" type="button" onClick={()=>setExtensionFor(null)}><X/></button><p className="field-label">TIME REQUEST</p><h2>Need more time?</h2><p>Your supervisor will review the reason and new target.</p><label htmlFor="field-extension-date">Proposed new deadline</label><input type="datetime-local" id="field-extension-date" required value={extensionDate} onChange={e=>setExtensionDate(e.target.value)}/><label htmlFor="field-extension-reason">Reason for the delay</label><textarea id="field-extension-reason" required minLength={12} rows={3} value={extensionReason} onChange={e=>setExtensionReason(e.target.value)}/><button type="submit" className="field-primary" disabled={busy}>Send request <ArrowRight size={15}/></button></form></div>}
    {uploadFor&&<div className="field-overlay"><form className="field-dialog" role="dialog" aria-modal="true" aria-label="Submit work evidence" onSubmit={e=>{e.preventDefault();if(!photo||!location)return;void execute(async()=>{await fieldOperations.submitEvidence(uploadFor,photo,location);setUploadFor(null);},'Proof submitted for head review. The work is not verified yet.');}}><button className="field-dialog-close" type="button" onClick={()=>setUploadFor(null)}><X/></button><p className="field-label">ON-SITE EVIDENCE</p><h2>Show the completed work.</h2><p>Capture a real photo and share your current GPS position. Photo authenticity cannot be guaranteed automatically; your head will review the evidence.</p><label htmlFor="field-proof-photo">Photo of the repaired issue (JPEG, PNG or WebP, max 1 MB)</label><input id="field-proof-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required onChange={e=>setPhoto(e.target.files?.[0]||null)}/><button type="button" onClick={getPosition} className="field-location"><MapPin size={17}/> {location?`Location captured · ±${Math.round(location.accuracy)}m`:'Capture my location now'}</button>{locationError&&<p className="field-warn">{locationError}. Enable location permissions and use HTTPS on mobile.</p>}<p className="field-hint">Your location is compared with the citizen-reported location. GPS alone cannot prove where a photo was taken.</p><button className="field-primary" type="submit" disabled={busy||!photo||!location||photo.size>1048576}>Submit for verification <ArrowRight size={15}/></button></form></div>}
  </section>;
};
