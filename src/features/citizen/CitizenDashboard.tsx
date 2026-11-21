import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  AlertCircle,
  Search,
} from 'lucide-react';
import { complaintService } from '../../services';
import type { Complaint } from '../../types';
import { ComplaintFolder } from '../../components/citizen/ComplaintFolder';
import { ComplaintDetailModal } from '../../components/citizen/ComplaintDetailModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface CitizenDashboardProps {
  isDevHarness?: boolean;
  /** Explicit fictional records; never populated from live services in the development harness. */
  demoComplaints?: readonly Complaint[];
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ isDevHarness = false, demoComplaints }) => {
  const { language, isRTL } = useLanguage();
  const ur = language === 'ur';

  const [complaints, setComplaints] = useState<Complaint[]>(() =>
    isDevHarness ? (demoComplaints?.filter((record) => record.isDemonstration === true) ?? []) : []
  );
  const [isLoading, setIsLoading] = useState(!isDevHarness);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'under_review' | 'in_progress' | 'resolved' | 'rejected'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');


  const loadComplaints = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (isDevHarness) {
      // A demo must never read live Supabase data or browser-stored complaints,
      // even if the developer happens to be signed in to a real project.
      setComplaints(demoComplaints?.filter((record) => record.isDemonstration === true) ?? []);
      if (!silent) setIsLoading(false);
      return;
    }
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
  }, [isDevHarness, demoComplaints]);

  useEffect(() => {
    // No Realtime connections, background polling or local-storage reads in
    // the unauthenticated, development-only demonstration page.
    if (isDevHarness) return;
    loadComplaints();

    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel('citizen-complaints-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'complaints' },
          () => loadComplaints(true)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'complaint_timeline_events' },
          () => loadComplaints(true)
        )
        .subscribe();
    }

    const handleFocus = () => loadComplaints(true);
    window.addEventListener('focus', handleFocus);
    const intervalId = setInterval(() => loadComplaints(true), 15000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [loadComplaints, isDevHarness]);

  // Accurate counts derived strictly from genuine records
  const stats = useMemo(() => {
    return {
      total: complaints.length,
      pending: complaints.filter(
        (c) => c.status === 'assigned' || c.status === 'submitted' || c.status === 'under_review'
      ).length,
      inProgress: complaints.filter((c) => c.status === 'accepted' || c.status === 'in_progress').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
    };
  }, [complaints]);

  // Filtered & Sorted complaint list
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((c) => {
        if (statusFilter === 'under_review') {
          return c.status === 'submitted' || c.status === 'assigned' || c.status === 'under_review';
        }
        if (statusFilter === 'in_progress') {
          return c.status === 'accepted' || c.status === 'in_progress';
        }
        if (statusFilter === 'resolved') {
          return c.status === 'resolved';
        }
        if (statusFilter === 'rejected') {
          return c.status === 'rejected';
        }
        return true;
      })
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const refMatch = (c.referenceNumber || '').toLowerCase().includes(q);
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const descMatch = (c.description || '').toLowerCase().includes(q);
        return refMatch || titleMatch || descMatch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.submittedAt).getTime();
        const timeB = new Date(b.submittedAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [complaints, statusFilter, searchQuery, sortOrder]);

  return (
    <div className="w-full text-start space-y-8 sm:space-y-10 font-ui civic-kinetic-page">
      {/* Isolated Development & Academic Demonstration Notice */}
      {isDevHarness && (
        <div
          role="status"
          aria-label="Demonstration mode notice"
          className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-950 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-start">
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900">
              {ur ? 'آزمائشی نمائش — فرضی ڈیٹا' : 'Demonstration Harness — Fictional / Test Data Only'}
            </p>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              {ur
                ? 'یہ اسکرین صرف تعلیمی نمائش کے لیے ہے۔ یہ کوئی تصدیق شدہ سیشن نہیں ہے اور نہ ہی حقیقی شہری کا ڈیٹا ہے۔'
                : 'This workspace is isolated for university academic demonstration. It does not represent an authenticated Supabase user session and displays local fictional test data only.'}
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b-2 border-[#D9D3CC]">
        <div className="space-y-1.5">
          <h1
            aria-label={ur ? 'آپ کی شکایات' : 'My Complaints - Your Complaints'}
            className="font-display font-black text-[clamp(1.9rem,3.2vw,3.4rem)] leading-[1.08] text-[#141414] tracking-tight break-words"
          >
            {ur ? 'میری شکایات' : 'My Complaints'}
            {complaints.length > 0 && (
              <span className="inline-block ml-2 sm:ml-3 font-mono font-normal text-base sm:text-xl text-[#681822]">
                ({complaints.length})
              </span>
            )}
          </h1>
          <p className="text-base sm:text-lg text-[#514A43] leading-relaxed break-words">
            {ur
              ? 'اپنی درج شدہ تمام شکایات اور ان کی پیش رفت دیکھیں۔'
              : 'View your submitted complaints and follow their progress.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <Link to="/track" className="w-full sm:w-auto">
            <button
              type="button"
              className="w-full sm:w-auto inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-[#D9D3CC] bg-white px-5 text-sm font-bold text-[#141414] hover:bg-[#FAF9F7] transition cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-[#681822]" />
              <span>{ur ? 'شکایت ٹریک کریں' : 'Track Complaint'}</span>
            </button>
          </Link>

          <Link to="/submit" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PenTool className="w-4 h-4 text-white" />}
              className="w-full tracking-wide text-sm font-bold min-h-[52px] px-6"
            >
              {ur ? 'شکایت درج کریں' : 'New Complaint'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && complaints.length === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#EAE7E2]" />
            ))}
          </div>
          <div className="h-44 rounded-2xl bg-[#EAE7E2] animate-pulse" />
        </div>
      )}

      {/* Main Content Area */}
      {!isLoading && complaints.length > 0 ? (
        <div className="space-y-6">
          {/* Compact Overview Metrics Bar */}
          <div data-scroll-depth className="rounded-[24px] bg-white border-2 border-[#E5E3E0] p-4 sm:p-6 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E3E0] rtl:divide-x-reverse">
              <div className="p-3 sm:p-5 text-start">
                <span className="text-xs sm:text-sm font-bold tracking-wide text-[#645C55] block">
                  {ur ? 'کل شکایات' : 'Total Complaints'}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#141414] mt-2 block">
                  {stats.total}
                </span>
              </div>

              <div className="p-3 sm:p-5 text-start">
                <span className="text-xs sm:text-sm font-bold tracking-wide text-amber-800 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {ur ? 'زیرِ جائزہ' : 'Pending Review'}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-amber-900 mt-2 block">
                  {stats.pending}
                </span>
              </div>

              <div className="p-3 sm:p-5 text-start">
                <span className="text-xs sm:text-sm font-bold tracking-wide text-blue-800 block flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  {ur ? 'زیرِ کارروائی' : 'In Progress'}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-blue-900 mt-2 block">
                  {stats.inProgress}
                </span>
              </div>

              <div className="p-3 sm:p-5 text-start">
                <span className="text-xs sm:text-sm font-bold tracking-wide text-emerald-800 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {ur ? 'حل شدہ' : 'Resolved'}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-900 mt-2 block">
                  {stats.resolved}
                </span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className={`w-4 h-4 text-[#88827A] absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ur ? 'حوالہ نمبر یا عنوان سے تلاش کریں…' : 'Search by reference or title…'}
                className={`w-full min-h-[52px] rounded-xl border-2 border-[#D9D3CC] bg-white py-3 text-base placeholder:text-[#88827A] focus:border-[#681822] focus:outline-none focus:ring-1 focus:ring-[#681822] shadow-xs ${
                  isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
                }`}
              />
            </div>

            {/* Filter Pills & Sort Selector */}
            <div className="flex min-w-0 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl bg-white border border-[#D9D3CC] p-1 shadow-xs sm:inline-flex sm:w-auto">
                {(['all', 'under_review', 'in_progress', 'resolved'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`min-w-0 rounded-lg px-2 py-2.5 text-xs leading-snug font-bold transition cursor-pointer select-none sm:px-4 sm:text-sm ${
                      statusFilter === status
                        ? 'bg-[#681822] text-white shadow-xs'
                        : 'text-[#5A554E] hover:text-[#141414] hover:bg-[#FAF9F7]'
                    }`}
                  >
                    {status === 'all'
                      ? ur ? 'تمام' : 'All'
                      : status === 'under_review'
                      ? ur ? 'زیرِ جائزہ' : 'Under Review'
                      : status === 'in_progress'
                      ? ur ? 'زیرِ کارروائی' : 'In Progress'
                      : ur ? 'حل شدہ' : 'Resolved'}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="w-full sm:w-auto min-h-[46px] rounded-xl border-2 border-[#D9D3CC] bg-white px-3 py-2 text-sm font-bold text-[#141414] focus:border-[#681822] focus:outline-none shadow-xs cursor-pointer"
                aria-label={ur ? 'ترتیب دیں' : 'Sort complaints'}
              >
                <option value="newest">{ur ? 'تازہ ترین پہلے' : 'Newest First'}</option>
                <option value="oldest">{ur ? 'پرانی پہلے' : 'Oldest First'}</option>
              </select>
            </div>
          </div>

          {/* Complaints List Grid */}
          {filteredComplaints.length > 0 ? (
            <div className={`grid grid-cols-1 ${filteredComplaints.length > 1 ? 'lg:grid-cols-2' : ''} gap-5 sm:gap-7 pt-1`}>
              {filteredComplaints.map((c) => (
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
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-[#E5E3E0] text-center space-y-3">
              <p className="text-sm font-bold text-[#141414]">
                {ur ? 'کوئی شکایت نہیں ملی' : 'No matching complaints found'}
              </p>
              <p className="text-xs text-[#88827A]">
                {ur
                  ? 'آپ کی تلاش یا فلٹر کے مطابق کوئی شکایت موجود نہیں ہے۔'
                  : 'Try clearing your search query or selecting a different filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs font-bold text-[#681822] underline cursor-pointer"
              >
                {ur ? 'فلٹرز ختم کریں' : 'Reset filters'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Honest Civic Empty State (Preserves Test Assertions) */
        <div className="p-8 sm:p-16 rounded-3xl bg-white border border-[#E5E3E0] text-center max-w-xl mx-auto my-8 space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF9F7] border border-[#E5E3E0] flex items-center justify-center mx-auto text-[#681822]">
            <FolderOpen className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-[#141414] tracking-tight">
              {ur ? 'ابھی کوئی شکایت نہیں۔' : 'No complaints yet.'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5A554E] max-w-md mx-auto leading-relaxed">
              {ur
                ? 'ابھی آپ کے اکاؤنٹ سے کوئی شکایت منسلک نہیں ہے۔ آپ نئی شکایت درج کروا سکتے ہیں یا مہمان شکایت منسلک کر سکتے ہیں۔'
                : 'No complaint is linked to this account yet. You can submit a new complaint or claim a guest complaint.'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link to="/submit">
              <Button
                variant="primary"
                size="md"
                rightIcon={isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                className="text-xs font-bold px-6"
              >
                {ur ? 'شکایت درج کریں' : 'Write Complaint'}
              </Button>
            </Link>

            <Link to="/track">
              <button
                type="button"
                className="min-h-10 rounded-xl border border-[#D9D3CC] bg-white px-5 text-xs font-bold text-[#141414] hover:bg-[#FAF9F7] transition cursor-pointer"
              >
                {ur ? 'شکایت ٹریک کریں' : 'Track Complaint'}
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Case Details Dialog */}
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
