import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Inbox, Loader2 } from 'lucide-react';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services/MockComplaintService';
import { type ComplaintStatus, type DepartmentComplaintView } from '../../types';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { DepartmentHeader } from './components/DepartmentHeader';
import { DepartmentSidebar, type DepartmentStatusFilter } from './components/DepartmentSidebar';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, isAuthenticated } = useDepartmentAuth();
  const { language, t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<DepartmentComplaintView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DepartmentStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [unauthorizedRefError, setUnauthorizedRefError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !departmentId) navigate('/department/login', { replace: true });
  }, [departmentId, isAuthenticated, navigate]);

  useEffect(() => {
    if (!departmentId) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setUnauthorizedRefError(null);
      try {
        const data = await complaintService.getDepartmentComplaints(departmentId);
        if (cancelled) return;
        setComplaints(data);
        const targetRef = searchParams.get('ref') || urlRef;
        if (targetRef) {
          const normalized = targetRef.trim().toUpperCase();
          const match = data.find((complaint) => complaint.referenceNumber.toUpperCase() === normalized);
          if (match) {
            setSelectedReference(match.referenceNumber);
            return;
          }
          const globalComplaint = await complaintService.getComplaintByReference(normalized);
          if (globalComplaint && globalComplaint.assignedDepartmentId !== departmentId) {
            setUnauthorizedRefError(normalized);
          }
        }
        setSelectedReference(typeof window !== 'undefined' && window.innerWidth >= 1280 && data.length > 0 ? data[0].referenceNumber : null);
      } catch (error) {
        console.error('Failed to load department complaints:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [departmentId, searchParams, urlRef]);

  const counts = useMemo(() => ({
    all: complaints.length,
    new: complaints.filter((complaint) => complaint.status === 'submitted' || complaint.status === 'under_review').length,
    in_progress: complaints.filter((complaint) => complaint.status === 'assigned' || complaint.status === 'in_progress').length,
    resolved: complaints.filter((complaint) => complaint.status === 'resolved').length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => complaints.filter((complaint) => {
    if (activeFilter === 'new' && complaint.status !== 'submitted' && complaint.status !== 'under_review') return false;
    if (activeFilter === 'in_progress' && complaint.status !== 'assigned' && complaint.status !== 'in_progress') return false;
    if (activeFilter === 'resolved' && complaint.status !== 'resolved') return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [complaint.referenceNumber, complaint.locality, complaint.district, complaint.title, complaint.description]
      .some((value) => value.toLowerCase().includes(query));
  }), [activeFilter, complaints, searchQuery]);

  const selectedComplaint = useMemo(
    () => complaints.find((complaint) => complaint.referenceNumber === selectedReference) || null,
    [complaints, selectedReference]
  );

  const handleComplaintUpdated = (updated: DepartmentComplaintView) => {
    setComplaints((current) => current.map((complaint) => complaint.id === updated.id ? updated : complaint));
  };
  const handleQuickStatusUpdate = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint || !departmentId) return;
    try {
      const result = await complaintService.updateComplaintStatus(departmentId, selectedComplaint.referenceNumber, newStatus);
      if (result.success) handleComplaintUpdated(result.complaint);
    } catch (error) {
      console.error('Quick status update failed:', error);
    }
  };

  if (!isAuthenticated || !departmentId) return null;

  const mobileFilters: { id: DepartmentStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('deptFilterAll'), count: counts.all },
    { id: 'new', label: t('deptFilterNew'), count: counts.new },
    { id: 'in_progress', label: t('deptFilterInProgress'), count: counts.in_progress },
    { id: 'resolved', label: t('deptFilterResolved'), count: counts.resolved },
  ];

  return (
    <div className="dept-workspace-root dept-dashboard-root" data-department={departmentId} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="dept-dashboard-frame flex">
        <DepartmentSidebar activeFilter={activeFilter} onSelectFilter={setActiveFilter} counts={counts} />
        <div className="min-w-0 flex flex-1 flex-col">
          <DepartmentHeader />
          <main className="flex flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h1 className="dept-workspace-title text-2xl font-bold tracking-[-.035em] sm:text-[28px]">{t('deptWorkspaceTitle')}</h1>
                <p className="mt-1 text-sm leading-6 text-[var(--dept-muted)]">{t('deptWorkspaceSubtitle')}</p>
              </div>
              <span className="hidden rounded-lg bg-[var(--dept-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--dept-primary)] sm:block">
                {complaints.length} {language === 'ur' ? 'شکایات' : complaints.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {unauthorizedRefError && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
                <span><strong>{t('deptAccessDenied')}</strong> ({unauthorizedRefError})</span>
                <button type="button" onClick={() => setUnauthorizedRefError(null)} className="shrink-0 font-semibold underline">Dismiss</button>
              </div>
            )}

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {mobileFilters.map((filter) => (
                <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className={'shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ' + (activeFilter === filter.id ? 'border-[var(--dept-primary)] bg-[var(--dept-primary)] text-white' : 'border-[var(--dept-border)] bg-white text-[var(--dept-ink)]')}>
                  {filter.label} <span className="ml-1 opacity-75">{filter.count}</span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                <Loader2 className="mb-3 h-6 w-6 animate-spin text-[var(--dept-primary)]" />
                <p className="text-sm text-[var(--dept-muted)]">{language === 'ur' ? 'تفویض کردہ شکایات لوڈ ہو رہی ہیں…' : 'Loading assigned complaints…'}</p>
              </div>
            ) : complaints.length === 0 ? (
              <section className="flex min-h-[360px] flex-1 flex-col items-center justify-center border-t border-[var(--dept-border)] px-6 text-center">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dept-tint)] text-[var(--dept-primary)]"><Inbox className="h-5 w-5" /></span>
                <h2 className="text-lg font-bold tracking-[-.02em] text-[var(--dept-ink)]">{t('deptEmptyAssigned')}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--dept-muted)]">{t('deptEmptyPrompt')}</p>
              </section>
            ) : (
              <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
                <section className={selectedReference ? 'hidden min-h-0 xl:block' : 'min-h-0'}>
                  <ComplaintInboxList complaints={filteredComplaints} totalAssignedCount={complaints.length} selectedReference={selectedReference} onSelectComplaint={setSelectedReference} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                </section>
                <section className={selectedReference ? 'min-h-0' : 'hidden min-h-0 xl:block'}>
                  <ComplaintDetailView complaint={selectedComplaint} onOpenStatusModal={() => setIsStatusModalOpen(true)} onQuickStatusUpdate={handleQuickStatusUpdate} onBackToList={() => setSelectedReference(null)} />
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
      {selectedComplaint && <StatusUpdateModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} complaint={selectedComplaint} onUpdated={handleComplaintUpdated} />}
    </div>
  );
};
