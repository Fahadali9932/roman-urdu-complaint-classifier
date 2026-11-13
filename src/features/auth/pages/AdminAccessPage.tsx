import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import {
  staffAuthService,
  type DepartmentMembershipWithDetails,
} from '../../../services/staffAuthService';
import { AdminHeader } from '../components/AdminHeader';
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

  // Revocation modal state (Figma 35:1154 / 35:1840)
  const [selectedTarget, setSelectedTarget] = useState<DepartmentMembershipWithDetails | null>(
    null
  );
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Guard: Redirect unauthenticated admins to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
    loadMemberships();
  }, []);

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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F1E21] flex flex-col font-sans">
      <AdminHeader activeTab="access" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title (Figma 35:1135 - 35:1137) */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] font-mono font-semibold text-blue-800">
            <Users className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'اختیارات و رسائی کنٹرول' : 'ACCESS & PERMISSIONS'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E21]">
            {language === 'ur' ? 'محکمے اور رسائی' : 'Departments & access'}
          </h1>

          <p className="text-sm text-[#64748B]">
            {language === 'ur'
              ? 'منظور شدہ محکمانہ عملے کی رسائی کا جائزہ لیں اور ضرورت پڑنے پر فوری منسوخ کریں۔'
              : 'Review approved department access and revoke it when required.'}
          </p>
        </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                            {language === 'ur' ? 'صرف تفویض شدہ شکایات' : 'Assigned complaints only'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right rtl:text-left">
                          <button
                            type="button"
                            onClick={() => handleOpenRevoke(m)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{language === 'ur' ? 'رسائی منسوخ کریں →' : 'Revoke access →'}</span>
                          </button>
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
                    : 'When access is revoked, active staff tokens and sessions are invalidated immediately in real-time. The revoked employee is blocked from accessing complaints instantly.'}
                </p>
              </div>
            </div>
          </section>
        </div>
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
    </div>
  );
};
