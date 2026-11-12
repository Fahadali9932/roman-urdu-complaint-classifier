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
import { Loader2 } from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, isAuthenticated } = useDepartmentAuth();
  const { t } = useLanguage();
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

  // Authentication guard: if unauthenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated || !departmentId) {
      navigate('/department/login', { replace: true });
    }
  }, [isAuthenticated, departmentId, navigate]);

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

          // Desktop: auto-select first complaint if available
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
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
    <div className="dept-workspace-root flex flex-col relative selection:bg-[#2C4A52]/20">
      {/* Subtle Upper Atmosphere Slate Tint */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] opacity-40 z-0"
        style={{
          background:
            'radial-gradient(1000px circle at 50% -10%, rgba(44, 74, 82, 0.08) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Header */}
      <DepartmentHeader />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 flex flex-col">
        {/* Workspace Title & Supporting Line */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1E21]">
            {t('deptWorkspaceTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#5B646B] mt-0.5">
            {t('deptWorkspaceSubtitle')}
          </p>
        </div>

        {/* Unauthorized Tampering Alert */}
        {unauthorizedRefError && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>{t('deptAccessDenied')}</strong> ({unauthorizedRefError})
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-6 h-6 text-[#122E32] animate-spin mb-2" />
            <p className="text-xs text-[#5B646B]">Loading assigned complaints...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch">
            {/* Desktop Left Navigation */}
            <div className="hidden lg:block">
              <DepartmentSidebar
                activeFilter={activeFilter}
                onSelectFilter={(f) => setActiveFilter(f)}
                counts={counts}
              />
            </div>

            {/* Mobile / Tablet Filter Bar */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#122E32] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#E1E4E6] text-[#0F1E21] hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                          : 'bg-[#F4F6F6] text-[#5B646B]'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Main Workspace (Inbox List + Detail View) */}
            <div className="flex-1 flex flex-col md:flex-row gap-5 items-stretch min-h-[560px]">
              {/* Inbox List: On mobile visible if no complaint selected */}
              <div
                className={`w-full md:w-80 lg:w-[380px] flex flex-col ${
                  selectedReference ? 'hidden md:flex' : 'flex'
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

              {/* Detail View: On mobile visible when complaint selected */}
              <div
                className={`flex-1 flex flex-col ${
                  !selectedReference ? 'hidden md:flex' : 'flex'
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
