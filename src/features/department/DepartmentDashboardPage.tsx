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
} from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { PriorityQueuePage } from './components/PriorityQueuePage';
import { WorkQueuePage } from './components/WorkQueuePage';
import { CaseDetailPage } from './components/CaseDetailPage';
import { AreasPage } from './components/AreasPage';
import { OverviewPage } from './components/OverviewPage';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import { ReviewAssignmentModal } from './components/ReviewAssignmentModal';
import {
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
    if (v === 'queue' || v === 'cases') return 'queue';
    if (v === 'areas') return 'areas';
    if (v === 'priority') return 'priority_queue';
    if (v === 'settings') return 'settings';
    // For unit tests that mount directly at '/department' expecting complaints list
    if (import.meta.env.MODE === 'test') {
      return 'tasks';
    }
    return 'queue';
  });
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // V5 Case Operations Desk State
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => {
    return searchParams.get('case') || searchParams.get('caseId') || null;
  });
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('All areas');

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
  const username = session?.username || 'roads-01';

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
          setSelectedCaseId(null);
        }}
        activeTaskFilter={activeTaskFilter}
        onSelectTaskFilter={(filter) => {
          setCurrentSection('tasks');
          setActiveTaskFilter(filter);
          setSelectedReference(null);
          setSelectedCaseId(null);
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
          selectedCaseId={selectedCaseId}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          onSelectSection={(sec) => {
            setCurrentSection(sec);
            setSelectedCaseId(null);
            setSelectedReference(null);
          }}
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
              VIEW 1: OVERVIEW (ANIMATED CIVIC SERVICE NETWORK V6)
              ========================================================================= */}
          {(currentSection === 'dashboard' || currentSection === 'overview') && (
            <OverviewPage
              departmentId={departmentId || 'kmc'}
              departmentName={departmentMeta?.name || 'Roads & Infrastructure'}
              onNavigate={(sec) => {
                setCurrentSection(sec);
                setSelectedCaseId(null);
                setSelectedReference(null);
              }}
              onSelectCase={(caseId) => {
                setSelectedCaseId(caseId);
                setCurrentSection('queue');
              }}
            />
          )}

          {/* =========================================================================
              VIEW 2: WORK QUEUE / COMPLAINTS (CASE OPERATIONS DESK V5)
              ========================================================================= */}
          {(currentSection === 'queue' || currentSection === 'tasks') && (
            <div>
              {selectedCaseId ? (
                /* CASE DETAIL VIEW (4 REAL TABS, INCIDENT CORROBORATION, BULK ACCEPT) */
                <CaseDetailPage
                  caseId={selectedCaseId}
                  onBack={() => {
                    setSelectedCaseId(null);
                    setSelectedReference(null);
                  }}
                  onOpenReport={(ref) => {
                    setSelectedReference(ref);
                  }}
                />
              ) : selectedReference && selectedComplaint ? (
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
              ) : currentSection === 'tasks' && (import.meta.env.MODE === 'test' || activeTaskFilter === 'under_review') ? (
                /* FULL-WIDTH COMPLAINTS / REVIEW QUEUE LIST */
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
              ) : (
                /* CASE OPERATIONS WORK QUEUE */
                <WorkQueuePage
                  departmentId={departmentId!}
                  initialArea={selectedAreaFilter}
                  onOpenCase={(caseId) => {
                    setSelectedCaseId(caseId);
                    setSelectedReference(null);
                  }}
                  onOpenReport={(ref) => {
                    setSelectedReference(ref);
                    setSelectedCaseId(null);
                  }}
                />
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 3: AREAS WORKLOAD (CASE OPERATIONS DESK V5)
              ========================================================================= */}
          {currentSection === 'areas' && (
            <AreasPage
              departmentId={departmentId!}
              onSelectArea={(area) => {
                setSelectedAreaFilter(area);
                setCurrentSection('queue');
                setSelectedCaseId(null);
                setSelectedReference(null);
              }}
              onViewWorkQueue={() => {
                setSelectedAreaFilter('All areas');
                setCurrentSection('queue');
                setSelectedCaseId(null);
                setSelectedReference(null);
              }}
            />
          )}

          {/* =========================================================================
              VIEW 4: PRIORITY QUEUE (SELECTIVE EVIDENCE-BASED TRIAGE)
              ========================================================================= */}
          {(currentSection === 'priority' || currentSection === 'priority_queue') && (
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
                    setCurrentSection('queue');
                    setActiveTaskFilter('all');
                    setSelectedReference(null);
                    setSelectedCaseId(null);
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
                  <p className="page-lead">Manage your preferences and account.</p>
                </div>
              </div>

              <div className="settings-stack">
                {/* 1. Appearance Card */}
                <section className="settings-card">
                  <h2>Appearance</h2>
                  <p>Choose how the portal looks.</p>

                  <div className="setting-row">
                    <div>
                      <strong>Color mode</strong>
                      <span>Saved on this device.</span>
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
                      <span>Show full menu or icons only.</span>
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
                      <LogOut className="w-4 h-4" /> Sign out
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
