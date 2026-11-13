import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services/MockComplaintService';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../types';
import { DepartmentHeader } from './components/DepartmentHeader';
import {
  DepartmentSidebar,
  type DepartmentStatusFilter,
} from './components/DepartmentSidebar';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { Loader2, Inbox } from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, isAuthenticated, checkRevocationStatus } = useDepartmentAuth();
  const { language, t } = useLanguage();
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

  // Authentication & immediate revocation guard
  useEffect(() => {
    if (!isAuthenticated || !departmentId) {
      navigate('/department/login', { replace: true });
      return;
    }
    const revCheck = checkRevocationStatus();
    if (!revCheck.authorized) {
      navigate(
        `/department/login?revoked=true&reason=${encodeURIComponent(revCheck.reason || '')}`,
        { replace: true }
      );
    }
  }, [isAuthenticated, departmentId, checkRevocationStatus, navigate]);

  // Load complaints assigned to the authenticated department
  useEffect(() => {
    if (!departmentId) return;

    let isCancelled = false;
    const fetchComplaints = async () => {
      setIsLoading(true);
      setUnauthorizedRefError(null);
      try {
        const data = await complaintService.getDepartmentComplaints(departmentId);
        if (!isCancelled) {
          setComplaints(data);

          // Handle URL reference deep-link
          const targetRef = searchParams.get('ref') || urlRef;
          if (targetRef) {
            const cleaned = targetRef.trim().toUpperCase();
            const match = data.find(
              (c) => c.referenceNumber.toUpperCase() === cleaned
            );
            if (match) {
              setSelectedReference(match.referenceNumber);
              return;
            } else {
              // Target reference exists in URL but is not assigned to this department
              const globalComplaint = await complaintService.getComplaintByReference(cleaned);
              if (globalComplaint && globalComplaint.assignedDepartmentId !== departmentId) {
                setUnauthorizedRefError(cleaned);
                setSelectedReference(null);
                return;
              }
            }
          }

          // Desktop: auto-select first complaint on widescreen (>= 1024px)
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
          if (isDesktop && data.length > 0) {
            setSelectedReference(data[0].referenceNumber);
          } else {
            setSelectedReference(null);
          }
        }
      } catch (err) {
        console.error('Failed to load department complaints:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchComplaints();
    return () => {
      isCancelled = true;
    };
  }, [departmentId, urlRef, searchParams]);

  // Status counts for filters
  const counts = useMemo(() => {
    return {
      all: complaints.length,
      new: complaints.filter(
        (c) => c.status === 'submitted' || c.status === 'under_review'
      ).length,
      in_progress: complaints.filter(
        (c) => c.status === 'assigned' || c.status === 'in_progress'
      ).length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
    };
  }, [complaints]);

  // Filter complaints according to activeFilter and searchQuery
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Status filter
      if (activeFilter === 'new') {
        if (c.status !== 'submitted' && c.status !== 'under_review') return false;
      } else if (activeFilter === 'in_progress') {
        if (c.status !== 'assigned' && c.status !== 'in_progress') return false;
      } else if (activeFilter === 'resolved') {
        if (c.status !== 'resolved') return false;
      }

      // Search query filter (reference, locality, text)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = c.referenceNumber.toLowerCase().includes(q);
        const matchesLocality = c.locality.toLowerCase().includes(q);
        const matchesDistrict = c.district.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        return matchesRef || matchesLocality || matchesDistrict || matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [complaints, activeFilter, searchQuery]);

  // Selected complaint view
  const selectedComplaint = useMemo(() => {
    if (!selectedReference) return null;
    return (
      complaints.find((c) => c.referenceNumber === selectedReference) || null
    );
  }, [complaints, selectedReference]);

  const handleComplaintUpdated = (updated: DepartmentComplaintView) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleQuickStatusUpdate = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint || !departmentId) return;
    try {
      const res = await complaintService.updateComplaintStatus(
        departmentId,
        selectedComplaint.referenceNumber,
        newStatus
      );
      if (res.success) {
        handleComplaintUpdated(res.complaint);
      }
    } catch (err) {
      console.error('Quick status update failed:', err);
    }
  };

  if (!isAuthenticated || !departmentId) {
    return null;
  }

  return (
    <div className="dept-workspace-root flex flex-col min-h-screen relative selection:bg-[#2C4A52]/20">
      {/* Top Header */}
      <DepartmentHeader />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 relative z-10 flex flex-col">
        {/* Workspace Title & Stats Banner */}
        <div className="mb-5 flex items-baseline justify-between border-b border-[#E1E4E6] pb-3.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1E21]">
              {t('deptWorkspaceTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#5B646B] mt-0.5">
              {t('deptWorkspaceSubtitle')}
            </p>
          </div>

          <div className="text-xs font-semibold text-[#5B646B] bg-[#FFFFFF] border border-[#E1E4E6] px-2.5 py-1 rounded-md shadow-xs">
            {complaints.length} {language === 'ur' ? 'شکایات' : complaints.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        {/* Unauthorized Tampering Alert */}
        {unauthorizedRefError && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-center justify-between">
            <div>
              <strong>{t('deptAccessDenied')}</strong> ({unauthorizedRefError})
            </div>
            <button
              type="button"
              onClick={() => setUnauthorizedRefError(null)}
              className="text-xs font-semibold underline text-amber-900 ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-7 h-7 text-[#122E32] animate-spin mb-2.5" />
            <p className="text-xs text-[#5B646B]">
              Loading assigned complaints...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch">
            {/* Desktop Left Navigation (Starts at exact same top boundary) */}
            <div className="hidden lg:block">
              <DepartmentSidebar
                activeFilter={activeFilter}
                onSelectFilter={(f) => setActiveFilter(f)}
                counts={counts}
              />
            </div>

            {/* Mobile / Tablet Filter Bar */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {(
                [
                  { id: 'all', label: t('deptFilterAll'), count: counts.all },
                  { id: 'new', label: t('deptFilterNew'), count: counts.new },
                  {
                    id: 'in_progress',
                    label: t('deptFilterInProgress'),
                    count: counts.in_progress,
                  },
                  {
                    id: 'resolved',
                    label: t('deptFilterResolved'),
                    count: counts.resolved,
                  },
                ] as const
              ).map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#122E32] text-[#FFFFFF] shadow-xs'
                        : 'bg-[#FFFFFF] border border-[#E1E4E6] text-[#0F1E21] hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                          : 'bg-[#F4F6F6] text-[#5B646B] border border-[#E1E4E6]'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* =========================================================================
                CONTENT-ADAPTIVE WORKSPACE
                STATE A: ZERO COMPLAINTS ASSIGNED
                Integrated directly into the workspace surface alongside the sidebar.
               ========================================================================= */}
            {complaints.length === 0 ? (
              <div className="flex-1 bg-[#FFFFFF] border border-[#E1E4E6] rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-xs min-h-[420px]">
                <div className="w-12 h-12 rounded-xl bg-[#F4F6F6] text-[#687E8B] flex items-center justify-center mx-auto mb-3 border border-[#E1E4E6]">
                  <Inbox className="w-6 h-6" />
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#0F1E21] mb-1">
                  {t('deptEmptyAssigned')}
                </h2>
                <p className="text-xs sm:text-sm text-[#5B646B] max-w-sm leading-relaxed">
                  {t('deptEmptyPrompt')}
                </p>
              </div>
            ) : (
              /* =========================================================================
                 STATE B & C: COMPLAINTS EXIST
                 - Desktop (>= 1024px): Master-Detail side-by-side (~38% inbox / ~62% detail)
                 - Tablet/Mobile (< 1024px): Inbox-first adaptive layout
                 ========================================================================= */
              <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch min-h-[560px]">
                {/* Inbox Column: ~38% width on desktop (>=1024px), full width on mobile/tablet when no selection */}
                <div
                  className={`w-full lg:w-[380px] xl:w-[400px] shrink-0 flex flex-col ${
                    selectedReference ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  <ComplaintInboxList
                    complaints={filteredComplaints}
                    totalAssignedCount={complaints.length}
                    selectedReference={selectedReference}
                    onSelectComplaint={(ref) => setSelectedReference(ref)}
                    searchQuery={searchQuery}
                    onSearchChange={(q) => setSearchQuery(q)}
                  />
                </div>

                {/* Detail View Column: ~62% width on desktop (>=1024px), full width on mobile/tablet when selected */}
                <div
                  className={`flex-1 flex flex-col ${
                    !selectedReference ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  <ComplaintDetailView
                    complaint={selectedComplaint}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onQuickStatusUpdate={handleQuickStatusUpdate}
                    onBackToList={() => setSelectedReference(null)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Status Update Dialog */}
      {selectedComplaint && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          complaint={selectedComplaint}
          onUpdated={handleComplaintUpdated}
        />
      )}
    </div>
  );
};
