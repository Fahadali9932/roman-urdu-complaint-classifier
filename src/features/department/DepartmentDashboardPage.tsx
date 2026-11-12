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
  type DepartmentFilterType,
} from './components/DepartmentSidebar';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { Loader2, CheckCircle2 } from 'lucide-react';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, departmentMeta, isAuthenticated } = useDepartmentAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();

  const [complaints, setComplaints] = useState<DepartmentComplaintView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<DepartmentFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/department/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load complaints for current department
  useEffect(() => {
    let isCancelled = false;
    const fetchComplaints = async () => {
      setIsLoading(true);
      try {
        const data = await complaintService.getDepartmentComplaints(departmentId);
        if (!isCancelled) {
          setComplaints(data);

          // Resolve initial selected reference from URL or default to first on desktop
          const queryRef = searchParams.get('ref') || urlRef;
          if (queryRef) {
            const match = data.find(
              (c) => c.referenceNumber.toUpperCase() === queryRef.trim().toUpperCase()
            );
            if (match) {
              setSelectedReference(match.referenceNumber);
              return;
            }
          }

          // On desktop (>= 768px), auto-select first complaint for master-detail view.
          // On mobile (< 768px), start on the inbox list so the officer sees grievances first.
          const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
          if (isDesktop && data.length > 0) {
            setSelectedReference(data[0].referenceNumber);
          } else {
            setSelectedReference(null);
          }
        }
      } catch (err) {
        console.error('Failed to load complaints:', err);
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

  // Dismiss notification toast after 4s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Calculate counts for sidebar filters
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
      rejected: complaints.filter((c) => c.status === 'rejected').length,
    };
  }, [complaints]);

  // Filter complaints according to activeFilter and searchQuery
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Filter by status tab
      if (activeFilter === 'new') {
        if (c.status !== 'submitted' && c.status !== 'under_review') return false;
      } else if (activeFilter === 'in_progress') {
        if (c.status !== 'assigned' && c.status !== 'in_progress') return false;
      } else if (activeFilter === 'resolved') {
        if (c.status !== 'resolved') return false;
      } else if (activeFilter === 'rejected') {
        if (c.status !== 'rejected') return false;
      }

      // Filter by search query
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

  // Active selected complaint object
  const selectedComplaint = useMemo(() => {
    if (!selectedReference) return null;
    return (
      complaints.find((c) => c.referenceNumber === selectedReference) || null
    );
  }, [complaints, selectedReference]);

  // Handle successful status update from modal or quick action
  const handleComplaintUpdated = (updated: DepartmentComplaintView) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    setNotification({
      message: `${updated.referenceNumber} status updated to ${updated.status.replace('_', ' ')}`,
      type: 'success',
    });
  };

  // Quick status update without full modal
  const handleQuickStatusUpdate = async (newStatus: ComplaintStatus) => {
    if (!selectedComplaint) return;
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

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#141414] flex flex-col relative selection:bg-[#681822]/20">
      {/* Subtle Atmospheric Warm Glow at upper background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-70 z-0"
        style={{
          background:
            'radial-gradient(1200px circle at 50% -20%, rgba(212, 160, 23, 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Top Header */}
      <DepartmentHeader />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#141414] text-[#FFFFFF] shadow-xl text-xs font-medium animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-8 h-8 text-[#681822] animate-spin mb-3" />
            <p className="text-xs text-[#737373]">
              Loading {departmentMeta.name} workspace...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch">
            {/* Desktop Left Sidebar: Always visible on large screens */}
            <div className="hidden lg:block">
              <DepartmentSidebar
                activeFilter={activeFilter}
                onSelectFilter={(f) => {
                  setActiveFilter(f);
                }}
                counts={counts}
              />
            </div>

            {/* Mobile / Tablet Filter Pills */}
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
                  {
                    id: 'rejected',
                    label: t('deptFilterRejected'),
                    count: counts.rejected,
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
                        ? 'bg-[#681822] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#E5E3E0] text-[#141414] hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                          : 'bg-[#F0EDE6] text-[#555555]'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Master-Detail Container */}
            <div className="flex-1 flex flex-col md:flex-row gap-5 items-stretch min-h-[600px]">
              {/* Inbox List Pane:
                  On mobile: visible if no complaint selected OR if viewing list.
                  On desktop: always visible as middle column.
              */}
              <div
                className={`w-full md:w-80 lg:w-96 flex flex-col ${
                  selectedReference ? 'hidden md:flex' : 'flex'
                }`}
              >
                <ComplaintInboxList
                  complaints={filteredComplaints}
                  selectedReference={selectedReference}
                  onSelectComplaint={(ref) => setSelectedReference(ref)}
                  searchQuery={searchQuery}
                  onSearchChange={(q) => setSearchQuery(q)}
                />
              </div>

              {/* Detail View Pane:
                  On mobile: visible only when complaint selected.
                  On desktop: always visible as main column.
              */}
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

      {/* Status Update Modal */}
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
