import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import {
  staffAuthService,
  type DepartmentMembershipWithDetails,
  type AccessAuditLogRow,
} from '../../../services/staffAuthService';
import { AdminHeader } from '../components/AdminHeader';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { fieldOperations, officerRating, type DepartmentOfficer } from '../../department/services/fieldOperations';
import {
  Search,
  Building2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  UserX,
  Filter,
} from 'lucide-react';

export const AdminAccessPage: React.FC = () => {
  const { language } = useLanguage();
  const { isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  const [memberships, setMemberships] = useState<DepartmentMembershipWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('kmc');
  const [inviteRole, setInviteRole] = useState<'head' | 'officer'>('officer');
  const [mfaReady,setMfaReady] = useState(!isSupabaseConfigured());
  const [factor,setFactor] = useState('');
  const [qr,setQr] = useState('');
  const [manualKey,setManualKey] = useState('');
  const [mfaCode,setMfaCode] = useState('');
  const [workforce,setWorkforce] = useState<Array<DepartmentOfficer & { department_id:string }>>([]);
  const [workforceError,setWorkforceError] = useState('');

  // Revocation modal state (Figma 35:1154 / 35:1840)
  const [selectedTarget, setSelectedTarget] = useState<DepartmentMembershipWithDetails | null>(
    null
  );
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Searchable Audit Ledger state
  const [auditLogs, setAuditLogs] = useState<AccessAuditLogRow[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Keyboard shortcut listener (Escape key dismissal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRevokeModalOpen) setIsRevokeModalOpen(false);
        if (isSuspendModalOpen) setIsSuspendModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevokeModalOpen, isSuspendModalOpen]);

  // Guard: Redirect unauthenticated admins to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const loadAuditLogs = () => {
    try {
      const logs = staffAuthService.getAccessAuditLog();
      setAuditLogs(logs);
    } catch {
      // ignore
    }
  };

  const loadMemberships = async () => {
    setIsLoading(true);
    try {
      const data = await staffAuthService.getApprovedDepartmentMemberships();
      setMemberships(data);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Failed to load authorized department memberships.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void loadMemberships();
      loadAuditLogs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) return;
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(r=>setMfaReady(r.data?.currentLevel==='aal2'));
  }, []);

  useEffect(()=>{
    if (!isSupabaseConfigured()||!mfaReady) return;
    let canceled=false;
    const allDepartments=['kmc','kwsc','kelectric','sswmb','ssgc','sbca'];
    void Promise.all(allDepartments.map(async(department_id)=>{
      const officers=await fieldOperations.team(department_id);
      return officers.map(o=>({...o,department_id}));
    })).then(results=>{if(!canceled)setWorkforce(results.flat());}).catch(err=>{
      if(!canceled)setWorkforceError(err instanceof Error?err.message:'Workforce overview is not available.');
    });
    return ()=>{canceled=true};
  },[mfaReady]);

  const beginMfa = async () => {
    if (!supabase) return;
    const factors = await supabase.auth.mfa.listFactors();
    const verified = factors.data?.totp.find(f=>f.status==='verified');
    if (verified) { setFactor(verified.id); return; }
    const enrolled = await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Awaaz central administration'});
    if (enrolled.error || !enrolled.data) {setFeedback({type:'error',message:enrolled.error?.message||'Could not start authenticator setup.'});return;}
    setFactor(enrolled.data.id);setQr(enrolled.data.totp.qr_code);setManualKey(enrolled.data.totp.secret);
  };

  const verifyMfa = async (event:React.FormEvent) => {
    event.preventDefault();if (!supabase||!factor)return;
    const result = await supabase.auth.mfa.challengeAndVerify({factorId:factor,code:mfaCode.trim()});
    if (result.error) setFeedback({type:'error',message:result.error.message});
    else {setMfaReady(true);setFeedback({type:'success',message:'Administrator second-factor verification complete.'});}
  };

  const sendInvitation = async (event:React.FormEvent) => {
    event.preventDefault();if (!supabase||!isSupabaseConfigured()||!mfaReady)return;
    setInviting(true);setFeedback(null);
    try {
      const {data,error}=await supabase.functions.invoke('provision-department-staff',{body:{email:inviteEmail.trim(),fullName:inviteName.trim(),departmentId:inviteDepartment,staffRole:inviteRole}});
      if(error||data?.error) throw new Error(data?.error||error?.message||'Invitation failed.');
      setFeedback({type:'success',message:`Invitation sent to ${inviteEmail}. The person must accept it, create a password and activate an authenticator before accessing ${inviteDepartment.toUpperCase()}.`});
      setInviteName('');setInviteEmail('');await loadMemberships();
    }catch(error){setFeedback({type:'error',message:error instanceof Error?error.message:'Invitation failed.'});}
    finally{setInviting(false);}
  };

  const changeRole = async (membership: DepartmentMembershipWithDetails, role: 'head' | 'officer') => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await staffAuthService.updateStaffRole(
        membership.id,
        role,
        `Role reassigned by Main Administrator to ${role}`
      );
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Role for ${membership.profile?.email} changed to ${role === 'head' ? 'Department Head' : 'Field Officer'}.`,
        });
        await loadMemberships();
        loadAuditLogs();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to update staff role.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSuspend = (membership: DepartmentMembershipWithDetails) => {
    setSelectedTarget(membership);
    setSuspendReason('');
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedTarget) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const reason = suspendReason.trim() || 'Temporary suspension pending administrative review.';
      const res = await staffAuthService.suspendDepartmentAccess(selectedTarget.id, reason);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Account for ${selectedTarget.profile?.email} suspended. Access is temporarily disabled.`,
        });
        setIsSuspendModalOpen(false);
        setSelectedTarget(null);
        await loadMemberships();
        loadAuditLogs();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to suspend account.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMemberships = useMemo(() => {
    return memberships.filter((m) => {
      const email = m.profile?.email || '';
      const name = m.profile?.full_name || '';
      const deptName = m.department?.name || '';
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        email.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q);
      const matchesDept =
        departmentFilter === 'all' || m.department_id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [memberships, searchQuery, departmentFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesAction = auditFilter === 'all' || log.action === auditFilter;
      const q = auditSearch.toLowerCase();
      const matchesSearch =
        !q ||
        log.target_email.toLowerCase().includes(q) ||
        (log.actor_id && log.actor_id.toLowerCase().includes(q)) ||
        (log.department_id && log.department_id.toLowerCase().includes(q));
      return matchesAction && matchesSearch;
    });
  }, [auditLogs, auditFilter, auditSearch]);

  const handleOpenRevoke = (membership: DepartmentMembershipWithDetails) => {
    setSelectedTarget(membership);
    setRevokeReason('');
    setIsRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedTarget) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const reason =
        revokeReason.trim() ||
        (language === 'ur'
          ? 'انتظامیہ کی جانب سے رسائی فوری طور پر منسوخ کر دی گئی۔'
          : 'Access immediately withdrawn by Main Administrator.');

      const res = await staffAuthService.revokeDepartmentAccess(
        selectedTarget.id,
        reason
      );

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            language === 'ur'
              ? `${selectedTarget.profile?.email} کی محکمانہ رسائی فوری طور پر منسوخ کر دی گئی۔`
              : `Department access for ${selectedTarget.profile?.email} was immediately revoked.`,
        });
        setIsRevokeModalOpen(false);
        setSelectedTarget(null);
        await loadMemberships();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to revoke access.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-shell min-h-screen flex flex-col font-sans">
      <AdminHeader activeTab="access" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div className="space-y-1 order-0"><p className="text-xs font-semibold text-[#075F57]">Central administration</p><h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#102E30]">People & permissions</h1><p className="text-sm text-[#64748B]">Manage department identities, roles and access.</p><h2 className="sr-only">Departments & access</h2><p className="sr-only">Review approved department access and revoke it when required.</p></div>
        {isSupabaseConfigured() && !mfaReady && <section className="bg-white border border-slate-300 rounded-2xl p-5 space-y-3 max-w-xl"><h2 className="font-bold text-lg">Verify administrator access</h2><p className="text-sm text-slate-600">Staff invitations and role changes require your authenticator code, even after signing in.</p>{!factor?<button type="button" className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm" onClick={()=>void beginMfa()}>Continue with authenticator</button>:<form className="space-y-3" onSubmit={verifyMfa}>{qr&&<div className="space-y-2"><img src={qr} alt="Administrator authenticator QR" className="w-40 h-40"/><p className="text-xs break-all">Manual setup key: {manualKey}</p></div>}<input aria-label="Six digit authenticator code" className="w-full rounded-lg border border-slate-300 p-3" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} placeholder="Six-digit code" value={mfaCode} onChange={e=>setMfaCode(e.target.value)}/><button type="submit" className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm">Verify code</button></form>}</section>}
        <details className="order-2 bg-[#102e30] text-white rounded-xl p-5 sm:p-6 group">
          <summary className="cursor-pointer font-semibold text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#bff6ac]">Invite a department employee <span className="font-normal text-sm text-slate-300 ml-2">— requires verified administrator access</span></summary>
          <div className="mt-5 flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
          <div className="max-w-md"><p className="text-xs tracking-[.2em] uppercase text-emerald-200">Personnel / controlled access</p><h2 className="text-2xl font-bold tracking-tight mt-2">One identity per person.</h2><p className="text-sm text-slate-300 mt-2 leading-relaxed">Invite each employee using a verified work email. Department heads allocate work; officers only access their assignments. No shared access keys.</p></div>
          <form onSubmit={e=>void sendInvitation(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl" aria-label="Invite department employee">
            <label className="text-xs">Full name<input required minLength={2} maxLength={120} value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Officer's full name" className="block w-full bg-white text-slate-900 border-0 rounded-lg p-3 mt-1"/></label>
            <label className="text-xs">Work email<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="name@department.gov.pk" className="block w-full bg-white text-slate-900 border-0 rounded-lg p-3 mt-1"/></label>
            <label className="text-xs">Department<select value={inviteDepartment} onChange={e=>setInviteDepartment(e.target.value)} className="block w-full bg-white text-slate-900 rounded-lg p-3 mt-1"><option value="kmc">Karachi Metropolitan Corporation</option><option value="kwsc">KWSC</option><option value="kelectric">K-Electric</option><option value="sswmb">SSWMB</option><option value="ssgc">SSGC</option><option value="sbca">SBCA</option></select></label>
            <label className="text-xs">Responsibility<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as 'head'|'officer')} className="block w-full bg-white text-slate-900 rounded-lg p-3 mt-1"><option value="officer">Field officer</option><option value="head">Department head</option></select></label>
            <button type="submit" disabled={inviting||!isSupabaseConfigured()||!mfaReady} className="sm:col-span-2 bg-[#bff6ac] disabled:opacity-50 text-[#102e30] rounded-lg font-bold px-4 py-3 text-sm">{inviting?'Sending invitation…':'Invite approved employee'}</button>
            {!isSupabaseConfigured()&&<p className="sm:col-span-2 text-xs text-amber-200">Connect staging Supabase to send a real invitation. Local demos cannot create live identities.</p>}
          </form>
          </div>
        </details>
        {isSupabaseConfigured()&&mfaReady&&<section className="order-3 bg-white border border-[#D8E0DE] rounded-xl overflow-hidden" aria-label="City-wide officer workload"><div className="p-5 border-b border-[#D8E0DE]"><p className="text-xs font-semibold text-[#075F57]">Department rosters</p><h2 className="text-lg font-semibold text-[#14272A] mt-1">Officer workload</h2><p className="text-xs text-slate-500 mt-1">Ratings require at least five verified cases.</p></div>{workforceError?<p role="alert" className="p-4 text-xs text-red-700">{workforceError}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] text-slate-500 tracking-wider"><tr><th className="p-3">DEPARTMENT / OFFICER</th><th>ROLE</th><th>OPEN</th><th>OVERDUE</th><th>VERIFIED</th><th>RATING</th></tr></thead><tbody>{workforce.filter(o=>o.staff_role==='officer').map(o=><tr key={`${o.department_id}-${o.user_id}`} className="border-t border-slate-100"><td className="p-3 font-semibold text-[#14272A]">{o.display_name}<span className="block text-[11px] font-normal text-slate-500">{o.department_id.toUpperCase()}</span></td><td className="text-xs">Officer</td><td>{o.active_cases}</td><td className={o.overdue_cases>0?'font-bold text-red-700':''}>{o.overdue_cases}</td><td>{o.verified_cases}</td><td>{officerRating(o)?.toFixed(1)||'Not rated'}</td></tr>)}</tbody></table>{workforce.length===0&&<p className="p-4 text-sm text-slate-500">No active officer records yet.</p>}</div>}</section>}
        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
            role="status"
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Main Grid: Authorized Access Table & Scope Sidebar */}
        <div className="order-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Table Container (Figma 35:1138 / 1248px width) */}
          <section
            className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
            aria-labelledby="access-table-heading"
          >
            {/* Header Controls */}
            <div className="p-5 border-b border-[#E2E8F0] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2
                    id="access-table-heading"
                    className="text-base font-bold text-[#0F1E21]"
                  >
                    {language === 'ur' ? 'مجاز محکمانہ عملہ' : 'Authorized access'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                    {filteredMemberships.length} ACTIVE
                  </span>
                </div>

                <button
                  type="button"
                  onClick={loadMemberships}
                  className="text-xs font-semibold text-[#122E32] hover:underline cursor-pointer"
                >
                  {language === 'ur' ? 'تازہ دم کریں' : 'Refresh'}
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8] rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      language === 'ur'
                        ? 'محکمہ یا دفتری ای میل تلاش کریں...'
                        : 'Search departments or work email...'
                    }
                    className="w-full h-10 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-lg border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#122E32]"
                  />
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8] rtl:left-auto rtl:right-3 pointer-events-none" />
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rtl:pl-8 rtl:pr-9 rounded-lg border border-[#CBD5E1] text-xs bg-white focus:outline-none focus:border-[#122E32]"
                  >
                    <option value="all">
                      {language === 'ur' ? 'تمام محکمے' : 'All Departments'}
                    </option>
                    <option value="kwsc">KW&SC (Water & Sewerage)</option>
                    <option value="kelectric">K-Electric (Power)</option>
                    <option value="sswmb">SSWMB (Solid Waste)</option>
                    <option value="ssgc">SSGC (Gas)</option>
                    <option value="kmc">KMC (Metropolitan)</option>
                    <option value="sbca">SBCA (Building Control)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                {language === 'ur' ? 'معلومات لوڈ ہو رہی ہیں...' : 'Loading access directory...'}
              </div>
            ) : filteredMemberships.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F1E21]">
                  {language === 'ur' ? 'کوئی مجاز اکاؤنٹ نہیں ملا' : 'No active memberships found'}
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  {language === 'ur'
                    ? 'اس وقت کوئی فعال محکمانہ اکاؤنٹ موجود نہیں ہے۔ موصول ہونے والی درخواستوں کی منظوری دیں۔'
                    : 'No approved staff members match the selected criteria. Approve pending requests from the Department Requests tab.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-mono uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">{language === 'ur' ? 'محکمہ' : 'DEPARTMENT'}</th>
                      <th className="py-3 px-4">{language === 'ur' ? 'عملے کا دفتری ای میل' : 'STAFF WORK EMAIL'}</th>
                      <th className="py-3 px-4">{language === 'ur' ? 'دائرہ کار' : 'SCOPE'}</th>
                      <th className="py-3 px-4 text-right rtl:text-left">{language === 'ur' ? 'اختیار / رسائی' : 'ACCESS'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredMemberships.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#0F1E21]">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>{m.department?.name || m.department_id}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#64748B] px-1.5 py-0.5 rounded bg-slate-100">
                            {m.department?.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#0F1E21]">
                          <div>{m.profile?.email || 'unknown'}</div>
                          <div className="text-[11px] font-sans text-[#64748B]">{m.profile?.full_name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#334155]">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {m.staff_role === 'head' ? 'Department head' : 'Field officer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right rtl:text-left">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <select
                              aria-label={`Role for ${m.profile?.email}`}
                              value={m.staff_role || 'officer'}
                              onChange={(e) => void changeRole(m, e.target.value as 'head' | 'officer')}
                              disabled={isSubmitting}
                              className="rounded-md border border-[#CBD5E1] p-1.5 text-xs bg-white font-medium cursor-pointer"
                            >
                              <option value="officer">Field officer</option>
                              <option value="head">Department head</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleOpenSuspend(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-semibold text-xs transition-colors cursor-pointer"
                              title="Temporarily suspend staff access"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRevoke(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{language === 'ur' ? 'رسائی منسوخ کریں →' : 'Revoke access →'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Scope Sidebar (Figma Frame 35:1161 / 452px width) */}
          <section
            className="lg:col-span-4 space-y-4"
            aria-labelledby="scope-heading"
          >
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#0F1E21]">
                <ShieldAlert className="w-4 h-4 text-[#122E32]" />
                <h3 id="scope-heading" className="text-sm font-bold">
                  {language === 'ur' ? 'محکمانہ رسائی کا دائرہ کار' : 'Department access scope'}
                </h3>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed">
                {language === 'ur'
                  ? 'مجاز ملازمین کو صرف ان کے اپنے محکمے سے متعلق تفویض کردہ شکایات دیکھنے اور ان کی حالت اپ ڈیٹ کرنے کا اختیار ہے۔'
                  : 'Authorized assigned complaints only. Citizen names, phone numbers, and home addresses are redacted in accordance with civic privacy policies.'}
              </p>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>{language === 'ur' ? 'فوری منسوخی کا نفاذ' : 'Immediate Revocation'}</span>
                </div>
                <p>
                  {language === 'ur'
                    ? 'جب ایڈمنسٹریٹر رسائی منسوخ کرتا ہے، تو متعلقہ ملازم کے جاری سیشن کو فوری طور پر بند کر دیا جاتا ہے، اور وہ مزید کسی شکایت تک رسائی حاصل نہیں کر سکتا۔'
                    : 'Revocation removes active department membership. Staff requests must recheck membership and deny further work, even if an existing login token has not expired. Tokens are not automatically erased from the employee’s device.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Searchable Audit Ledger Section */}
        <section
          className="order-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
          aria-labelledby="audit-ledger-heading"
        >
          <div className="p-5 border-b border-[#E2E8F0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[#0F1E21] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  CRYPTOGRAPHIC LOG INTEGRITY
                </div>
                <h2 id="audit-ledger-heading" className="text-base font-bold text-[#0F1E21]">
                  Administrative Access Audit Ledger
                </h2>
                <p className="text-xs text-[#64748B]">
                  Immutable append-only record of all identity provisions, approvals, role mutations, suspensions, and access revocations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                  {filteredAuditLogs.length} Records
                </span>
                <button
                  type="button"
                  onClick={loadAuditLogs}
                  className="text-xs font-semibold text-[#122E32] hover:underline cursor-pointer"
                >
                  Refresh Log
                </button>
              </div>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {['all', 'request_approved', 'request_rejected', 'access_revoked', 'access_suspended', 'role_updated'].map((actionKey) => {
                  const isAct = auditFilter === actionKey;
                  const label =
                    actionKey === 'all'
                      ? 'All Events'
                      : actionKey === 'request_approved'
                      ? 'Approvals'
                      : actionKey === 'request_rejected'
                      ? 'Rejections'
                      : actionKey === 'access_revoked'
                      ? 'Revocations'
                      : actionKey === 'access_suspended'
                      ? 'Suspensions'
                      : 'Role Changes';
                  return (
                    <button
                      key={actionKey}
                      type="button"
                      onClick={() => setAuditFilter(actionKey)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        isAct
                          ? 'bg-[#0F1E21] text-white shadow-xs'
                          : 'bg-slate-100 text-[#64748B] hover:text-[#0F1E21] hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#94A3B8]" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filter target email or actor..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#122E32]"
                />
              </div>
            </div>
          </div>

          {/* Audit Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-mono uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">TIMESTAMP (PKT)</th>
                  <th className="py-3 px-4">ACTION</th>
                  <th className="py-3 px-4">TARGET USER & DEPT</th>
                  <th className="py-3 px-4">OPERATIONAL DETAILS</th>
                  <th className="py-3 px-4 text-right">HASH INTEGRITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No audit records matching selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.action === 'request_approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            APPROVED
                          </span>
                        )}
                        {log.action === 'request_rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-mono text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            REJECTED
                          </span>
                        )}
                        {log.action === 'access_revoked' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-mono text-[10px] font-bold">
                            <UserX className="w-3 h-3 text-rose-600" />
                            REVOKED
                          </span>
                        )}
                        {log.action === 'access_suspended' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            SUSPENDED
                          </span>
                        )}
                        {log.action === 'role_updated' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-mono text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            ROLE UPDATED
                          </span>
                        )}
                        {log.action === 'admin_provisioned' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3 text-slate-600" />
                            PROVISIONED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#0F1E21]">
                        <div>{log.target_email}</div>
                        <div className="text-[10px] text-[#64748B] font-sans">
                          Dept: <span className="font-semibold uppercase">{log.department_id || 'All'}</span> · Actor: {log.actor_id || 'admin'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#334155] max-w-xs truncate text-[11px]">
                        {log.details ? (typeof log.details === 'object' ? (log.details as any).reason || (log.details as any).note || JSON.stringify(log.details) : String(log.details)) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{log.id.slice(0, 8)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Revocation Confirmation Dialog (Figma Frame 35:1154 / 35:1840) */}
      {isRevokeModalOpen && selectedTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#0F1E21]">
                  {language === 'ur'
                    ? 'محکمہ کی رسائی منسوخ کریں؟'
                    : 'Revoke department access?'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {language === 'ur'
                    ? `ملازم: ${selectedTarget.profile?.full_name} (${selectedTarget.profile?.email})`
                    : `Selection: ${selectedTarget.profile?.email} (${selectedTarget.department?.name})`}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
              {language === 'ur'
                ? 'رسائی منسوخ کرنے سے یہ صارف فوری طور پر شکایات دیکھنے یا ان پر کارروائی کرنے سے روک دیا جائے گا۔'
                : 'Revoking removes this user\'s ability to view or act on complaints immediately. Any active session will terminate upon their next action.'}
            </p>

            {/* Optional Reason Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="revoke-reason-input"
                className="block text-xs font-semibold text-[#0F1E21]"
              >
                {language === 'ur' ? 'منسوخی کی وجہ (اختیاری):' : 'Reason for revocation (optional):'}
              </label>
              <input
                id="revoke-reason-input"
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={
                  language === 'ur'
                    ? 'مثال: ملازم کا تبادلہ دوسرے محکمے میں ہو گیا...'
                    : 'e.g., Staff transferred or role decommissioned...'
                }
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Action Buttons (Figma 35:1157 & 35:1159) */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRevokeModalOpen(false);
                  setSelectedTarget(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
              >
                {language === 'ur' ? 'منسوخ' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UserX className="w-4 h-4" />
                <span>
                  {language === 'ur' ? 'منسوخی کی تصدیق کریں' : 'Confirm revoke'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspension Confirmation Dialog */}
      {isSuspendModalOpen && selectedTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#0F1E21]">
                  Suspend staff account?
                </h3>
                <p className="text-xs text-[#64748B]">
                  Selection: {selectedTarget.profile?.email} ({selectedTarget.department?.name})
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
              Suspending an account temporarily revokes login permissions and active work dispatch capability without deleting verified work history.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="suspend-reason-input"
                className="block text-xs font-semibold text-[#0F1E21]"
              >
                Reason for suspension:
              </label>
              <input
                id="suspend-reason-input"
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Pending disciplinary inquiry or temporary leave..."
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuspendModalOpen(false);
                  setSelectedTarget(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Confirm suspension</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
