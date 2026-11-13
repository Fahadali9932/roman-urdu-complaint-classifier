import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDepartmentAuth } from '../../context/DepartmentAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { complaintService } from '../../services/MockComplaintService';
import {
  type DepartmentComplaintView,
} from '../../types';
import {
  DepartmentSidebar,
  type WorkspaceSection,
  type TaskFilterType,
} from './components/DepartmentSidebar';
import { ComplaintInboxList } from './components/ComplaintInboxList';
import { ComplaintDetailView } from './components/ComplaintDetailView';
import { StatusUpdateModal } from './components/StatusUpdateModal';
import {
  Loader2,
  Menu,
  X,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Globe,
  ArrowRight,
} from 'lucide-react';
import './department-theme.css';

export const DepartmentDashboardPage: React.FC = () => {
  const { departmentId, departmentMeta, session, isAuthenticated, checkRevocationStatus } =
    useDepartmentAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { referenceNumber: urlRef } = useParams<{ referenceNumber?: string }>();
  const [searchParams] = useSearchParams();

  // Navigation state
  const [currentSection, setCurrentSection] = useState<WorkspaceSection>('tasks');
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<DepartmentComplaintView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
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

  // Load complaints assigned to this department
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

          // Deep-link reference handling
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

          // Auto-select first complaint on desktop if complaints exist
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

  // Status counts mapped to sidebar sub-items
  const taskCounts = useMemo(() => {
    return {
      all: complaints.length,
      accepted: complaints.filter(
        (c) => c.status === 'assigned' || c.status === 'submitted' || c.status === 'under_review'
      ).length,
      rejected: complaints.filter((c) => c.status === 'rejected').length,
      in_progress: complaints.filter((c) => c.status === 'in_progress').length,
      resolved: complaints.filter((c) => c.status === 'resolved').length,
    };
  }, [complaints]);

  // Filter complaints according to active filter and search query
  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    // Status filter
    if (activeTaskFilter === 'accepted') {
      result = result.filter(
        (c) => c.status === 'assigned' || c.status === 'submitted' || c.status === 'under_review'
      );
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
          c.locality.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      const tA = new Date(a.submittedAt).getTime();
      const tB = new Date(b.submittedAt).getTime();
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });

    return result;
  }, [complaints, activeTaskFilter, searchQuery, sortOrder]);

  // Selected complaint object
  const selectedComplaint = useMemo(() => {
    if (!selectedReference) return null;
    return complaints.find((c) => c.referenceNumber === selectedReference) || null;
  }, [complaints, selectedReference]);

  const handleComplaintUpdated = (updated: DepartmentComplaintView) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const username = session?.username || 'roads-01';
  const departmentName = departmentMeta?.name || 'Municipal Agency';
  const departmentShortName = departmentMeta?.name || 'Roads & Infrastructure';

  if (!isAuthenticated || !departmentId) {
    return null;
  }

  return (
    <div
      data-testid="department-workspace"
      data-dept-theme={departmentId}
      className="dept-dark-wrap min-h-screen w-full flex flex-col justify-center items-center p-0 sm:p-5 lg:p-8 selection:bg-[var(--dept-accent)] selection:text-black font-sans"
    >
      {/* Mobile Header Bar */}
      <div className="md:hidden w-full flex items-center justify-between px-5 py-4 bg-[#151417] border-b border-white/10 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-serif font-black text-white text-sm">
            a.
          </div>
          <span className="font-bold text-sm text-white">Awaaz-e-Awam</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
            {departmentMeta?.code}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer"
        >
          {isMobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Operational Glass Shell (Reference 01 / 05) */}
      <div className="dept-shell w-full max-w-[1410px] min-h-[820px] flex flex-col md:flex-row relative z-10 sm:rounded-[26px] overflow-hidden">
        {/* Left Vertical Dark Sidebar (Desktop) */}
        <div className="hidden md:flex w-[285px] min-w-[285px] dept-sidebar shrink-0">
          <DepartmentSidebar
            currentSection={currentSection}
            onSelectSection={(sec) => setCurrentSection(sec)}
            activeTaskFilter={activeTaskFilter}
            onSelectTaskFilter={(flt) => setActiveTaskFilter(flt)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            taskCounts={taskCounts}
          />
        </div>

        {/* Mobile Slide-Out Navigation Drawer */}
        {isMobileDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsMobileDrawerOpen(false);
            }}
          >
            <div className="w-[285px] h-full bg-[#151417] border-r border-white/10 shadow-2xl p-0">
              <DepartmentSidebar
                currentSection={currentSection}
                onSelectSection={(sec) => setCurrentSection(sec)}
                activeTaskFilter={activeTaskFilter}
                onSelectTaskFilter={(flt) => setActiveTaskFilter(flt)}
                searchQuery={searchQuery}
                onSearchChange={(q) => setSearchQuery(q)}
                taskCounts={taskCounts}
                onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Right Content Canvas */}
        <div className="flex-1 flex flex-col min-w-0 p-5 sm:p-8 lg:p-10 overflow-y-auto">
          {/* Unauthorized Reference Tampering Warning */}
          {unauthorizedRefError && (
            <div
              className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between"
              role="alert"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Access Denied:</strong> Complaint {unauthorizedRefError} belongs to another municipal agency.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedRefError(null)}
                className="underline text-xs text-amber-300 ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Section 1: TASKS (Primary Workspace) */}
          {currentSection === 'tasks' && (
            <div className="flex-1 flex flex-col">
              {/* Header: Title & Subtitle */}
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Tasks
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Complaints assigned to your department.
                </p>
              </div>

              {/* Toolbar: Filter Pills & Sorting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {(
                    [
                      { id: 'all', label: 'All complaints' },
                      { id: 'accepted', label: 'Accepted' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'in_progress', label: 'In Progress' },
                      { id: 'resolved', label: 'Work Done' },
                    ] as const
                  ).map((filter) => {
                    const isActive = activeTaskFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveTaskFilter(filter.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--dept-accent-muted)] text-white border border-[var(--dept-accent-border)] shadow-xs'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="h-8 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 outline-none cursor-pointer focus:border-white/30"
                    aria-label="Sort complaints"
                  >
                    <option value="newest" className="bg-[#1b1a1e] text-white">
                      Newest first ⌄
                    </option>
                    <option value="oldest" className="bg-[#1b1a1e] text-white">
                      Oldest first ⌄
                    </option>
                  </select>
                </div>
              </div>

              {/* Master/Detail Workspace Grid */}
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                  <Loader2 className="w-8 h-8 text-[var(--dept-accent)] animate-spin mb-3" />
                  <p className="text-xs font-semibold text-slate-400">
                    Loading assigned complaints...
                  </p>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
                  {/* Left Column: Assigned Complaints List */}
                  <div
                    className={`dept-panel lg:col-span-7 flex flex-col overflow-hidden ${
                      selectedReference ? 'hidden lg:flex' : 'flex'
                    }`}
                  >
                    <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      <span>ASSIGNED COMPLAINTS</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {filteredComplaints.length} complaints
                      </span>
                    </div>

                    <ComplaintInboxList
                      complaints={filteredComplaints}
                      selectedReference={selectedReference}
                      onSelectComplaint={(ref) => setSelectedReference(ref)}
                    />
                  </div>

                  {/* Right Column: Complaint Detail View */}
                  <div
                    className={`dept-panel lg:col-span-5 flex flex-col overflow-hidden ${
                      !selectedReference ? 'hidden lg:flex' : 'flex'
                    }`}
                  >
                    <ComplaintDetailView
                      complaint={selectedComplaint}
                      onOpenStatusModal={() => setIsStatusModalOpen(true)}
                      onBackToList={() => setSelectedReference(null)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: HOME (Minimal Arrival View) */}
          {currentSection === 'home' && (
            <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Welcome back, {username}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  {departmentName} • Karachi Operational Console
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="dept-panel p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Assigned
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">
                    {complaints.length}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Complaints routed to your department
                  </div>
                </div>

                <div className="dept-panel p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Under Field Work
                  </div>
                  <div className="text-3xl font-bold text-blue-400 font-mono">
                    {taskCounts.in_progress}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Active on-ground remediation
                  </div>
                </div>

                <div className="dept-panel p-5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Work Done
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 font-mono">
                    {taskCounts.resolved}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Resolved & verified complaints
                  </div>
                </div>
              </div>

              <div className="dept-panel p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Ready to inspect field tasks?
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                    View full complaints, inspect public incident locations, and update progress states for citizens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentSection('tasks')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--dept-accent)',
                    color: '#151417',
                  }}
                >
                  <span>Open Tasks Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Section 3: DASHBOARD (Operational Overview Derived Strictly from Real Data) */}
          {currentSection === 'dashboard' && (
            <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Operational Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Real-time workload distribution for {departmentShortName}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="dept-panel p-5">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <FileText className="w-4 h-4" />
                    <span>Total Backlog</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {complaints.length}
                  </div>
                </div>

                <div className="dept-panel p-5">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <Clock className="w-4 h-4" />
                    <span>In Progress</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400 font-mono">
                    {taskCounts.in_progress}
                  </div>
                </div>

                <div className="dept-panel p-5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Work Completed</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {taskCounts.resolved}
                  </div>
                </div>

                <div className="dept-panel p-5">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Closed / Rejected</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-400 font-mono">
                    {taskCounts.rejected}
                  </div>
                </div>
              </div>

              <div className="dept-panel p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Department Workload Integrity
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  All counts are compiled strictly from live complaints assigned to your authorized municipal agency. Zero cross-department telemetry is surfaced, preserving municipal boundary segregation.
                </p>
              </div>
            </div>
          )}

          {/* Section 4: NOTIFICATIONS (Honest Notification State) */}
          {currentSection === 'notifications' && (
            <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Notifications
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  System alerts and municipal updates.
                </p>
              </div>

              <div className="dept-panel flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[460px]">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400">
                  <Clock className="w-6 h-6 text-amber-200/70" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">No notifications yet</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Real-time municipal alerts, complaint reassignments, and administrative notices will appear here.
                </p>
              </div>
            </div>
          )}

          {/* Section 5: SETTINGS (Functional Preferences) */}
          {currentSection === 'settings' && (
            <div className="flex-1 flex flex-col space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Settings
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Operational preferences and staff authentication identity.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                {/* Language Preference */}
                <div className="dept-panel p-6 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Interface Language</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Current display mode: {language === 'ur' ? 'اردو (Urdu)' : 'English'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Switch to {language === 'ur' ? 'English' : 'اردو'}</span>
                  </button>
                </div>

                {/* Account Details (Read-only) */}
                <div className="dept-panel p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white">Staff Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="text-slate-400 text-[11px]">Assigned Username</div>
                      <div className="font-mono font-bold text-white mt-1">{username}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="text-slate-400 text-[11px]">Authorized Department</div>
                      <div className="font-semibold text-white mt-1">{departmentName}</div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Zero-PII Confirmation */}
                <div className="dept-panel p-6 flex items-start gap-3.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Zero-PII Privacy Protection Active
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Department staff sessions only receive public incident locations and sanitized complaint text. Citizen names, personal phone numbers, email addresses, and residential home addresses remain quarantined at the database level.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
