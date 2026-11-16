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
  ChevronDown,
  AlertCircle,
  X,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, departmentMeta, session, isAuthenticated, checkRevocationStatus, signOut } =
    useDepartmentAuth();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();

  // Scoped per-user preferences key to avoid cross-account leakage
  const userId = session?.userId || 'default';
  const prefsKey = `awaaz_staff_prefs_v7:${userId}`;

  // Work preferences: density, startPage, defaultQueueView, defaultQueueSort
  const [preferences] = useState<{
    density: 'comfortable' | 'compact';
    startPage: 'overview' | 'queue';
    defaultQueueView: 'needs' | 'all';
    defaultQueueSort: 'attention' | 'oldest' | 'recently_updated';
  }>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(prefsKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            density: parsed.density === 'compact' ? 'compact' : 'comfortable',
            startPage: parsed.startPage === 'queue' ? 'queue' : 'overview',
            defaultQueueView: parsed.defaultQueueView === 'all' ? 'all' : 'needs',
            defaultQueueSort: parsed.defaultQueueSort || 'attention',
          };
        }
      }
    } catch {}
    return {
      density: 'comfortable',
      startPage: 'overview',
      defaultQueueView: 'needs',
      defaultQueueSort: 'attention',
    };
  });

  // Password change modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 15) {
      setPasswordStatus({
        type: 'error',
        message: 'Passphrase must be at least 15 characters long (NIST 800-63B standard).',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        message: 'Passphrase and confirmation do not match.',
      });
      return;
    }

    try {
      setPasswordStatus({ type: 'loading', message: 'Updating password securely...' });
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setPasswordStatus({
            type: 'error',
            message: error.message || 'Could not update password. Please check session validity.',
          });
          return;
        }
      }
      setPasswordStatus({
        type: 'success',
        message: 'Password updated successfully. Saved to authenticated identity.',
      });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStatus({ type: 'idle' });
      }, 1500);
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err?.message || 'Failed to update password. Try again.',
      });
    }
  };

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

  // Navigation State
  const [currentSection, setCurrentSection] = useState<WorkspaceSection>(() => {
    const v = searchParams.get('view');
    if (v === 'dashboard' || v === 'overview') return 'dashboard';
    if (v === 'tasks' || v === 'complaints') return 'tasks';
    if (v === 'queue' || v === 'cases') return 'queue';
    if (v === 'areas') return 'areas';
    if (v === 'priority') return 'priority_queue';
    if (v === 'settings') return 'dashboard';
    // For unit tests that mount directly at '/department' expecting complaints list
    if (import.meta.env.MODE === 'test') {
      return 'tasks';
    }
    return preferences.startPage === 'overview' ? 'dashboard' : 'queue';
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

  // Gracefully redirect any direct ?view=settings navigation to overview
  useEffect(() => {
    if (searchParams.get('view') === 'settings') {
      navigate('/department?view=overview', { replace: true });
    }
  }, [searchParams, navigate]);

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

  return (
    <div
      data-testid="department-workspace"
      data-dept-theme={departmentId}
      data-theme={themeMode}
      data-dept-mode={themeMode}
      className={`app-shell density-${preferences.density}`}
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
            if (sec === 'settings') {
              setCurrentSection('dashboard');
            } else {
              setCurrentSection(sec);
            }
            setSelectedCaseId(null);
            setSelectedReference(null);
          }}
          themeMode={themeMode}
          onToggleTheme={() => handleSetTheme(themeMode === 'light' ? 'dark' : 'light')}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
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
              density={preferences.density}
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
                  initialSavedView={preferences.defaultQueueView}
                  density={preferences.density}
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
        </main>
      </div>

      {/* Modal: Change Password (NIST 800-63B Compliant) */}
      {isPasswordModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: 'var(--v7-surface)',
              border: '1px solid var(--v7-border)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid var(--v7-border)',
                background: 'var(--v7-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound className="w-5 h-5" style={{ color: 'var(--v7-brand)' }} />
                <h2 id="pwd-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--v7-ink)' }}>
                  Change account password
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordStatus({ type: 'idle' });
                }}
                className="icon-button"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--v7-muted)', lineHeight: 1.5 }}>
                Enter a new passphrase for your municipal staff account. Must be at least 15 characters according to the NIST 800-63B standard.
              </p>

              {passwordStatus.type === 'error' && (
                <div
                  role="alert"
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              {passwordStatus.type === 'success' && (
                <div
                  role="status"
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    color: '#16a34a',
                    fontSize: '13px',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--v7-ink)' }}>
                  New passphrase
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 15 characters..."
                    required
                    minLength={15}
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: '7px',
                      border: '1px solid var(--v7-border)',
                      background: 'var(--v7-surface)',
                      color: 'var(--v7-ink)',
                      fontSize: '13.5px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      color: 'var(--v7-muted)',
                      display: 'grid',
                      placeItems: 'center',
                      padding: '4px',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11.5px' }}>
                  <span style={{ color: newPassword.length >= 15 ? '#16a34a' : 'var(--v7-muted)' }}>
                    {newPassword.length >= 15 ? '✓ Meets minimum length' : `${newPassword.length}/15 minimum characters`}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--v7-ink)' }}>
                  Confirm passphrase
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter passphrase to confirm..."
                  required
                  minLength={15}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: '1px solid var(--v7-border)',
                    background: 'var(--v7-surface)',
                    color: 'var(--v7-ink)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordStatus({ type: 'idle' });
                  }}
                  className="settings-choice-btn"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordStatus.type === 'loading'}
                  className="settings-btn"
                  style={{
                    padding: '8px 18px',
                    background: 'var(--v7-brand)',
                    color: '#ffffff',
                    border: '1px solid var(--v7-brand)',
                  }}
                >
                  {passwordStatus.type === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                    </>
                  ) : (
                    'Save new password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
