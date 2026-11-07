import React, { useState, useEffect } from 'react';
import { StatsCard } from '../../components/citizen/StatsCard';
import { ComplaintCard } from '../../components/citizen/ComplaintCard';
import { EmptyState } from '../../components/citizen/EmptyState';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AlertBanner } from '../../components/common/AlertBanner';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services';
import { type Complaint, type CitizenOverviewStats, type ComplaintStatus } from '../../types';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Clock,
  RefreshCw,
  CheckCircle2,
  PlusCircle,
  Filter,
  Sparkles,
  Search,
  XCircle,
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<CitizenOverviewStats>({
    totalComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
  });
  const [activeFilter, setActiveFilter] = useState<'all' | ComplaintStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      complaintService.getComplaints(),
      complaintService.getOverviewStats(),
    ]).then(([allComplaints, summaryStats]) => {
      if (isMounted) {
        setComplaints(allComplaints);
        setStats(summaryStats);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    // 1. Status Filter
    let matchesStatus = true;
    if (activeFilter !== 'all') {
      if (activeFilter === 'under_review') {
        matchesStatus = c.status === 'submitted' || c.status === 'under_review';
      } else {
        matchesStatus = c.status === activeFilter;
      }
    }

    // 2. Text Search Query Filter
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      matchesSearch =
        c.referenceNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.locality.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
    }

    return matchesStatus && matchesSearch;
  });

  const handleResetFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-start">
      {/* 1. Page Header & Quick Submission Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-900 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-teal-700" aria-hidden="true" />
            <span>Citizen Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('dashTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {t('dashSubtitle')}
          </p>
        </div>

        <Link to="/submit" className="w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-sm"
          >
            {t('navSubmit')}
          </Button>
        </Link>
      </div>

      {/* 2. Demonstration Banner */}
      <AlertBanner type="warning" title="Demonstration Environment">
        {t('dashDemoBanner')} Personal citizen accounts and Supabase authentication will be active in Phase 2.
      </AlertBanner>

      {/* 3. Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label={t('statTotal')}
          value={stats.totalComplaints}
          icon={<Inbox className="w-5 h-5" />}
          variant="slate"
          description="All recorded submissions"
        />
        <StatsCard
          label={t('statPending')}
          value={stats.pendingComplaints}
          icon={<Clock className="w-5 h-5" />}
          variant="blue"
          description="Awaiting initial dispatch"
        />
        <StatsCard
          label={t('statInProgress')}
          value={stats.inProgressComplaints}
          icon={<RefreshCw className="w-5 h-5" />}
          variant="amber"
          description="Under active departmental action"
        />
        <StatsCard
          label={t('statResolved')}
          value={stats.resolvedComplaints}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
          description="Verified completed works"
        />
      </div>

      {/* 4. Recent Complaints Section with Search & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {t('dashRecentTitle')}
          </h2>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <Input
              id="dashboardSearch"
              placeholder={t('dashSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
              rightAction={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    aria-label="Clear search query"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold me-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Filter:
          </span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer min-h-[36px] ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('dashFilterAll')} ({complaints.length})
          </button>
          <button
            onClick={() => setActiveFilter('under_review')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer min-h-[36px] ${
              activeFilter === 'under_review'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('statPending')}
          </button>
          <button
            onClick={() => setActiveFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer min-h-[36px] ${
              activeFilter === 'in_progress'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('statInProgress')}
          </button>
          <button
            onClick={() => setActiveFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer min-h-[36px] ${
              activeFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('statResolved')}
          </button>
        </div>

        {/* Complaints Listing */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading complaints...</div>
        ) : filteredComplaints.length === 0 ? (
          <EmptyState
            title={t('dashEmptyTitle')}
            description={t('dashEmptyDesc')}
            action={
              <Link to="/submit">
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  {t('navSubmit')}
                </Button>
              </Link>
            }
            secondaryAction={
              searchQuery || activeFilter !== 'all' ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  {t('dashClearFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredComplaints.map((item) => (
              <ComplaintCard key={item.id} complaint={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
