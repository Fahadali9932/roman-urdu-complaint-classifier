import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import {
  PenTool,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  KeyRound,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { complaintService } from '../../services';
import type { Complaint } from '../../types';
import { ComplaintFolder } from '../../components/citizen/ComplaintFolder';
import { ComplaintDetailModal } from '../../components/citizen/ComplaintDetailModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const CitizenDashboard: React.FC = () => {
  const { t, language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Claim modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimRef, setClaimRef] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  const loadComplaints = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await complaintService.getCitizenComplaints();
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load citizen complaints:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    loadComplaints();

    // 1. Supabase Realtime Subscription
    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel('citizen-complaints-live')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'complaints',
          },
          () => {
            loadComplaints(true);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'complaint_timeline_events',
          },
          () => {
            loadComplaints(true);
          }
        )
        .subscribe();
    }

    // 2. Window focus refresh
    const handleFocus = () => {
      loadComplaints(true);
    };
    window.addEventListener('focus', handleFocus);

    // 3. 15-second polling fallback
    const intervalId = setInterval(() => {
      loadComplaints(true);
    }, 15000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [loadComplaints]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimRef.trim() || !claimCode.trim()) {
      setClaimError(ur ? 'حوالہ نمبر اور کلیم کوڈ دونوں درکار ہیں۔' : 'Both reference number and claim code are required.');
      return;
    }
    setClaimLoading(true);
    setClaimError('');
    setClaimSuccess('');
    try {
      const res = await complaintService.claimComplaint(claimRef.trim(), claimCode.trim());
      if (res.success) {
        setClaimSuccess(ur ? 'شکایت کامیابی سے آپ کے اکاؤنٹ سے منسلک کر دی گئی!' : 'Complaint linked to your account successfully!');
        await loadComplaints(true);
        setTimeout(() => {
          setIsClaimModalOpen(false);
          setClaimRef('');
          setClaimCode('');
          setClaimSuccess('');
        }, 1500);
      } else {
        setClaimError(res.error || (ur ? 'غلط حوالہ نمبر یا کلیم کوڈ۔' : 'Invalid reference number or claim code.'));
      }
    } catch (err: any) {
      setClaimError(err.message || (ur ? 'شکایت منسلک نہیں ہو سکی۔' : 'Failed to claim complaint.'));
    } finally {
      setClaimLoading(false);
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'assigned' || c.status === 'submitted' || c.status === 'under_review').length,
    inProgress: complaints.filter((c) => c.status === 'accepted' || c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  return (
    <div className="w-full text-start space-y-8">
      {/* Archive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E3E0]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[#681822] uppercase">
              {ur ? 'شہری دستاویزات' : 'CITIZEN ARCHIVE'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#681822]" />
            <span className="text-[11px] font-mono text-[#323232]">
              Awaaz-e-Awam
            </span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#141414] uppercase tracking-tight">
            {ur ? 'آپ کی شکایات' : 'Your Complaints'}
            {complaints.length > 0 && (
              <span className="ml-3 text-lg font-mono font-normal text-[#681822]">
                ({complaints.length})
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#323232] font-ui">
            {complaints.length > 0
              ? ur
                ? 'آپ کی درج شدہ تمام بلدیاتی شکایات کی براہِ راست پیش رفت اور تفصیلات۔'
                : 'Real-time record of your filed municipal complaints and field progress.'
              : ur
              ? 'جب شکایات محفوظ ہوں گی تو آپ کی کیس فائلز یہاں نظر آئیں گی۔'
              : 'Your digital correspondence and case files will appear here when complaint saving is available.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setIsClaimModalOpen(true);
              setClaimError('');
              setClaimSuccess('');
            }}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-[#D9D3CC] bg-white px-4 text-xs font-bold text-[#141414] hover:bg-[#FAF9F7] transition cursor-pointer shadow-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#681822]" />
            <span>{ur ? 'مہمان شکایت منسلک کریں' : 'Claim Guest Complaint'}</span>
          </button>
          <Link to="/submit" className="flex-1 sm:flex-initial">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PenTool className="w-4 h-4 text-[#FFFFFF]" />}
              className="w-full tracking-wider text-xs"
            >
              {t('navWriteComplaint') || 'Write Complaint'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && complaints.length === 0 && (
        <div className="p-8 text-center text-[#736E68] text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#681822]" />
          <span>{ur ? 'لوڈ ہو رہا ہے…' : 'Syncing records…'}</span>
        </div>
      )}

      {/* When Complaints Exist: Show Stats & Cards */}
      {complaints.length > 0 ? (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E5E3E0] shadow-xs">
              <span className="text-[11px] font-mono uppercase text-[#736E68] font-bold block">
                {ur ? 'کل شکایات' : 'Total Complaints'}
              </span>
              <span className="text-2xl font-black text-[#141414] mt-1 block">
                {stats.total}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E3E0] shadow-xs">
              <span className="text-[11px] font-mono uppercase text-amber-700 font-bold block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {ur ? 'منتظر' : 'Pending'}
              </span>
              <span className="text-2xl font-black text-amber-800 mt-1 block">
                {stats.pending}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E3E0] shadow-xs">
              <span className="text-[11px] font-mono uppercase text-blue-700 font-bold block flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {ur ? 'زیرِ کارروائی' : 'In Progress'}
              </span>
              <span className="text-2xl font-black text-blue-800 mt-1 block">
                {stats.inProgress}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E5E3E0] shadow-xs">
              <span className="text-[11px] font-mono uppercase text-emerald-700 font-bold block flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {ur ? 'حل شدہ' : 'Resolved'}
              </span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                {stats.resolved}
              </span>
            </div>
          </div>

          {/* Complaints Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {complaints.map((c) => (
              <ComplaintFolder
                key={c.id}
                complaint={c}
                onClick={() => {
                  setSelectedComplaint(c);
                  setIsDetailOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Honest Digital Correspondence Empty State (Preserves Test Assertions) */
        <div className="p-6 sm:p-16 rounded-3xl bg-white border border-[#E5E3E0] text-center max-w-2xl mx-auto my-8 space-y-6 shadow-[0_12px_36px_rgba(20,20,20,0.06)]">
          <div className="w-20 h-20 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center mx-auto text-[#681822]">
            <FolderOpen className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-[#141414] uppercase tracking-tight">
              {ur ? 'ابھی کوئی شکایت نہیں۔' : 'No complaints yet.'}
            </h2>
            <p className="text-sm sm:text-base text-[#323232] max-w-md mx-auto leading-relaxed font-ui">
              {ur
                ? 'یہ پیش منظر ابھی شکایات نہیں بھیجتا یا محفوظ کرتا، اس لیے یہاں کوئی کیس فائل موجود نہیں ہے۔'
                : 'This academic preview does not send or save complaints yet, so there are no case files to show.'}
            </p>
          </div>
          <div className="pt-2">
            <Link to="/submit">
              <Button variant="primary" size="lg" rightIcon={isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />} className="tracking-wider text-xs sm:text-sm px-8">
                {t('navWriteComplaint') || 'Write Complaint'}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Case File Detail Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          isOpen={isDetailOpen}
          complaint={selectedComplaint}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedComplaint(null);
          }}
        />
      )}

      {/* Claim Guest Complaint Modal */}
      {isClaimModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#141414]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8 text-start animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7EFF0] border border-[#F0D5D8] px-3 py-1 text-xs font-bold text-[#681822]">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{ur ? 'ملکیت کی تصدیق' : 'Ownership Proof'}</span>
                </span>
                <h2 className="pt-2 text-xl sm:text-2xl font-black text-[#141414] tracking-tight">
                  {ur ? 'مہمان شکایت منسلک کریں' : 'Claim Guest Complaint'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="rounded-xl p-2 text-[#625D58] hover:bg-[#F7F6F3] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-xs sm:text-[13px] text-[#625D58] leading-relaxed">
              {ur
                ? 'اگر آپ نے اکاؤنٹ بنائے بغیر شکایت درج کی تھی، تو موصول شدہ سرکاری حوالہ نمبر اور نجی کلیم کوڈ یہاں درج کر کے اسے اپنے اکاؤنٹ سے منسلک کریں۔'
                : 'If you submitted a complaint without signing in, enter your official reference number and private claim code to link it to your account.'}
            </p>

            <form onSubmit={handleClaim} className="mt-5 space-y-4">
              <div>
                <label htmlFor="claim-ref" className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">
                  {ur ? 'سرکاری حوالہ نمبر' : 'Reference Number'}
                </label>
                <input
                  id="claim-ref"
                  type="text"
                  placeholder="KHI-2026-XXXXXXXX"
                  value={claimRef}
                  onChange={(e) => setClaimRef(e.target.value)}
                  className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="claim-code" className="block text-xs font-bold text-[#141414] uppercase tracking-wider mb-1.5">
                  {ur ? 'نجی کلیم کوڈ' : 'Private Claim Code'}
                </label>
                <input
                  id="claim-code"
                  type="text"
                  placeholder="CLM-XXXX-XXXX-XXXX"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  className="w-full rounded-xl border border-[#D9D3CC] px-4 py-2.5 font-mono text-sm uppercase placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none"
                  required
                />
              </div>

              {claimError && (
                <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{claimError}</span>
                </div>
              )}

              {claimSuccess && (
                <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{claimSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="min-h-10 rounded-xl border border-[#D9D3CC] bg-[#FAF9F7] px-4 text-xs font-semibold text-[#141414] hover:bg-[#F2EFEA] transition cursor-pointer"
                >
                  {ur ? 'منسوخ کریں' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="min-h-10 rounded-xl bg-[#681822] px-5 text-xs font-bold text-white hover:bg-[#53131B] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {claimLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{ur ? 'شکایت منسلک کریں' : 'Claim & Link Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
