import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import {
  staffAuthService,
  type DepartmentAccessRequestWithDept,
} from '../../../services/staffAuthService';
import { AdminHeader } from '../components/AdminHeader';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Filter,
} from 'lucide-react';

export const AdminRequestsPage: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const { isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<DepartmentAccessRequestWithDept[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Action status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Guard: Redirect unauthenticated admins to login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load pending requests
  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await staffAuthService.getPendingDepartmentRequests();
      setRequests(data);
      if (data.length > 0 && !selectedRequestId) {
        setSelectedRequestId(data[0].id);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Failed to load department access requests.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        r.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept =
        departmentFilter === 'all' || r.department_id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [requests, searchQuery, departmentFilter]);

  // Active selected request
  const selectedRequest = useMemo(() => {
    return (
      filteredRequests.find((r) => r.id === selectedRequestId) ||
      filteredRequests[0] ||
      null
    );
  }, [filteredRequests, selectedRequestId]);

  // Handle Approve
  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await staffAuthService.approveDepartmentRequest(selectedRequest.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            language === 'ur'
              ? `${selectedRequest.full_name} (${selectedRequest.work_email}) کی رسائی منظور کر لی گئی۔`
              : `Access approved for ${selectedRequest.full_name} (${selectedRequest.work_email}).`,
        });
        await loadRequests();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to approve request.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      setFeedback({
        type: 'error',
        message:
          language === 'ur'
            ? 'براہ کرم مسترد کرنے کی وجہ درج کریں۔'
            : 'Please specify a reason for rejection.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await staffAuthService.rejectDepartmentRequest(
        selectedRequest.id,
        rejectReason.trim()
      );
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            language === 'ur'
              ? `${selectedRequest.full_name} کی درخواست مسترد کر دی گئی۔`
              : `Access request rejected for ${selectedRequest.full_name}.`,
        });
        setIsRejectModalOpen(false);
        setRejectReason('');
        await loadRequests();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to reject request.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F1E21] flex flex-col font-sans">
      <AdminHeader activeTab="requests" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title & Mission (Figma 35:1071 - 35:1073) */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-semibold text-emerald-800">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'محکمانہ سیکیورٹی چیک' : 'CIVIC ACCESS AUDIT'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F1E21]">
            {language === 'ur' ? 'محکمہ رسائی کی درخواستیں' : 'Department requests'}
          </h1>

          <p className="text-sm text-[#64748B]">
            {language === 'ur'
              ? 'رسائی منظور کرنے سے پہلے درخواست گزار اور محکمے کی تفصیلات کا بغور جائزہ لیں۔'
              : 'Review the applicant and department before approving access.'}
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

        {/* Main 2-Column Grid (Figma Frames 35:1074 & 35:1090) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Applicant Queue (Width 824px in Figma / 7-8 cols) */}
          <section
            className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden"
            aria-labelledby="queue-heading"
          >
            {/* Queue Controls & Filter */}
            <div className="p-5 border-b border-[#E2E8F0] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 id="queue-heading" className="text-base font-bold text-[#0F1E21]">
                    {language === 'ur' ? 'جائزہ کے منتظر درخواستیں' : 'Pending review'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-bold">
                    {filteredRequests.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={loadRequests}
                  className="text-xs font-semibold text-[#122E32] hover:underline cursor-pointer"
                >
                  {language === 'ur' ? 'تازہ دم کریں' : 'Refresh'}
                </button>
              </div>

              {/* Search & Department Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#94A3B8] rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      language === 'ur'
                        ? 'دفتری ای میل یا نام تلاش کریں...'
                        : 'Search work email or name...'
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

            {/* Table / Queue List */}
            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                {language === 'ur' ? 'درخواستیں لوڈ ہو رہی ہیں...' : 'Loading requests...'}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-[#0F1E21]">
                  {language === 'ur' ? 'کوئی نئی درخواست موجود نہیں' : 'All requests reviewed'}
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  {language === 'ur'
                    ? 'اس وقت جائزے کے لیے کوئی التواء والی محکمانہ رسائی کی درخواست موجود نہیں ہے۔'
                    : 'There are currently no pending department access applications awaiting approval.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] font-mono uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">{language === 'ur' ? 'درخواست گزار' : 'APPLICANT'}</th>
                      <th className="py-3 px-4">{language === 'ur' ? 'محکمہ' : 'DEPARTMENT'}</th>
                      <th className="py-3 px-4 text-right rtl:text-left">
                        {language === 'ur' ? 'حالت' : 'STATE'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredRequests.map((req) => {
                      const isSelected = req.id === selectedRequest?.id;
                      return (
                        <tr
                          key={req.id}
                          onClick={() => setSelectedRequestId(req.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#F0FDF4] border-l-4 border-l-emerald-600'
                              : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#0F1E21]">{req.full_name}</div>
                            <div className="text-[#64748B] font-mono text-[11px]">{req.work_email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[#0F1E21] font-medium text-[11px]">
                              <Building2 className="w-3 h-3 text-[#64748B]" />
                              {req.department?.name || req.department_id}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right rtl:text-left">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[10px] font-bold">
                              <Clock className="w-3 h-3" />
                              <span>PENDING</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[11px] text-[#64748B] text-center font-mono">
              {language === 'ur'
                ? 'تفصیلات کے معائنے کے لیے کسی قطار کو منتخب کریں۔'
                : 'Select a row to inspect the access request.'}
            </div>
          </section>

          {/* Column 2: Selected Applicant / Review Panel (Figma Frame 35:1090 / 400px) */}
          <section
            className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-6"
            aria-labelledby="review-heading"
          >
            {selectedRequest ? (
              <div className="space-y-6">
                {/* Header & Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 id="review-heading" className="text-lg font-bold text-[#0F1E21]">
                      {language === 'ur' ? 'درخواست کا معائنہ' : 'Review request'}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100/70 border border-amber-300 text-amber-900 font-mono text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>PENDING APPROVAL</span>
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B]">
                    {language === 'ur'
                      ? 'موصول ہونے کی تاریخ:'
                      : 'Received:'}{' '}
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Detailed Spec Fields */}
                <div className="space-y-4 pt-2 border-t border-[#F1F5F9]">
                  {/* Applicant Name */}
                  <div className="space-y-1">
                    <span className="block text-[11px] font-mono font-bold tracking-wider text-[#64748B] uppercase">
                      {language === 'ur' ? 'درخواست گزار' : 'APPLICANT'}
                    </span>
                    <div className="text-sm font-bold text-[#0F1E21]">
                      {selectedRequest.full_name}
                    </div>
                  </div>

                  {/* Work Email */}
                  <div className="space-y-1">
                    <span className="block text-[11px] font-mono font-bold tracking-wider text-[#64748B] uppercase">
                      {language === 'ur' ? 'دفتری ای میل' : 'WORK EMAIL'}
                    </span>
                    <div className="text-sm font-mono text-[#0F1E21] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] break-all">
                      {selectedRequest.work_email}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <span className="block text-[11px] font-mono font-bold tracking-wider text-[#64748B] uppercase">
                      {language === 'ur' ? 'متعلقہ ادارہ / محکمہ' : 'DEPARTMENT'}
                    </span>
                    <div className="text-sm font-semibold text-[#0F1E21]">
                      {selectedRequest.department?.name || selectedRequest.department_id}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Code: {selectedRequest.department?.code}
                    </div>
                  </div>

                  {/* Institutional Access Disclosure (Figma 35:1100) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#334155] leading-relaxed space-y-1">
                    <div className="font-semibold text-[#0F1E21] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#122E32]" />
                      <span>{language === 'ur' ? 'رسائی ضابطہ' : 'Access Scope Limitation'}</span>
                    </div>
                    <p>
                      {language === 'ur'
                        ? 'منظوری کے بعد یہ صارف صرف اس محکمے سے متعلقہ شکایات دیکھنے اور ان پر کارروائی کا مجاز ہوگا۔'
                        : 'Approval permits access only to complaints assigned to this department.'}
                    </p>
                  </div>
                </div>

                {/* Primary Actions (Figma 35:1101 & 35:1103) */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-[#0F1E21] hover:bg-[#1A3337] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {language === 'ur' ? 'رسائی منظور کریں' : 'Approve access'}
                    </span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectReason('');
                      setIsRejectModalOpen(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      {language === 'ur' ? 'درخواست مسترد کریں' : 'Reject request'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#64748B]">
                {language === 'ur'
                  ? 'معائنہ کرنے کے لیے بائیں جانب سے درخواست منتخب کریں۔'
                  : 'Select an applicant from the queue to inspect.'}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Rejection Modal (Figma Frame 35:1767) */}
      {isRejectModalOpen && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0F1E21]">
                {language === 'ur' ? 'درخواست مسترد کریں؟' : 'Reject access request?'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {language === 'ur'
                  ? `درخواست گزار: ${selectedRequest.full_name} (${selectedRequest.work_email})`
                  : `Applicant: ${selectedRequest.full_name} (${selectedRequest.work_email})`}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reject-reason-input"
                className="block text-xs font-semibold text-[#0F1E21]"
              >
                {language === 'ur'
                  ? 'مسترد کرنے کی وجہ (درخواست گزار کو دکھائی جائے گی):'
                  : 'Reason for rejection (shown to applicant):'}
              </label>
              <textarea
                id="reject-reason-input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={
                  language === 'ur'
                    ? 'مثال: دفتری ای میل سرکاری ڈومین سے مطابقت نہیں رکھتی...'
                    : 'e.g., Work email does not match official municipal domain...'
                }
                className="w-full p-3 rounded-lg border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#122E32]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
              >
                {language === 'ur' ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting || !rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {language === 'ur' ? 'مسترد کی تصدیق کریں' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
