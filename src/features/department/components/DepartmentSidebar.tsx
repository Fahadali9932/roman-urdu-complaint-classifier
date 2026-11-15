import React, { useState } from 'react';
import {
  LayoutDashboard,
  Inbox,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  XCircle,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useNavigate } from 'react-router-dom';
import { CivicTooltip, CivicTooltipProvider } from './CivicTooltip';

export type WorkspaceSection = 'dashboard' | 'tasks' | 'settings' | 'home';
export type TaskFilterType =
  | 'all'
  | 'under_review'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

interface DepartmentSidebarProps {
  currentSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  activeTaskFilter: TaskFilterType;
  onSelectTaskFilter: (filter: TaskFilterType) => void;
  taskCounts?: {
    all: number;
    under_review?: number;
    assigned: number;
    accepted: number;
    in_progress: number;
    resolved: number;
    rejected: number;
  };
  onCloseMobileDrawer?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  currentSection,
  onSelectSection,
  activeTaskFilter,
  onSelectTaskFilter,
  taskCounts,
  onCloseMobileDrawer,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { session, departmentMeta, departmentId, signOut } = useDepartmentAuth();
  const navigate = useNavigate();

  // Expandable Complaints subcategory in expanded view
  const [isComplaintsOpen, setIsComplaintsOpen] = useState(true);

  const handleSignOut = () => {
    signOut();
    navigate('/department/login');
  };

  const handleNavClick = (section: WorkspaceSection) => {
    onSelectSection(section);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const handleTaskFilterClick = (filter: TaskFilterType) => {
    onSelectSection('tasks');
    onSelectTaskFilter(filter);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const isKmc = departmentId === 'kmc';
  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');

  const isTasksActive = currentSection === 'tasks' && activeTaskFilter !== 'under_review';
  const isReviewActive = currentSection === 'tasks' && activeTaskFilter === 'under_review';

  const complaintSubcategories = [
    { id: 'all' as TaskFilterType, label: 'All Complaints', icon: Inbox, count: taskCounts?.all ?? 0 },
    { id: 'assigned' as TaskFilterType, label: 'Pending Acceptance', icon: AlertCircle, count: taskCounts?.assigned ?? 0 },
    { id: 'accepted' as TaskFilterType, label: 'Accepted', icon: CheckCircle2, count: taskCounts?.accepted ?? 0 },
    { id: 'in_progress' as TaskFilterType, label: 'In Progress', icon: PlayCircle, count: taskCounts?.in_progress ?? 0 },
    { id: 'resolved' as TaskFilterType, label: 'Work Done', icon: CheckCircle2, count: taskCounts?.resolved ?? 0 },
    { id: 'rejected' as TaskFilterType, label: 'Rejected', icon: XCircle, count: taskCounts?.rejected ?? 0 },
  ];

  return (
    <CivicTooltipProvider delayDuration={150}>
      <aside
        aria-label="Department Navigation"
        className="w-full h-full flex flex-col justify-between p-3 select-none text-[var(--dept-text-secondary)]"
      >
        {/* Top Segment: Brand & Header */}
        <div className="space-y-4">
          {/* Header Bar */}
          {isCollapsed ? (
            /* Collapsed Header: Monogram & Expand Button Centered */
            <div className="flex flex-col items-center gap-2 pb-3 border-b border-[var(--dept-border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm shrink-0 shadow-xs">
                a.
              </div>
              {onToggleCollapse && (
                <CivicTooltip content="Expand sidebar (240px)" side="right">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label="Expand navigation"
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--dept-surface-subtle)] hover:bg-[var(--dept-surface-hover)] border border-[var(--dept-border)] text-[var(--dept-text-primary)] hover:text-[var(--dept-accent)] transition-colors cursor-pointer"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </CivicTooltip>
              )}
            </div>
          ) : (
            /* Expanded Header: Brand + Agency Name + Collapse Button */
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dept-border)]">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm shrink-0 shadow-xs">
                  a.
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm tracking-tight text-[var(--dept-text-primary)] truncate leading-tight">
                    Awaaz-e-Awam
                  </span>
                  <span className="text-[11px] text-[var(--dept-text-muted)] font-medium truncate">
                    {departmentShort} Workspace
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onToggleCollapse && (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    title="Collapse sidebar"
                    aria-label="Collapse navigation"
                    className="hidden md:flex p-1.5 rounded-lg hover:bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                )}

                {onCloseMobileDrawer && (
                  <button
                    type="button"
                    onClick={onCloseMobileDrawer}
                    aria-label="Close menu"
                    className="md:hidden p-1.5 rounded-lg hover:bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-4">
            {/* Group 1: OVERVIEW */}
            <div>
              {!isCollapsed && (
                <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                  Overview
                </div>
              )}
              {isCollapsed ? (
                <CivicTooltip content="Dashboard" side="right">
                  <button
                    type="button"
                    onClick={() => handleNavClick('dashboard')}
                    aria-label="Dashboard"
                    className={`w-full flex justify-center py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentSection === 'dashboard'
                        ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)]'
                        : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </button>
                </CivicTooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick('dashboard')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    currentSection === 'dashboard'
                      ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)]'
                      : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Dashboard</span>
                  </div>
                </button>
              )}
            </div>

            {/* Group 2: COMPLAINTS */}
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-2.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                    Complaints
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsComplaintsOpen((prev) => !prev)}
                    className="text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] p-0.5 cursor-pointer"
                    aria-label={isComplaintsOpen ? 'Collapse complaints group' : 'Expand complaints group'}
                  >
                    {isComplaintsOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {/* Collapsed Complaints: Show Icons for each subcategory with Tooltips! */}
              {isCollapsed ? (
                <div className="space-y-1">
                  {complaintSubcategories.map((sub) => {
                    const isSubActive = isTasksActive && activeTaskFilter === sub.id;
                    const SubIcon = sub.icon;
                    return (
                      <CivicTooltip
                        key={sub.id}
                        content={`${sub.label} (${sub.count})`}
                        side="right"
                      >
                        <button
                          type="button"
                          onClick={() => handleTaskFilterClick(sub.id)}
                          aria-label={`${sub.label} (${sub.count})`}
                          className={`w-full flex justify-center py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            isSubActive
                              ? 'dept-nav-active text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)] font-semibold'
                              : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                          }`}
                        >
                          <SubIcon className="w-4 h-4 shrink-0" />
                        </button>
                      </CivicTooltip>
                    );
                  })}
                </div>
              ) : (
                /* Expanded Complaints: List with Counts */
                isComplaintsOpen && (
                  <div className="space-y-0.5">
                    {complaintSubcategories.map((sub) => {
                      const isSubActive = isTasksActive && activeTaskFilter === sub.id;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleTaskFilterClick(sub.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            isSubActive
                              ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)]'
                              : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                              isSubActive
                                ? 'bg-[var(--dept-accent)] text-white'
                                : 'bg-[var(--dept-surface-subtle)] text-[var(--dept-text-primary)] border border-[var(--dept-border)]'
                            }`}
                          >
                            {sub.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Group 3: REVIEW QUEUE (Role-Based: KMC Clearinghouse Only) */}
            {isKmc && (
              <div>
                {!isCollapsed && (
                  <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                    Review
                  </div>
                )}
                {isCollapsed ? (
                  <CivicTooltip content={`Review Queue (${taskCounts?.under_review ?? 0})`} side="right">
                    <button
                      type="button"
                      onClick={() => handleTaskFilterClick('under_review')}
                      aria-label={`Review Queue (${taskCounts?.under_review ?? 0})`}
                      className={`w-full flex justify-center py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isReviewActive
                          ? 'dept-nav-active font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800'
                          : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </button>
                  </CivicTooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTaskFilterClick('under_review')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isReviewActive
                        ? 'dept-nav-active font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800'
                        : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                      <span>Review Queue</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 font-bold">
                      {taskCounts?.under_review ?? 0}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Group 4: SYSTEM (Settings Only — Notifications Removed) */}
            <div>
              {!isCollapsed && (
                <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                  System
                </div>
              )}
              {isCollapsed ? (
                <CivicTooltip content="Settings" side="right">
                  <button
                    type="button"
                    onClick={() => handleNavClick('settings')}
                    aria-label="Settings"
                    className={`w-full flex justify-center py-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentSection === 'settings'
                        ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)]'
                        : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </CivicTooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNavClick('settings')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    currentSection === 'settings'
                      ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)] border border-[var(--dept-accent-border)]'
                      : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Settings</span>
                  </div>
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom Segment: Staff Profile & Sign Out */}
        <div className="pt-3 border-t border-[var(--dept-border)]">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <CivicTooltip content={`${username} (${departmentShort})`} side="right">
                <div className="w-8 h-8 rounded-full bg-[var(--dept-accent)] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {initialLetter}
                </div>
              </CivicTooltip>
              <CivicTooltip content="Sign Out" side="right">
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign Out"
                  className="p-1.5 rounded-lg text-[var(--dept-text-secondary)] hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </CivicTooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--dept-accent)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {initialLetter}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-semibold text-[var(--dept-text-primary)] truncate leading-tight">
                    {username}
                  </span>
                  <span className="text-[10px] text-[var(--dept-text-muted)] truncate font-medium">
                    {departmentShort} Staff
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 rounded-lg text-[var(--dept-text-secondary)] hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </CivicTooltipProvider>
  );
};
