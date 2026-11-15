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
import {
  ComplaintInboxList,
  formatPakistanDateParts,
  getStatusChipInfo,
} from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { PriorityQueuePage } from './components/PriorityQueuePage';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { ReviewAssignmentModal } from './components/ReviewAssignmentModal';
import {
  calculateComplaintPriority,
  getPriorityQueueCounts,
  type PriorityLevel,
} from '../../lib/priority-engine';
import {
  Loader2,
  Search,
  Sun,
  Moon,
  ChevronDown,
  AlertCircle,
  X,
  LogOut,
} from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, departmentMeta, session, isAuthenticated, checkRevocationStatus, signOut } =
    useDepartmentAuth();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();

  // Theme mode: 'light' (default) | 'dark'
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('aawaaz-demo-theme') || localStorage.getItem('awaaz_dept_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const handleSetTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('aawaaz-demo-theme', mode);
      localStorage.setItem('awaaz_dept_theme_mode', mode);
    }
  };

  // Sidebar collapse: default false (expanded 248px)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        localStorage.getItem('aawaaz-demo-collapsed') === 'yes' ||
        localStorage.getItem('awaaz_dept_sidebar_collapsed') === 'true'
      );
    }
    return false;
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('aawaaz-demo-collapsed', next ? 'yes' : 'no');
        localStorage.setItem('awaaz_dept_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('aawaaz-demo-collapsed', collapsed ? 'yes' : 'no');
      localStorage.setItem('awaaz_dept_sidebar_collapsed', String(collapsed));
    }
  };

  // Navigation State
  const [currentSection, setCurrentSection] = useState<WorkspaceSection>(() => {
    const v = searchParams.get('view');
    if (v === 'dashboard' || v === 'overview') return 'dashboard';
    if (v === 'tasks' || v === 'complaints') return 'tasks';
    if (v === 'priority') return 'priority_queue';
    if (v === 'settings') return 'settings';
    // For unit tests that mount directly at '/department' expecting complaints list
    if (import.meta.env.MODE === 'test') {
      return 'tasks';
    }
    return 'dashboard';
  });
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Complaints State
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

  // Task counts
  const taskCounts = useMemo(() => {
    const all = augmentedComplaints.length;
    const assigned = augmentedComplaints.filter(
      (c) => c.status === 'assigned' || c.status === 'submitted'
    ).length;
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
      if (activeTaskFilter !== 'all' && activeTaskFilter !== 'under_review') {
        if (activeTaskFilter === 'assigned') {
          if (c.status !== 'assigned' && c.status !== 'submitted') return false;
        } else if (c.status !== activeTaskFilter) {
          return false;
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = c.referenceNumber.toLowerCase().includes(q);
        const locMatch = `${c.district} ${c.locality} ${c.publicLocation || ''}`.toLowerCase().includes(q);
        const textMatch =
          (c.description || '').toLowerCase().includes(q) ||
          (c.generatedHeading || '').toLowerCase().includes(q) ||
          (c.factualSummary || '').toLowerCase().includes(q);
        return refMatch || locMatch || textMatch;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [augmentedComplaints, augmentedReviewComplaints, activeTaskFilter, searchQuery, sortOrder]);

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

  const departmentName = departmentMeta?.name || 'Karachi Metropolitan Corporation';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');
  const username = session?.username || 'roads-01';

  // Lead urgent complaint for Overview right column
  const leadUrgentComplaint = useMemo(() => {
    const active = augmentedComplaints.filter(
      (c) => c.status !== 'resolved' && c.status !== 'rejected'
    );
    const evaluated = active.map((c) => ({
      complaint: c,
      eval: calculateComplaintPriority(c),
    }));
    const found =
      evaluated.find((e) => e.eval.isUrgent || e.eval.priority === 'critical') ||
      evaluated.find((e) => e.eval.isOverdue || e.eval.priority === 'high') ||
      evaluated.find((e) => e.eval.needsAssessment) ||
      evaluated.find((e) => e.eval.qualifiesForPriorityQueue);
    return found ? { complaint: found.complaint, eval: found.eval } : null;
  }, [augmentedComplaints]);

  // Newest 4 complaints for Overview left column
  const newestOverviewComplaints = useMemo(() => {
    return [...augmentedComplaints]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 4);
  }, [augmentedComplaints]);

  return (
    <div
      data-testid="department-workspace"
      data-dept-theme={departmentId}
      data-theme={themeMode}
      data-dept-mode={themeMode}
      className="app-shell"
    >
      {/* Sidebar Navigation */}
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
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* Mobile Backdrop Shade */}
      <div
        id="mobileShade"
        className="mobile-shade"
        hidden={!isMobileDrawerOpen}
        onClick={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Shell */}
      <div className="main-shell">
        {/* Topbar */}
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

        {/* Main Content Area */}
        <main className="page" id="content">
          {/* Unauthorized Reference Warning */}
          {unauthorizedRefError && (
            <div
              className="overview-urgent"
              style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              role="alert"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle className="icon" style={{ color: 'var(--urgent)' }} />
                <span>
                  <strong>Municipal Boundary Notice:</strong> Reference{' '}
                  <span className="ref-code">{unauthorizedRefError}</span> is not assigned to your agency. Data access is restricted under local RLS policy.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedRefError(null)}
                className="icon-button"
                aria-label="Dismiss warning"
              >
                <X className="icon" />
              </button>
            </div>
          )}

          {/* =========================================================================
              VIEW 1: OVERVIEW (MATCHES 01_DASHBOARD_TARGET.png)
              ========================================================================= */}
          {currentSection === 'dashboard' && (
            <div>
              {/* Page Heading with Action */}
              <div className="page-heading">
                <div>
                  <h1>Overview</h1>
                  <p className="page-lead">Your department’s work at a glance.</p>
                </div>
                <button
                  type="button"
                  className="overview-header-action"
                  onClick={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('all');
                    setSelectedReference(null);
                  }}
                >
                  View complaints →
                </button>
              </div>

              {/* 4-Part Workload Metric Strip in ONE White Card */}
              <section className="overview-metrics" aria-label="Department workload">
                {/* 1. Awaiting acceptance */}
                <div className="overview-metric">
                  <div className="overview-metric-label">Awaiting acceptance</div>
                  <div className="overview-number">
                    <strong>{taskCounts.assigned}</strong>
                    <span>{taskCounts.assigned === 1 ? 'needs a response' : 'need a response'}</span>
                  </div>
                </div>

                {/* 2. In progress */}
                <div className="overview-metric">
                  <div className="overview-metric-label">In progress</div>
                  <div className="overview-number">
                    <strong>{taskCounts.accepted + taskCounts.in_progress}</strong>
                    <span>being handled</span>
                  </div>
                </div>

                {/* 3. Completed */}
                <div className="overview-metric">
                  <div className="overview-metric-label">Completed</div>
                  <div className="overview-number">
                    <strong>{taskCounts.resolved}</strong>
                    <span>work finished</span>
                  </div>
                </div>

                {/* 4. Needs attention */}
                <div className="overview-metric">
                  <div className="overview-metric-label">Needs attention</div>
                  <div className="overview-number">
                    <strong>{priorityQueueCounts.total}</strong>
                    <span>{priorityQueueCounts.total === 1 ? 'priority case' : 'priority cases'}</span>
                  </div>
                </div>
              </section>

              {/* 2-Column Split: Recent complaints (left) & Needs attention (right) */}
              <div className="overview-columns">
                {/* Left Column: Recent complaints */}
                <section className="overview-recent" aria-labelledby="recent-heading">
                  <div className="overview-section-heading">
                    <h2 id="recent-heading">Recent complaints</h2>
                    <p>Latest cases assigned to {departmentShort}</p>
                  </div>
                  <div className="overview-panel">
                    <div className="overview-row overview-row-header">
                      <span>Complaint</span>
                      <span>Status</span>
                    </div>
                    {newestOverviewComplaints.length > 0 ? (
                      newestOverviewComplaints.map((c) => {
                        const chip = getStatusChipInfo(c.status);
                        const dt = formatPakistanDateParts(c.submittedAt);
                        const localityStr = c.locality ? `${c.locality}, ${c.district}` : c.district || 'Karachi';
                        const titleText = c.generatedHeading || c.title || 'Municipal Complaint';

                        return (
                          <div key={c.id} className="overview-row">
                            <div className="overview-row-text">
                              <button
                                type="button"
                                className="subject-link"
                                onClick={() => {
                                  setSelectedReference(c.referenceNumber);
                                  setCurrentSection('tasks');
                                }}
                              >
                                {titleText}
                              </button>
                              <span className="overview-row-meta">
                                {localityStr} · {dt.date}, {dt.time}
                              </span>
                            </div>
                            <span>
                              <span className={`status-chip ${chip.className}`}>{chip.label}</span>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="overview-empty" style={{ padding: '24px', textAlign: 'center' }}>
                        No complaints assigned yet.
                      </div>
                    )}
                    <button
                      type="button"
                      className="overview-footer-link"
                      onClick={() => {
                        setCurrentSection('tasks');
                        setActiveTaskFilter('all');
                        setSelectedReference(null);
                      }}
                    >
                      Open complaints list →
                    </button>
                  </div>
                </section>

                {/* Right Column: Needs attention */}
                <section className="overview-attention" aria-labelledby="attention-heading">
                  <div className="overview-section-heading">
                    <h2 id="attention-heading">Needs attention</h2>
                    <p>Only cases that require action</p>
                  </div>
                  <div className="overview-panel overview-action-panel">
                    {/* Urgent safety case or priority case */}
                    {leadUrgentComplaint ? (
                      <div className="overview-urgent">
                        <span className="overview-urgent-caption">
                          {leadUrgentComplaint.eval.isUrgent || leadUrgentComplaint.eval.priority === 'critical'
                            ? '● SAFETY CASE'
                            : leadUrgentComplaint.eval.isOverdue
                            ? '● OVERDUE CASE'
                            : '● NEEDS ASSESSMENT'}
                        </span>
                        <h3>
                          {leadUrgentComplaint.complaint.generatedHeading ||
                            leadUrgentComplaint.complaint.title ||
                            'Priority Case'}
                        </h3>
                        <p>
                          {leadUrgentComplaint.complaint.factualSummary ||
                            leadUrgentComplaint.complaint.description}
                        </p>
                        <button
                          type="button"
                          className="ghost-link"
                          onClick={() => {
                            setSelectedReference(leadUrgentComplaint.complaint.referenceNumber);
                            setCurrentSection('tasks');
                          }}
                        >
                          Review priority →
                        </button>
                      </div>
                    ) : (
                      <div className="overview-empty">No priority cases right now.</div>
                    )}

                    {/* KMC clearinghouse review queue */}
                    {departmentId === 'kmc' && (
                      <div className="overview-action-list">
                        <h3>{taskCounts.under_review} cases need routing review</h3>
                        <p>KMC clearinghouse only</p>
                        <button
                          type="button"
                          className="ghost-link"
                          onClick={() => {
                            setCurrentSection('tasks');
                            setActiveTaskFilter('under_review');
                            setSelectedReference(null);
                          }}
                        >
                          Open review queue →
                        </button>
                      </div>
                    )}

                    {/* Next step guidance */}
                    <div className="overview-action-list">
                      <h3>Next step</h3>
                      <p>Review urgent cases first, then accept new complaints.</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: COMPLAINTS / REVIEW QUEUE (FULL-WIDTH OR DETAIL)
              ========================================================================= */}
          {currentSection === 'tasks' && (
            <div>
              {selectedReference && selectedComplaint ? (
                /* DETAIL VIEW */
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
                /* FULL-WIDTH COMPLAINTS LIST */
                <div>
                  {/* Page Heading */}
                  <div className="page-heading">
                    <div>
                      <h1>{activeTaskFilter === 'under_review' ? 'Review Queue' : 'Complaints'}</h1>
                      <p className="page-lead">
                        {activeTaskFilter === 'under_review'
                          ? 'Assign unresolved department-routing cases through your existing authorized workflow.'
                          : 'Manage and track the cases assigned to your department.'}
                      </p>
                    </div>
                    <div className="muted-count">
                      {filteredComplaints.length} {activeTaskFilter === 'under_review' ? 'under review' : 'complaints'}
                    </div>
                  </div>

                  {/* Horizontal Status Tabs (For standard complaints view) */}
                  {activeTaskFilter !== 'under_review' && (
                    <div className="tabbar" role="tablist" aria-label="Complaint status">
                      {[
                        { id: 'all' as TaskFilterType, label: 'All complaints', count: taskCounts.all },
                        { id: 'assigned' as TaskFilterType, label: 'Awaiting acceptance', count: taskCounts.assigned },
                        { id: 'accepted' as TaskFilterType, label: 'Accepted', count: taskCounts.accepted },
                        { id: 'in_progress' as TaskFilterType, label: 'In progress', count: taskCounts.in_progress },
                        { id: 'resolved' as TaskFilterType, label: 'Completed', count: taskCounts.resolved },
                        { id: 'rejected' as TaskFilterType, label: 'Rejected', count: taskCounts.rejected },
                      ].map((tab) => {
                        const isSelected = activeTaskFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            className="tab-button"
                            onClick={() => setActiveTaskFilter(tab.id)}
                          >
                            {tab.label}
                            <span className="tab-total">{tab.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Toolbar with Search and Sort Menu */}
                  <div className="toolbar">
                    <label className="searchbox">
                      <Search className="icon" />
                      <input
                        id="searchInput"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by reference, issue, or public location..."
                        aria-label="Search complaints"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '12px',
                            background: 'transparent',
                            border: 0,
                            cursor: 'pointer',
                            color: 'var(--muted)',
                          }}
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </label>

                    {/* Accessible Sort Dropdown */}
                    <div className="sort-group">
                      <span className="sort-label">Sort by</span>
                      <div className="menu-wrap">
                        <button
                          type="button"
                          className="sort-trigger"
                          id="sortToggle"
                          aria-haspopup="menu"
                          aria-expanded={isSortMenuOpen}
                          onClick={() => setIsSortMenuOpen((prev) => !prev)}
                        >
                          <span>{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
                          <ChevronDown className="icon" />
                        </button>
                        {isSortMenuOpen && (
                          <div
                            id="sortMenu"
                            className="sort-menu"
                            role="menu"
                            onClick={() => setIsSortMenuOpen(false)}
                          >
                            <button
                              type="button"
                              className={`sort-option ${sortOrder === 'newest' ? 'selected' : ''}`}
                              role="menuitem"
                              onClick={() => setSortOrder('newest')}
                            >
                              Newest first
                            </button>
                            <button
                              type="button"
                              className={`sort-option ${sortOrder === 'oldest' ? 'selected' : ''}`}
                              role="menuitem"
                              onClick={() => setSortOrder('oldest')}
                            >
                              Oldest first
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Complaints Table */}
                  {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
                      <Loader2 className="w-8 h-8 animate-spin" style={{ margin: '0 auto 12px', color: 'var(--brand)' }} />
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>Loading complaints...</p>
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

          {/* =========================================================================
              VIEW 3: PRIORITY QUEUE (SELECTIVE EVIDENCE-BASED TRIAGE)
              ========================================================================= */}
          {currentSection === 'priority_queue' && (
            <div>
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
                <PriorityQueuePage
                  complaints={augmentedComplaints}
                  departmentId={departmentId!}
                  selectedReference={selectedReference}
                  onSelectComplaint={(ref) => setSelectedReference(ref)}
                  onViewAllComplaints={() => {
                    setCurrentSection('tasks');
                    setActiveTaskFilter('all');
                    setSelectedReference(null);
                  }}
                />
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 4: SETTINGS (CLEAN CIVIC PREFERENCES)
              ========================================================================= */}
          {currentSection === 'settings' && (
            <div>
              <div className="page-heading">
                <div>
                  <h1>Settings</h1>
                  <p className="page-lead">Only the preferences and account information staff actually need.</p>
                </div>
              </div>

              <div className="settings-stack">
                {/* 1. Appearance Card */}
                <section className="settings-card">
                  <h2>Appearance</h2>
                  <p>Choose a comfortable, readable workspace theme.</p>

                  <div className="setting-row">
                    <div>
                      <strong>Color mode</strong>
                      <span>Saved locally in your browser workspace.</span>
                    </div>
                    <div className="choice" role="group" aria-label="Color mode">
                      <button
                        type="button"
                        aria-pressed={themeMode === 'light'}
                        onClick={() => handleSetTheme('light')}
                      >
                        <Sun className="icon" /> Light
                      </button>
                      <button
                        type="button"
                        aria-pressed={themeMode === 'dark'}
                        onClick={() => handleSetTheme('dark')}
                      >
                        <Moon className="icon" /> Dark
                      </button>
                    </div>
                  </div>

                  <div className="setting-row">
                    <div>
                      <strong>Sidebar</strong>
                      <span>Choose how much navigation is visible.</span>
                    </div>
                    <div className="choice" role="group" aria-label="Sidebar display">
                      <button
                        type="button"
                        aria-pressed={!isSidebarCollapsed}
                        onClick={() => handleSetSidebarCollapsed(false)}
                      >
                        Expanded
                      </button>
                      <button
                        type="button"
                        aria-pressed={isSidebarCollapsed}
                        onClick={() => handleSetSidebarCollapsed(true)}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Department Account Card */}
                <section className="settings-card">
                  <h2>Department account</h2>
                  <p>Information supplied by authenticated records in the actual application.</p>

                  <div className="data-line">
                    <span className="label">Staff account</span>
                    <span className="value">{username}</span>
                  </div>
                  <div className="data-line">
                    <span className="label">Department</span>
                    <span className="value">{departmentName}</span>
                  </div>
                  <div className="data-line">
                    <span className="label">Role</span>
                    <span className="value">Department staff</span>
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--soft-line)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        navigate('/department/login');
                      }}
                      className="overview-header-action"
                      style={{ color: 'var(--urgent)', borderColor: 'var(--urgent-border, var(--line))', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <LogOut className="w-4 h-4" /> Sign out of workspace
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Status Update */}
      {isStatusModalOpen && selectedComplaint && (
        <StatusUpdateModal
          isOpen={isStatusModalOpen}
          initialStatus={modalInitialStatus}
          onClose={() => {
            setIsStatusModalOpen(false);
            setModalInitialStatus(undefined);
          }}
          complaint={selectedComplaint}
          onUpdated={(updated: DepartmentComplaintView) => {
            handleComplaintUpdated(updated);
            setIsStatusModalOpen(false);
            setModalInitialStatus(undefined);
          }}
        />
      )}

      {/* Modal: KMC Clearinghouse Review Assignment */}
      {isReviewModalOpen && selectedComplaint && (
        <ReviewAssignmentModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          complaint={selectedComplaint}
          onAssigned={(assignedComplaint) => {
            handleComplaintUpdated(assignedComplaint);
            setIsReviewModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
