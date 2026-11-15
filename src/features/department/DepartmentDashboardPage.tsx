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
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { ReviewAssignmentModal } from './components/ReviewAssignmentModal';
import {
  Loader2,
  Menu,
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
  Inbox,
  Bell,
  LogOut,
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

  // Navigation state
  const [currentSection, setCurrentSection] = useState<WorkspaceSection>('tasks');
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<DepartmentComplaintView[]>([]);
  const [reviewComplaints, setReviewComplaints] = useState<DepartmentComplaintView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<ComplaintStatus | undefined>(undefined);
  const [unauthorizedRefError, setUnauthorizedRefError] = useState<string | null>(null);

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
      setUnauthorizedRefError(null);
      try {
        const data = await complaintService.getDepartmentComplaints(departmentId);
        if (isCancelled) return;
        setComplaints(data);

        let reviews: DepartmentComplaintView[] = [];
        if (departmentId === 'kmc') {
          try {
            reviews = await complaintService.getReviewQueueComplaints();
          } catch {
            reviews = [];
          }
        }
        if (isCancelled) return;
        setReviewComplaints(reviews);

        const allAvailable = [...data, ...reviews];

        // Deep-link reference handling or parameter match
        const targetRef = searchParams.get('ref') || urlRef;
        if (targetRef) {
          const cleaned = targetRef.trim().toUpperCase();
          const match = allAvailable.find((c) => c.referenceNumber.toUpperCase() === cleaned);
          if (match) {
            setSelectedReference(match.referenceNumber);
          } else {
            // Check unauthorized foreign reference
            complaintService.getComplaintByReference(cleaned).then((globalComp) => {
              if (globalComp && globalComp.assignedDepartmentId !== departmentId) {
                setUnauthorizedRefError(cleaned);
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to load department complaints:', err);
      } finally {
        if (!isCancelled && !options?.silent) {
          setIsLoading(false);
        }
      }
    };

    // Initial load
    fetchComplaints();

    // 1. Supabase Realtime Subscription for live updates
    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel(`dept-complaints-live-${departmentId}`)
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'complaint_timeline_events',
          },
          () => {
            fetchComplaints({ silent: true });
          }
        )
        .subscribe();
    }

    // 2. Window focus refresh
    const handleFocus = () => {
      fetchComplaints({ silent: true });
    };
    window.addEventListener('focus', handleFocus);

    // 3. 5-second live polling fallback
    const intervalId = setInterval(() => {
      fetchComplaints({ silent: true });
    }, 5000);

    return () => {
      isCancelled = true;
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [departmentId, urlRef, searchParams]);

  // Status counts mapped to sidebar sub-items
  const taskCounts = useMemo(() => {
    return {
      all: complaints.length,
      under_review: departmentId === 'kmc' ? reviewComplaints.length : 0,
      assigned: complaints.filter((c) => c.status === 'assigned').length,
      accepted: complaints.filter((c) => c.status === 'accepted').length,
      in_progress: complaints.filter((c) => c.status === 'in_progress').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
      rejected: complaints.filter((c) => c.status === 'rejected').length,
    };
  }, [complaints, reviewComplaints, departmentId]);

  // Filter complaints according to active filter and search query
  const filteredComplaints = useMemo(() => {
    let result = activeTaskFilter === 'under_review' ? [...reviewComplaints] : [...complaints];

    // Status filter
    if (activeTaskFilter === 'assigned') {
      result = result.filter((c) => c.status === 'assigned');
    } else if (activeTaskFilter === 'accepted') {
      result = result.filter((c) => c.status === 'accepted');
    } else if (activeTaskFilter === 'rejected') {
      result = result.filter((c) => c.status === 'rejected');
    } else if (activeTaskFilter === 'in_progress') {
      result = result.filter((c) => c.status === 'in_progress');
    } else if (activeTaskFilter === 'resolved') {
      result = result.filter((c) => c.status === 'resolved');
    }

    // Scoped search filter (searches reference, locality, district, title, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        return (
          c.referenceNumber.toLowerCase().includes(q) ||
          (c.locality && c.locality.toLowerCase().includes(q)) ||
          (c.district && c.district.toLowerCase().includes(q)) ||
          (c.generatedHeading && c.generatedHeading.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.factualSummary && c.factualSummary.toLowerCase().includes(q)) ||
          (c.sanitizedDescription && c.sanitizedDescription.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      });
    }

    // Sort order
    result.sort((a, b) => {
      const dateA = new Date(a.submittedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [complaints, reviewComplaints, activeTaskFilter, searchQuery, sortOrder]);

  // Selected complaint object (prefer current filtered view)
  const selectedComplaint = useMemo(() => {
    if (!selectedReference) return null;
    return (
      filteredComplaints.find((c) => c.referenceNumber === selectedReference) ||
      complaints.find((c) => c.referenceNumber === selectedReference) ||
      reviewComplaints.find((c) => c.referenceNumber === selectedReference) ||
      null
    );
  }, [filteredComplaints, complaints, reviewComplaints, selectedReference]);

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
    setReviewComplaints((prev) =>
      prev.filter((c) => c.id !== updated.id)
    );
    if (updated.assignedDepartmentId === departmentId) {
      if (updated.status === 'assigned') {
        setActiveTaskFilter('assigned');
      }
      setSelectedReference(updated.referenceNumber);
    }
  };

  const getCategoryTitle = () => {
    if (activeTaskFilter === 'under_review') return 'Classification Review Queue';
    switch (activeTaskFilter) {
      case 'assigned':
        return 'Pending Acceptance';
      case 'accepted':
        return 'Accepted Complaints';
      case 'in_progress':
        return 'In Progress Complaints';
      case 'resolved':
        return 'Work Done / Resolved';
      case 'rejected':
        return 'Rejected Complaints';
      default:
        return 'All Complaints';
    }
  };

  return (
    <div
      data-testid="department-workspace"
      data-dept-theme={departmentId}
      data-dept-mode={themeMode}
      className="dept-workspace-wrap w-full h-screen h-[100dvh] flex flex-col overflow-hidden font-sans m-0 p-0"
    >
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-[var(--dept-sidebar-bg)] border-b border-[var(--dept-border)] shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm">
            a.
          </div>
          <span className="font-bold text-sm text-[var(--dept-text-primary)]">
            Awaaz-e-Awam
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)] border border-[var(--dept-border)]">
            {departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
          className="p-2 rounded-lg bg-[var(--dept-surface-subtle)] text-[var(--dept-text-primary)] border border-[var(--dept-border)] cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Main Operational Shell */}
      <div className="dept-shell w-full flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative z-10">
        {/* Left Collapsible Sidebar (Desktop) */}
        <aside
          className={`hidden md:flex ${
            isSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[240px] min-w-[240px]'
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
            taskCounts={taskCounts}
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
                taskCounts={taskCounts}
                onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Full-Width Content Canvas */}
        <main className="dept-main flex-1 flex flex-col min-w-0 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto dept-scrollbar">
          {/* Unauthorized Reference Tampering Warning */}
          {unauthorizedRefError && (
            <div
              className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between shrink-0"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Municipal Boundary Segregation Alert:</strong> Reference{' '}
                  <span className="font-mono font-bold">{unauthorizedRefError}</span> is not assigned to your agency. Data access is restricted under local RLS policy.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedRefError(null)}
                className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 p-1 cursor-pointer"
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
                          : `${filteredComplaints.length} complaints assigned to your department.`}
                      </p>
                    </div>

                    {/* Quick Count Badge */}
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--dept-text-secondary)] bg-[var(--dept-surface)] px-3 py-1.5 rounded-lg border border-[var(--dept-border)] shadow-2xs">
                      <span>{filteredComplaints.length} complaints</span>
                    </div>
                  </div>

                  {/* Search & Sort Controls Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Embedded Search Input */}
                    <div className="flex-1 max-w-md relative">
                      <div className="h-10 px-3 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] focus-within:border-[var(--dept-accent)] transition-colors flex items-center gap-2 text-[var(--dept-text-muted)] focus-within:text-[var(--dept-text-primary)] shadow-2xs">
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

                    {/* Sort Order Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor="dept-sort" className="text-xs text-[var(--dept-text-muted)] font-medium">
                        Sort:
                      </label>
                      <select
                        id="dept-sort"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                        className="h-10 px-3 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-primary)] outline-none focus:border-[var(--dept-accent)] cursor-pointer shadow-2xs"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
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

          {/* SECTION 2: OPERATIONAL DASHBOARD */}
          {currentSection === 'dashboard' && (
            <div className="w-full max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
                  Operational Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
                  Real-time municipal workload distribution and workload telemetry.
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
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs hover:border-[var(--dept-accent)] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                    <span>Pending Acceptance</span>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors">
                    {taskCounts.assigned}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Awaiting field dispatch</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 2. In Progress */}
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
                    <PlayCircle className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors">
                    {taskCounts.in_progress}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Active field teams</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 3. Work Done */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('resolved');
                    setSelectedReference(null);
                  }}
                  className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs hover:border-[var(--dept-accent)] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                    <span>Work Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-[var(--dept-accent)] transition-colors">
                    {taskCounts.resolved}
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                    <span>Remediated & verified</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 4. Total Backlog or Review Queue */}
                {departmentId === 'kmc' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSection('tasks');
                      setActiveTaskFilter('under_review');
                      setSelectedReference(null);
                    }}
                    className="p-5 rounded-xl bg-[var(--dept-surface)] border border-purple-200 dark:border-purple-800 shadow-xs hover:border-purple-400 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                      <span>Review Queue</span>
                      <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)] group-hover:text-purple-600 transition-colors">
                      {taskCounts.under_review}
                    </div>
                    <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1 flex items-center gap-1">
                      <span>Clearinghouse triage</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ) : (
                  <div className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--dept-text-muted)] mb-2">
                      <span>Total Backlog</span>
                      <Inbox className="w-4 h-4 text-[var(--dept-text-muted)]" />
                    </div>
                    <div className="text-3xl font-bold font-mono text-[var(--dept-text-primary)]">
                      {taskCounts.all}
                    </div>
                    <div className="text-[11px] text-[var(--dept-text-secondary)] mt-1">
                      All department records
                    </div>
                  </div>
                )}
              </div>

              {/* Department Workload Integrity Card */}
              <div className="p-5 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Department Workload Integrity</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] leading-relaxed">
                  All metrics are compiled strictly from live complaints assigned to your authorized municipal agency. Zero cross-department telemetry is surfaced, preserving strict administrative segregation under Karachi municipal protocol.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: NOTIFICATIONS */}
          {currentSection === 'notifications' && (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--dept-text-primary)]">
                  Notifications
                </h1>
                <p className="text-xs sm:text-sm text-[var(--dept-text-secondary)] mt-1">
                  System alerts and operational dispatches.
                </p>
              </div>

              <div className="bg-[var(--dept-surface)] border border-[var(--dept-border)] rounded-xl shadow-xs divide-y divide-[var(--dept-border)] overflow-hidden">
                <div className="p-4 flex items-start gap-3 hover:bg-[var(--dept-surface-hover)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="font-semibold text-[var(--dept-text-primary)]">
                      Supabase Realtime Channel Active
                    </div>
                    <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                      Operational console is actively listening for live complaint assignments and status transitions.
                    </p>
                    <span className="text-[10px] text-[var(--dept-text-muted)] mt-1 inline-block">
                      Just now
                    </span>
                  </div>
                </div>

                <div className="p-4 flex items-start gap-3 hover:bg-[var(--dept-surface-hover)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="font-semibold text-[var(--dept-text-primary)]">
                      Privacy Redaction Engine Verified
                    </div>
                    <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                      Citizen phone numbers, emails, CNIC and residential street addresses are automatically sanitized before presentation.
                    </p>
                    <span className="text-[10px] text-[var(--dept-text-muted)] mt-1 inline-block">
                      System protocol
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: SETTINGS (Includes Light/Dark Mode Switcher!) */}
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
                        ? 'border-[var(--dept-accent)] bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-[var(--dept-accent)]'
                        : 'border-[var(--dept-border)] bg-[var(--dept-surface-subtle)] hover:border-[var(--dept-border-strong)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-2xs">
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
                        ? 'border-[var(--dept-accent)] bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-[var(--dept-accent)]'
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
                    Sidebar Navigation
                  </h2>
                  <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                    Toggle sidebar width preference.
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
                        <span>Expand Sidebar (240px)</span>
                      </>
                    ) : (
                      <>
                        <PanelLeftClose className="w-4 h-4 text-[var(--dept-accent)]" />
                        <span>Collapse Sidebar (72px)</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-[var(--dept-text-muted)]">
                    Currently: {isSidebarCollapsed ? 'Collapsed (Icons only)' : 'Expanded (Full Labels)'}
                  </span>
                </div>
              </div>

              {/* 3. Account Information & Municipal Boundary */}
              <div className="p-5 sm:p-6 rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border)] shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[var(--dept-text-primary)]">
                    Department Account
                  </h2>
                  <p className="text-xs text-[var(--dept-text-secondary)] mt-0.5">
                    Authorized municipal identity and jurisdiction boundaries.
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
                    <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Isolated & Enforced</span>
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
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of Session</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Status Update Modal */}
      {selectedComplaint && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          complaint={selectedComplaint}
          onUpdated={handleComplaintUpdated}
          initialStatus={modalInitialStatus}
        />
      )}

      {/* Classification Review Modal (KMC Clearinghouse only) */}
      {selectedComplaint && (
        <ReviewAssignmentModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          complaint={selectedComplaint}
          onAssigned={handleComplaintUpdated}
        />
      )}
    </div>
  );
};
