import React, { useState, useEffect } from 'react';
import { StatsCard } from '../../components/citizen/StatsCard';
import { ComplaintCard } from '../../components/citizen/ComplaintCard';
import { EmptyState } from '../../components/citizen/EmptyState';
import { Button } from '../../components/common/Button';
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
    if (activeFilter === 'all') return true;
    if (activeFilter === 'under_review') {
      return c.status === 'submitted' || c.status === 'under_review';
    }
    return c.status === activeFilter;
  });

  return (
    <div className="space-y-8 text-start">
      {/* Page Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Citizen Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('dashTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {t('dashSubtitle')}
          </p>
        </div>

        <Link to="/submit">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {t('navSubmit')}
          </Button>
        </Link>
      </div>

      {/* Explicit Demonstration Banner */}
      <AlertBanner type="warning" title="Demonstration Environment">
        {t('dashDemoBanner')} Personal citizen accounts and Supabase authentication will be active in Phase 2.
      </AlertBanner>

      {/* Overview Statistics Cards */}
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

      {/* Recent Complaints Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {t('dashRecentTitle')}
          </h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 me-1 hidden sm:inline flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('dashFilterAll')} ({complaints.length})
            </button>
            <button
              onClick={() => setActiveFilter('under_review')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'under_review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('statPending')}
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'in_progress'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('statInProgress')}
            </button>
            <button
              onClick={() => setActiveFilter('resolved')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('statResolved')}
            </button>
          </div>
        </div>

        {/* Complaints Listing */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading complaints...</div>
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
