import React, { useState } from 'react';
import {
  LayoutDashboard,
  Inbox,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  XCircle,
  ShieldAlert,
  Bell,
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

export type WorkspaceSection = 'dashboard' | 'tasks' | 'notifications' | 'settings' | 'home';
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

  // Local state for expandable Complaints category
  const [isComplaintsOpen, setIsComplaintsOpen] = useState(true);

  const handleSignOut = () => {
    signOut();
    navigate('/department/login');
  };

  const handleNavClick = (section: WorkspaceSection) => {
    onSelectSection(section);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const handleTaskFilterClick = (filter: TaskFilterType) => {
    onSelectSection('tasks');
    onSelectTaskFilter(filter);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const isKmc = departmentId === 'kmc';
  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');

  const isTasksActive = currentSection === 'tasks' && activeTaskFilter !== 'under_review';
  const isReviewActive = currentSection === 'tasks' && activeTaskFilter === 'under_review';

  return (
    <aside
      aria-label="Department Navigation"
      className="w-full h-full flex flex-col justify-between p-3 select-none text-[var(--dept-text-secondary)]"
    >
      {/* Top Segment: Brand & Header */}
      <div className="space-y-4">
        {/* Brand Bar & Collapse Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--dept-border)]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm shrink-0 shadow-xs">
              a.
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-[var(--dept-text-primary)] truncate leading-tight">
                  Awaaz-e-Awam
                </span>
                <span className="text-[11px] text-[var(--dept-text-muted)] font-medium truncate">
                  {departmentShort} Workspace
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {onCloseMobileDrawer && (
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                aria-label="Close menu"
                className="md:hidden p-1.5 rounded-md hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Hierarchical Navigation */}
        <nav className="space-y-4">
          {/* Group 1: OVERVIEW */}
          <div>
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                Overview
              </div>
            )}
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              title={isCollapsed ? 'Dashboard' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'
              } rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentSection === 'dashboard'
                  ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)]'
                  : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Dashboard</span>}
              </div>
            </button>
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

            {isCollapsed ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleTaskFilterClick('all')}
                  title="All Complaints"
                  className={`w-full flex justify-center py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    isTasksActive && activeTaskFilter === 'all'
                      ? 'dept-nav-active text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)]'
                      : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                </button>
              </div>
            ) : (
              isComplaintsOpen && (
                <div className="space-y-0.5">
                  {[
                    { id: 'all', label: 'All Complaints', icon: Inbox, count: taskCounts?.all ?? 0 },
                    {
                      id: 'assigned',
                      label: 'Pending Acceptance',
                      icon: AlertCircle,
                      count: taskCounts?.assigned ?? 0,
                    },
                    {
                      id: 'accepted',
                      label: 'Accepted',
                      icon: CheckCircle2,
                      count: taskCounts?.accepted ?? 0,
                    },
                    {
                      id: 'in_progress',
                      label: 'In Progress',
                      icon: PlayCircle,
                      count: taskCounts?.in_progress ?? 0,
                    },
                    {
                      id: 'resolved',
                      label: 'Work Done',
                      icon: CheckCircle2,
                      count: taskCounts?.resolved ?? 0,
                    },
                    {
                      id: 'rejected',
                      label: 'Rejected',
                      icon: XCircle,
                      count: taskCounts?.rejected ?? 0,
                    },
                  ].map((sub) => {
                    const isSubActive = isTasksActive && activeTaskFilter === sub.id;
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleTaskFilterClick(sub.id as TaskFilterType)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSubActive
                            ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)]'
                            : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                            isSubActive
                              ? 'bg-[var(--dept-accent)] text-white'
                              : 'bg-[var(--dept-surface-subtle)] text-[var(--dept-text-muted)]'
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
              <button
                type="button"
                onClick={() => handleTaskFilterClick('under_review')}
                title={isCollapsed ? 'Review Queue' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'
                } rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isReviewActive
                    ? 'dept-nav-active font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10'
                    : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-purple-500" />
                  {!isCollapsed && <span>Review Queue</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold">
                    {taskCounts?.under_review ?? 0}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Group 4: SYSTEM */}
          <div>
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--dept-text-muted)]">
                Other
              </div>
            )}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleNavClick('notifications')}
                title={isCollapsed ? 'Notifications' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'
                } rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentSection === 'notifications'
                    ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)]'
                    : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Notifications</span>}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                title={isCollapsed ? 'Settings' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-2' : 'justify-between px-2.5 py-1.5'
                } rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentSection === 'settings'
                    ? 'dept-nav-active font-semibold text-[var(--dept-accent)] bg-[var(--dept-accent-subtle)]'
                    : 'hover:bg-[var(--dept-surface-subtle)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Settings</span>}
                </div>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Segment: Staff Profile & Sign Out */}
      <div className="pt-3 border-t border-[var(--dept-border)]">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${username} (${departmentShort})`}
              className="w-8 h-8 rounded-full bg-[var(--dept-accent)] text-white flex items-center justify-center font-bold text-xs"
            >
              {initialLetter}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-md text-[var(--dept-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--dept-accent)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {initialLetter}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-[var(--dept-text-primary)] truncate leading-tight">
                  {username}
                </span>
                <span className="text-[10px] text-[var(--dept-text-muted)] truncate">
                  {departmentShort} Staff
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-md text-[var(--dept-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
