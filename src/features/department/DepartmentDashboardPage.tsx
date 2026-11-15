import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { complaintService } from '../../services';
import {
  type DepartmentComplaintView,
  type ComplaintStatus,
} from '../../types';
import {
  DepartmentSidebar,
  type WorkspaceSection,
  type TaskFilterType,
} from './components/DepartmentSidebar';
import { DepartmentTopbar } from './components/DepartmentTopbar';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { PriorityQueuePage } from './components/PriorityQueuePage';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { ReviewAssignmentModal } from './components/ReviewAssignmentModal';
import { CivicSelect, type CivicSelectOption } from './components/CivicSelect';
import {
  calculateComplaintPriority,
  sortComplaints,
  getPriorityQueueCounts,
  type PriorityLevel,
} from '../../lib/priority-engine';
import {
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  ChevronRight,
  Flame,
} from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, departmentMeta, session, isAuthenticated, checkRevocationStatus, signOut } =
    useDepartmentAuth();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();

  // Persistent Theme State: 'light' (DEFAULT) | 'dark'
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('awaaz_dept_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const handleSetTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('awaaz_dept_theme_mode', mode);
    }
  };

  // Persistent Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('awaaz_dept_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('awaaz_dept_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Navigation state (Notifications completely removed)
  const [currentSection, setCurrentSection] = useState<WorkspaceSection>('tasks');
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<
    'newest' | 'oldest' | 'priority_high' | 'priority_low' | 'waiting_longest'
  >('newest');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<DepartmentComplaintView[]>([]);
  const [reviewComplaints, setReviewComplaints] = useState<DepartmentComplaintView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active complaint detail selection
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  // Modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<ComplaintStatus | undefined>(undefined);
  const [unauthorizedRefError, setUnauthorizedRefError] = useState<string | null>(null);

  // Priority overrides state
  const [priorityOverrides, setPriorityOverrides] = useState<
    Record<
      string,
      {
        manualPriority: PriorityLevel;
        manualPriorityReason: string;
        manualPriorityBy: string;
        manualPriorityAt: string;
      }
    >
  >(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('awaaz_dept_priority_overrides');
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Ignore
    }
    return {};
  });

  const handleOverridePriority = async (refNumber: string, newPriority: PriorityLevel, reason: string) => {
    if (departmentId) {
      try {
        await complaintService.overrideComplaintPriority(departmentId, refNumber, newPriority, reason);
      } catch (err: any) {
        console.warn('Backend override call failed, storing locally:', err?.message);
      }
    }

    const updatedRecord = {
      manualPriority: newPriority,
      manualPriorityReason: reason,
      manualPriorityBy: session?.username || 'Staff Officer',
      manualPriorityAt: new Date().toISOString(),
    };

    setPriorityOverrides((prev) => {
      const next = { ...prev, [refNumber]: updatedRecord };
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('awaaz_dept_priority_overrides', JSON.stringify(next));
        }
      } catch {
        // Ignore
      }
      return next;
    });

    if (departmentId) {
      try {
        const refreshed = await complaintService.getDepartmentComplaints(departmentId);
        setComplaints(refreshed);
      } catch {
        // Ignore
      }
    }
  };

  // Authentication & real-time revocation guard
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

  // Load complaints assigned to this department with real-time sync & polling fallback
  useEffect(() => {
    if (!departmentId) return;

    let isCancelled = false;
    const fetchComplaints = async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
      try {
        const assignedRows = await complaintService.getDepartmentComplaints(departmentId);
        if (!isCancelled) {
          setComplaints(assignedRows);
        }

        if (departmentId === 'kmc') {
          try {
            const reviewRows = await complaintService.getReviewQueueComplaints();
            if (!isCancelled) {
              setReviewComplaints(reviewRows);
            }
          } catch {
            // Ignore review queue failures for non-clearinghouse
          }
        }
      } catch {
        // Handled silently for polling
      } finally {
        if (!isCancelled && !options?.silent) {
          setIsLoading(false);
        }
      }
    };

    fetchComplaints();

    // Supabase Realtime channel subscription
    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel(`dept-complaints-${departmentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'complaints',
          },
          () => {
            fetchComplaints({ silent: true });
          }
        )
        .subscribe();
    }

    // Polling fallback
    const pollInterval = window.setInterval(() => {
      fetchComplaints({ silent: true });
    }, 12000);

    return () => {
      isCancelled = true;
      window.clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [departmentId]);

  // Deep-linking: Load requested complaint by reference number
  useEffect(() => {
    const targetRef = urlRef || searchParams.get('ref');
    if (!targetRef || !departmentId) return;

    const findAndSelect = async () => {
      const match = complaints.find(
        (c) => c.referenceNumber.toLowerCase() === targetRef.toLowerCase()
      );
      if (match) {
        setSelectedReference(match.referenceNumber);
        setCurrentSection('tasks');
        setUnauthorizedRefError(null);
        return;
      }

      if (departmentId === 'kmc') {
        const reviewMatch = reviewComplaints.find(
          (c) => c.referenceNumber.toLowerCase() === targetRef.toLowerCase()
        );
        if (reviewMatch) {
          setActiveTaskFilter('under_review');
          setSelectedReference(reviewMatch.referenceNumber);
          setCurrentSection('tasks');
          setUnauthorizedRefError(null);
          return;
        }
      }

      try {
        const fetched = await complaintService.getDepartmentComplaintByReference(
          departmentId,
          targetRef
        );
        if (fetched) {
          if (fetched.status === 'under_review' && departmentId === 'kmc') {
            setActiveTaskFilter('under_review');
          }
          setSelectedReference(fetched.referenceNumber);
          setCurrentSection('tasks');
          setUnauthorizedRefError(null);
        } else {
          setUnauthorizedRefError(targetRef);
          setSelectedReference(null);
        }
      } catch {
        setUnauthorizedRefError(targetRef);
        setSelectedReference(null);
      }
    };

    findAndSelect();
  }, [urlRef, searchParams, complaints, reviewComplaints, departmentId]);

  // Merge manual priority overrides with complaints data
  const augmentedComplaints = useMemo(() => {
    return complaints.map((c) => {
      const override = priorityOverrides[c.referenceNumber];
      if (override) {
        return {
          ...c,
          ...override,
        };
      }
      return c;
    });
  }, [complaints, priorityOverrides]);

  const augmentedReviewComplaints = useMemo(() => {
    return reviewComplaints.map((c) => {
      const override = priorityOverrides[c.referenceNumber];
      if (override) {
        return {
          ...c,
          ...override,
        };
      }
      return c;
    });
  }, [reviewComplaints, priorityOverrides]);

  // Aggregate KPI task counts
  const taskCounts = useMemo(() => {
    const all = augmentedComplaints.length;
    const assigned = augmentedComplaints.filter((c) => c.status === 'assigned').length;
    const accepted = augmentedComplaints.filter((c) => c.status === 'accepted').length;
    const in_progress = augmentedComplaints.filter((c) => c.status === 'in_progress').length;
    const resolved = augmentedComplaints.filter((c) => c.status === 'resolved').length;
    const rejected = augmentedComplaints.filter((c) => c.status === 'rejected').length;
    const under_review = augmentedReviewComplaints.length;

    return {
      all,
      assigned,
      accepted,
      in_progress,
      resolved,
      rejected,
      under_review,
    };
  }, [augmentedComplaints, augmentedReviewComplaints]);

  // Priority Queue counts
  const priorityQueueCounts = useMemo(() => {
    return getPriorityQueueCounts(augmentedComplaints);
  }, [augmentedComplaints]);

  // Filter and sort complaints
  const filteredComplaints = useMemo(() => {
    const source = activeTaskFilter === 'under_review' ? augmentedReviewComplaints : augmentedComplaints;

    const filtered = source.filter((c) => {
      // 1. Status Filter
      if (activeTaskFilter !== 'all') {
        if (c.status !== activeTaskFilter) return false;
      }

      // 2. Priority Filter
      if (priorityFilter !== 'all') {
        const pEval = calculateComplaintPriority(c);
        if (pEval.priority !== priorityFilter) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = c.referenceNumber.toLowerCase().includes(q);
        const locMatch = `${c.district} ${c.locality} ${c.publicLocation || ''}`.toLowerCase().includes(q);
        const textMatch = (c.description || '').toLowerCase().includes(q) || (c.generatedHeading || '').toLowerCase().includes(q);
        return refMatch || locMatch || textMatch;
      }

      return true;
    });

    return sortComplaints(filtered, sortOrder);
  }, [
    augmentedComplaints,
    augmentedReviewComplaints,
    activeTaskFilter,
    priorityFilter,
    searchQuery,
    sortOrder,
  ]);

  // Selected complaint view
  const selectedComplaint = useMemo(() => {
    if (!selectedReference) return null;
    return (
      filteredComplaints.find((c) => c.referenceNumber === selectedReference) ||
      augmentedComplaints.find((c) => c.referenceNumber === selectedReference) ||
      augmentedReviewComplaints.find((c) => c.referenceNumber === selectedReference) ||
      null
    );
  }, [filteredComplaints, augmentedComplaints, augmentedReviewComplaints, selectedReference]);

  const handleComplaintUpdated = (updated: DepartmentComplaintView) => {
    setComplaints((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      if (updated.assignedDepartmentId === departmentId) {
        return [updated, ...prev];
      }
      return prev;
    });
    setReviewComplaints((prev) => prev.filter((c) => c.id !== updated.id));
    if (updated.assignedDepartmentId === departmentId) {
      if (updated.status === 'assigned') {
        setActiveTaskFilter('assigned');
      }
      setSelectedReference(updated.referenceNumber);
    }
  };

  const getCategoryTitle = () => {
    if (activeTaskFilter === 'under_review') return 'Classification Review Queue';
    return 'Complaints';
  };

  // Radix select options
  const sortOptions: CivicSelectOption[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'priority_high', label: 'Highest priority first' },
    { value: 'priority_low', label: 'Lowest priority first' },
    { value: 'waiting_longest', label: 'Longest waiting first' },
  ];

  // Horizontal status tabs
  const statusTabs = [
    { id: 'all' as TaskFilterType, label: 'All Complaints', count: taskCounts.all },
    { id: 'assigned' as TaskFilterType, label: 'Pending Acceptance', count: taskCounts.assigned },
    { id: 'accepted' as TaskFilterType, label: 'Accepted', count: taskCounts.accepted },
    { id: 'in_progress' as TaskFilterType, label: 'In Progress', count: taskCounts.in_progress },
    { id: 'resolved' as TaskFilterType, label: 'Work Done', count: taskCounts.resolved },
    { id: 'rejected' as TaskFilterType, label: 'Rejected', count: taskCounts.rejected },
  ];

  return (
    <div
      data-testid="department-workspace"
      data-dept-theme={departmentId}
      data-dept-mode={themeMode}
      className="dept-workspace-wrap w-full h-screen h-[100dvh] flex flex-col overflow-hidden font-sans m-0 p-0 select-text"
    >
      {/* Top Navigation Bar (Consistent across desktop, tablet, mobile) */}
      <DepartmentTopbar
        currentSection={currentSection}
        activeTaskFilter={activeTaskFilter}
        selectedReference={selectedReference}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        themeMode={themeMode}
        onToggleTheme={() => handleSetTheme(themeMode === 'light' ? 'dark' : 'light')}
        onSignOut={() => {
          signOut();
          navigate('/department/login');
        }}
      />

      {/* Main Operational Shell */}
      <div className="dept-shell w-full flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative z-10">
        {/* Left Collapsible Sidebar (Desktop) */}
        <aside
          className={`hidden md:flex ${
            isSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[248px] min-w-[248px]'
          } h-full dept-sidebar shrink-0 overflow-y-auto`}
        >
          <DepartmentSidebar
            currentSection={currentSection}
            onSelectSection={(sec) => {
              setCurrentSection(sec);
              setSelectedReference(null);
            }}
            activeTaskFilter={activeTaskFilter}
            onSelectTaskFilter={(filter) => {
              setCurrentSection('tasks');
              setActiveTaskFilter(filter);
              setSelectedReference(null);
            }}
            complaintsCount={taskCounts.all}
            priorityCount={priorityQueueCounts.total}
            reviewCount={taskCounts.under_review}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
          />
        </aside>

        {/* Mobile Slide-Over Navigation Drawer */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex md:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsMobileDrawerOpen(false);
            }}
          >
            <div className="w-[260px] h-full bg-[var(--dept-sidebar-bg)] border-r border-[var(--dept-border)] shadow-2xl p-0 animate-in slide-in-from-left duration-200">
              <DepartmentSidebar
                currentSection={currentSection}
                onSelectSection={(sec) => {
                  setCurrentSection(sec);
                  setSelectedReference(null);
                  setIsMobileDrawerOpen(false);
                }}
                activeTaskFilter={activeTaskFilter}
                onSelectTaskFilter={(filter) => {
                  setCurrentSection('tasks');
                  setActiveTaskFilter(filter);
                  setSelectedReference(null);
                  setIsMobileDrawerOpen(false);
                }}
                complaintsCount={taskCounts.all}
                priorityCount={priorityQueueCounts.total}
                reviewCount={taskCounts.under_review}
                onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Full-Width Content Canvas */}
        <main className="dept-main flex-1 flex flex-col min-w-0 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto dept-scrollbar">
          {/* Unauthorized Reference Warning */}
          {unauthorizedRefError && (
            <div
              className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between shrink-0"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Municipal Boundary Segregation Alert:</strong> Reference{' '}
                  <span className="font-mono font-bold">{unauthorizedRefError}</span> is not assigned to your agency. Data access is restricted under local RLS policy.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedRefError(null)}
                className="text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 p-1 cursor-pointer"
                aria-label="Dismiss warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SECTION 1: TASKS / COMPLAINTS */}
          {currentSection === 'tasks' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* VIEW A: SEPARATE FULL-PAGE COMPLAINT DETAIL VIEW */}
              {selectedReference && selectedComplaint ? (
                <ComplaintDetailView
                  complaint={selectedComplaint}
                  onOpenStatusModal={(status) => {
                    setModalInitialStatus(status);
                    setIsStatusModalOpen(true);
                  }}
                  onBackToList={() => setSelectedReference(null)}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                  onOverridePriority={handleOverridePriority}
                />
              ) : (
                /* VIEW B: FULL-WIDTH COMPLAINT LISTING PAGE */
                <div className="w-full max-w-7xl mx-auto space-y-5">
                  {/* Page Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--dept-border)]">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
                        {getCategoryTitle()}
                      </h1>
                      <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
                        {activeTaskFilter === 'under_review'
                          ? `${filteredComplaints.length} complaints awaiting clearinghouse classification review.`
                          : 'Manage and track complaints assigned to your department.'}
                      </p>
                    </div>

                    {/* Quick Count Badge */}
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--dept-text-primary)] bg-[var(--dept-surface)] px-3 py-1.5 rounded-lg border border-[var(--dept-border)] shadow-2xs font-bold">
                      <span>{filteredComplaints.length} complaints</span>
                    </div>
                  </div>

                  {/* Horizontal Status Tabs (Section 11.2) - Shown for standard complaints view */}
                  {activeTaskFilter !== 'under_review' && (
                    <div className="flex items-center gap-1.5 border-b border-[var(--dept-border)] pb-2 overflow-x-auto dept-scrollbar">
                      {statusTabs.map((tab) => {
                        const isSelected = activeTaskFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTaskFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[var(--dept-accent)] text-white shadow-xs'
                                : 'text-[var(--dept-text-secondary)] hover:bg-[var(--dept-surface-subtle)] hover:text-[var(--dept-text-primary)]'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)] border border-[var(--dept-border)]'
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search & Accessible Filter Controls Bar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="flex-1 max-w-md relative">
                      <div className="h-9 px-3 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] focus-within:border-[var(--dept-accent)] transition-colors flex items-center gap-2 text-[var(--dept-text-muted)] focus-within:text-[var(--dept-text-primary)] shadow-2xs">
                        <Search className="w-4 h-4 shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by reference, locality, or keyword..."
                          className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-[var(--dept-text-primary)] placeholder:text-[var(--dept-text-muted)]"
                          aria-label="Search complaints"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] p-0.5 cursor-pointer"
                            aria-label="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Controls: Sort Dropdown */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <CivicSelect
                        id="dept-sort"
                        label="Sort:"
                        value={sortOrder}
                        onValueChange={(val) => setSortOrder(val as any)}
                        options={sortOptions}
                        ariaLabel="Sort complaints"
                      />
                    </div>
                  </div>

                  {/* Full-Width Complaints Table */}
                  {isLoading ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-8 h-8 text-[var(--dept-accent)] animate-spin mb-3" />
                      <p className="text-xs font-semibold text-[var(--dept-text-muted)]">
                        Loading complaints from Supabase...
                      </p>
                    </div>
                  ) : (
                    <ComplaintInboxList
                      complaints={filteredComplaints}
                      selectedReference={selectedReference}
                      onSelectComplaint={(ref) => setSelectedReference(ref)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION: PRIORITY QUEUE (Selective Evidence-Based Triage) */}
          {currentSection === 'priority_queue' && (
            <div className="flex-1 flex flex-col min-h-0">
              {selectedReference && selectedComplaint ? (
                <ComplaintDetailView
                  complaint={selectedComplaint}
                  onOpenStatusModal={(status) => {
                    setModalInitialStatus(status);
                    setIsStatusModalOpen(true);
                  }}
                  onBackToList={() => setSelectedReference(null)}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                  onOverridePriority={handleOverridePriority}
                />
              ) : (
                <div className="w-full max-w-7xl mx-auto">
                  <PriorityQueuePage
                    complaints={augmentedComplaints}
                    departmentId={departmentId!}
                    selectedReference={selectedReference}
                    onSelectComplaint={(ref) => setSelectedReference(ref)}
                  />
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: OPERATIONAL DASHBOARD */}
          {currentSection === 'dashboard' && (
            <div className="w-full max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
                  Operational Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
                  Real-time municipal workload distribution and priority telemetry.
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Pending Acceptance */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('assigned');
                    setPriorityFilter('all');
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs hover:border-[var(--dept-accent)] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                    <span>Pending Acceptance</span>
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors">
                    {taskCounts.assigned}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Awaiting field dispatch</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 2. Priority Escalations */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('priority_queue');
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-rose-200 dark:border-rose-900/50 shadow-xs hover:border-rose-400 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300 mb-2">
                    <span>Priority Escalations</span>
                    <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-rose-600 transition-colors">
                    {priorityQueueCounts.total}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Open in Priority Queue</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 3. In Progress / Active */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('in_progress');
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs hover:border-[var(--dept-accent)] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                    <span>In Progress</span>
                    <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors">
                    {taskCounts.in_progress}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Active remediation</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 4. Work Done */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('resolved');
                    setPriorityFilter('all');
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs hover:border-emerald-500 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                    <span>Work Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-emerald-600 transition-colors">
                    {taskCounts.resolved}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Remediated complaints</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>

              {/* Review Queue (KMC Only) */}
              {departmentId === 'kmc' && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('under_review');
                    setSelectedReference(null);
                  }}
                  className="w-full p-5 rounded-xl bg-[var(--dept-surface)] border border-purple-200 dark:border-purple-800 shadow-xs hover:border-purple-400 transition-all text-left cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-purple-600" />
                      <span>Classification Review Queue</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-[var(--dept-text-primary)]">
                      {taskCounts.under_review} complaints
                    </div>
                    <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                      Unassigned municipal complaints awaiting clearinghouse departmental routing.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[var(--dept-text-muted)] group-hover:text-purple-600 transition-colors" />
                </button>
              )}

              {/* Recently Assigned Complaints Section */}
              <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--dept-border)] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--dept-text-primary)]">
                      Recently Assigned Complaints
                    </h2>
                    <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                      Latest complaints assigned under your department's jurisdiction.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSection('tasks');
                      setActiveTaskFilter('all');
                      setSelectedReference(null);
                    }}
                    className="text-xs font-semibold text-[var(--dept-accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View all complaints</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-[var(--dept-separator)]">
                  {augmentedComplaints.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedReference(c.referenceNumber);
                        setCurrentSection('tasks');
                      }}
                      className="px-5 py-3 hover:bg-[var(--dept-surface-hover)] transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--dept-text-primary)] truncate">
                          {c.generatedHeading || c.title || 'Municipal Complaint'}
                        </div>
                        <div className="text-[11px] text-[var(--dept-text-secondary)] truncate">
                          {c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-[var(--dept-text-primary)]">
                          {c.referenceNumber}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--dept-text-muted)]" />
                      </div>
                    </div>
                  ))}
                  {augmentedComplaints.length === 0 && (
                    <div className="p-8 text-center text-xs text-[var(--dept-text-muted)]">
                      No complaints currently assigned to this department.
                    </div>
                  )}
                </div>
              </div>

              {/* Department Workload Integrity Card */}
              <div className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Department Workload Integrity & Isolation</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] leading-relaxed">
                  All metrics are compiled strictly from live complaints assigned to your authorized municipal agency. Zero cross-department telemetry is surfaced, preserving strict administrative segregation under Karachi municipal protocol.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: SETTINGS */}
          {currentSection === 'settings' && (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
                  Settings
                </h1>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
                  Workspace preferences, theme appearance, and staff credentials.
                </p>
              </div>

              {/* 1. Theme Appearance Selection (Light Default vs Dark) */}
              <div className="p-5 sm:p-6 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--dept-text-primary)]">
                    Appearance
                  </h2>
                  <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                    Select your preferred workspace theme. Light mode is the standard civic default.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  {/* Light Mode Button */}
                  <button
                    type="button"
                    onClick={() => handleSetTheme('light')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      themeMode === 'light'
                        ? 'border-[var(--dept-accent)] bg-[var(--dept-surface-selected)] ring-1 ring-[var(--dept-accent)]'
                        : 'border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] hover:border-[var(--dept-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-600 shadow-2xs">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--dept-text-primary)]">
                          Light Mode
                        </div>
                        <div className="text-[11px] text-[var(--dept-text-muted)]">
                          Default civic palette
                        </div>
                      </div>
                    </div>
                    {themeMode === 'light' && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--dept-accent)]" />
                    )}
                  </button>

                  {/* Dark Mode Button */}
                  <button
                    type="button"
                    onClick={() => handleSetTheme('dark')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      themeMode === 'dark'
                        ? 'border-[var(--dept-accent)] bg-[var(--dept-surface-selected)] ring-1 ring-[var(--dept-accent)]'
                        : 'border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] hover:border-[var(--dept-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400 shadow-2xs">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--dept-text-primary)]">
                          Dark Mode
                        </div>
                        <div className="text-[11px] text-[var(--dept-text-muted)]">
                          Night shift console
                        </div>
                      </div>
                    </div>
                    {themeMode === 'dark' && (
                      <CheckCircle2 className="w-4 h-4 text-[var(--dept-accent)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Sidebar Navigation Preference */}
              <div className="p-5 sm:p-6 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--dept-text-primary)]">
                    Sidebar Navigation Preference
                  </h2>
                  <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                    Configure your preferred default sidebar width on desktop screens.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSidebarCollapse}
                    className="px-4 py-2 rounded-lg border border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] hover:bg-[var(--dept-surface-hover)] text-xs font-semibold text-[var(--dept-text-primary)] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSidebarCollapsed ? (
                      <>
                        <PanelLeftOpen className="w-4 h-4 text-[var(--dept-accent)]" />
                        <span>Expand Sidebar (248px)</span>
                      </>
                    ) : (
                      <>
                        <PanelLeftClose className="w-4 h-4 text-[var(--dept-accent)]" />
                        <span>Collapse Sidebar (72px)</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-[var(--dept-text-muted)] font-medium">
                    Currently: {isSidebarCollapsed ? 'Collapsed (Icons only)' : 'Expanded (Full Labels)'}
                  </span>
                </div>
              </div>

              {/* 3. Account Information & Municipal Boundary */}
              <div className="p-5 sm:p-6 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--dept-text-primary)]">
                    Department Account Credentials
                  </h2>
                  <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                    Authorized municipal identity and jurisdiction boundaries (Read-only).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                    <span className="text-[11px] text-[var(--dept-text-muted)] font-medium">Username</span>
                    <div className="font-mono font-semibold text-sm text-[var(--dept-text-primary)] mt-0.5">
                      {session?.username || 'roads-01'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                    <span className="text-[11px] text-[var(--dept-text-muted)] font-medium">Department</span>
                    <div className="font-semibold text-sm text-[var(--dept-text-primary)] mt-0.5">
                      {departmentMeta?.name || 'Karachi Municipal Agency'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                    <span className="text-[11px] text-[var(--dept-text-muted)] font-medium">Agency Code</span>
                    <div className="font-mono font-semibold text-sm text-[var(--dept-text-primary)] mt-0.5">
                      {departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT')}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
                    <span className="text-[11px] text-[var(--dept-text-muted)] font-medium">RLS Boundary</span>
                    <div className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 mt-0.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Isolated &amp; Enforced</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--dept-border)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      navigate('/department/login');
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-800 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    Sign Out of Department Console
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Status Update Modal */}
      {isStatusModalOpen && selectedComplaint && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          complaint={selectedComplaint}
          initialStatus={modalInitialStatus}
          onClose={() => setIsStatusModalOpen(false)}
          onUpdated={(updated: DepartmentComplaintView) => {
            handleComplaintUpdated(updated);
            setIsStatusModalOpen(false);
          }}
        />
      )}

      {/* 2. Review Assignment Modal */}
      {isReviewModalOpen && selectedComplaint && (
        <ReviewAssignmentModal
          isOpen={isReviewModalOpen}
          complaint={selectedComplaint}
          onClose={() => setIsReviewModalOpen(false)}
          onAssigned={(assigned: DepartmentComplaintView) => {
            handleComplaintUpdated(assigned);
            setIsReviewModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
