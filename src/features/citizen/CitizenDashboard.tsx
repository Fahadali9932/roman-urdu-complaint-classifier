import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { PenTool, FolderOpen, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
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

  useEffect(() => {
    let isCancelled = false;

    const loadComplaints = async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await complaintService.getCitizenComplaints();
        if (!isCancelled) {
          setComplaints(data);
        }
      } catch (err) {
        console.error('Failed to load citizen complaints:', err);
      } finally {
        if (!isCancelled && !silent) {
          setIsLoading(false);
        }
      }
    };

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
      isCancelled = true;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, []);

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

        <Link to="/submit">
          <Button variant="primary" size="md" leftIcon={<PenTool className="w-4 h-4 text-[#FFFFFF]" />} className="w-full sm:w-auto tracking-wider text-xs">
            {t('navWriteComplaint') || 'Write Complaint'}
          </Button>
        </Link>
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
    </div>
  );
};
