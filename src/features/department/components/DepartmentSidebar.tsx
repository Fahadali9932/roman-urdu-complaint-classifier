import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  AlertOctagon,
  ShieldAlert,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useNavigate } from 'react-router-dom';
import { CivicTooltip, CivicTooltipProvider } from './CivicTooltip';

export type WorkspaceSection = 'dashboard' | 'tasks' | 'priority_queue' | 'settings' | 'home';
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
  activeTaskFilter?: TaskFilterType;
  onSelectTaskFilter?: (filter: TaskFilterType) => void;
  complaintsCount?: number;
  priorityCount?: number;
  reviewCount?: number;
  onCloseMobileDrawer?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  currentSection,
  onSelectSection,
  activeTaskFilter = 'all',
  onSelectTaskFilter,
  complaintsCount = 0,
  priorityCount = 0,
  reviewCount = 0,
  onCloseMobileDrawer,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { session, departmentMeta, departmentId, signOut } = useDepartmentAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/department/login');
  };

  const isKmc = departmentId === 'kmc';
  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');
  const departmentName = departmentMeta?.name || 'Municipal Agency';

  const isTasksActive = currentSection === 'tasks' && activeTaskFilter !== 'under_review';
  const isReviewActive = currentSection === 'tasks' && activeTaskFilter === 'under_review';

  return (
    <CivicTooltipProvider delayDuration={150}>
      <aside
        aria-label="Department Navigation"
        className="w-full h-full flex flex-col justify-between p-3 select-none text-[var(--dept-text-secondary)]"
      >
        {/* Top Segment: Brand & Navigation */}
        <div className="space-y-4">
          {/* Brand Header */}
          {isCollapsed ? (
            /* Collapsed Header */
            <div className="flex flex-col items-center gap-2 pb-3 border-b border-[var(--dept-border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm shrink-0 shadow-xs">
                a.
              </div>
              {onToggleCollapse && (
                <CivicTooltip content="Expand navigation (248px)" side="right">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-md hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] transition-colors cursor-pointer"
                    aria-label="Expand navigation"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </CivicTooltip>
              )}
            </div>
          ) : (
            /* Expanded Header */
            <div className="flex items-center justify-between pb-3 border-b border-[var(--dept-border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--dept-accent)] text-white flex items-center justify-center font-serif font-black text-sm shrink-0 shadow-xs">
                  a.
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm tracking-tight text-[var(--dept-text-primary)] truncate">
                    Awaaz-e-Awam
                  </div>
                  <div className="text-[11px] text-[var(--dept-text-muted)] truncate">
                    {departmentShort} Workspace
                  </div>
                </div>
              </div>

              {/* Close Mobile Drawer or Collapse Sidebar */}
              {onCloseMobileDrawer ? (
                <button
                  type="button"
                  onClick={onCloseMobileDrawer}
                  className="p-1.5 rounded-md text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-hover)] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : onToggleCollapse ? (
                <CivicTooltip content="Collapse navigation (72px)" side="right">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-md text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-hover)] transition-colors cursor-pointer"
                    aria-label="Collapse navigation"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </CivicTooltip>
              ) : null}
            </div>
          )}

          {/* Navigation Links */}
          <nav aria-label="Main Navigation" className="space-y-1">
            {/* 1. Overview (Dashboard) */}
            {isCollapsed ? (
              <CivicTooltip content="Overview & Operational Telemetry" side="right">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSection('dashboard');
                    if (onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                    currentSection === 'dashboard'
                      ? 'dept-nav-active'
                      : 'hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)]'
                  }`}
                  aria-current={currentSection === 'dashboard' ? 'page' : undefined}
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
              </CivicTooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelectSection('dashboard');
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentSection === 'dashboard'
                    ? 'dept-nav-active'
                    : 'hover:bg-[var(--dept-surface-hover)] hover:text-[var(--dept-text-primary)]'
                }`}
                aria-current={currentSection === 'dashboard' ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-[var(--dept-text-muted)]" />
                  <span>Overview</span>
                </div>
              </button>
            )}

            {/* 2. Complaints */}
            {isCollapsed ? (
              <CivicTooltip content={`Complaints (${complaintsCount})`} side="right">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectTaskFilter && activeTaskFilter === 'under_review') {
                        onSelectTaskFilter('all');
                      }
                      onSelectSection('tasks');
                      if (onCloseMobileDrawer) onCloseMobileDrawer();
                    }}
                    className={`w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                      isTasksActive
                        ? 'dept-nav-active'
                        : 'hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)]'
                    }`}
                    aria-current={isTasksActive ? 'page' : undefined}
                  >
                    <Inbox className="w-4 h-4" />
                  </button>
                  {complaintsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--dept-accent)] ring-2 ring-[var(--dept-sidebar-bg)]" />
                  )}
                </div>
              </CivicTooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onSelectTaskFilter && activeTaskFilter === 'under_review') {
                    onSelectTaskFilter('all');
                  }
                  onSelectSection('tasks');
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isTasksActive
                    ? 'dept-nav-active'
                    : 'hover:bg-[var(--dept-surface-hover)] hover:text-[var(--dept-text-primary)]'
                }`}
                aria-current={isTasksActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-[var(--dept-text-muted)]" />
                  <span>Complaints</span>
                </div>
                {complaintsCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-[var(--dept-surface-subtle)] text-[var(--dept-text-primary)] border border-[var(--dept-border)]">
                    {complaintsCount}
                  </span>
                )}
              </button>
            )}

            {/* 3. Priority Queue */}
            {isCollapsed ? (
              <CivicTooltip content={`Priority Queue (${priorityCount})`} side="right">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSection('priority_queue');
                      if (onCloseMobileDrawer) onCloseMobileDrawer();
                    }}
                    className={`w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                      currentSection === 'priority_queue'
                        ? 'dept-nav-active'
                        : 'hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)]'
                    }`}
                    aria-current={currentSection === 'priority_queue' ? 'page' : undefined}
                  >
                    <AlertOctagon className="w-4 h-4" />
                  </button>
                  {priorityCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-[var(--dept-sidebar-bg)]" />
                  )}
                </div>
              </CivicTooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelectSection('priority_queue');
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentSection === 'priority_queue'
                    ? 'dept-nav-active'
                    : 'hover:bg-[var(--dept-surface-hover)] hover:text-[var(--dept-text-primary)]'
                }`}
                aria-current={currentSection === 'priority_queue' ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className="w-4 h-4 text-[var(--dept-text-muted)]" />
                  <span>Priority Queue</span>
                </div>
                {priorityCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border border-[var(--status-urgent-border)] bg-[var(--status-urgent-bg)] text-[var(--status-urgent-text)]">
                    {priorityCount}
                  </span>
                )}
              </button>
            )}

            {/* 4. Review Queue (KMC Clearinghouse Only) */}
            {isKmc && (
              isCollapsed ? (
                <CivicTooltip content={`Classification Review Queue (${reviewCount})`} side="right">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTaskFilter) {
                          onSelectTaskFilter('under_review');
                        }
                        onSelectSection('tasks');
                        if (onCloseMobileDrawer) onCloseMobileDrawer();
                      }}
                      className={`w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                        isReviewActive
                          ? 'dept-nav-active'
                          : 'hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)]'
                      }`}
                      aria-current={isReviewActive ? 'page' : undefined}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    {reviewCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-[var(--dept-sidebar-bg)]" />
                    )}
                  </div>
                </CivicTooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectTaskFilter) {
                      onSelectTaskFilter('under_review');
                    }
                    onSelectSection('tasks');
                    if (onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isReviewActive
                      ? 'dept-nav-active'
                      : 'hover:bg-[var(--dept-surface-hover)] hover:text-[var(--dept-text-primary)]'
                  }`}
                  aria-current={isReviewActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[var(--dept-text-muted)]" />
                    <span>Review Queue</span>
                  </div>
                  {reviewCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800">
                      {reviewCount}
                    </span>
                  )}
                </button>
              )
            )}

            {/* 5. Settings */}
            {isCollapsed ? (
              <CivicTooltip content="Workspace Settings" side="right">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSection('settings');
                    if (onCloseMobileDrawer) onCloseMobileDrawer();
                  }}
                  className={`w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer ${
                    currentSection === 'settings'
                      ? 'dept-nav-active'
                      : 'hover:bg-[var(--dept-surface-hover)] text-[var(--dept-text-muted)] hover:text-[var(--dept-text-primary)]'
                  }`}
                  aria-current={currentSection === 'settings' ? 'page' : undefined}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </CivicTooltip>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelectSection('settings');
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  currentSection === 'settings'
                    ? 'dept-nav-active'
                    : 'hover:bg-[var(--dept-surface-hover)] hover:text-[var(--dept-text-primary)]'
                }`}
                aria-current={currentSection === 'settings' ? 'page' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[var(--dept-text-muted)]" />
                  <span>Settings</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Bottom Segment: Staff Account Card */}
        <div className="pt-3 border-t border-[var(--dept-border)]">
          {isCollapsed ? (
            <CivicTooltip content={`${username} (${departmentShort}) · Sign Out`} side="right">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex justify-center p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[var(--dept-text-muted)] hover:text-rose-600 transition-colors cursor-pointer"
                aria-label={`Sign out ${username}`}
              >
                <div className="w-7 h-7 rounded-full bg-[var(--dept-accent-subtle)] border border-[var(--dept-border)] text-[var(--dept-accent-text)] font-bold text-xs flex items-center justify-center">
                  {initialLetter}
                </div>
              </button>
            </CivicTooltip>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--dept-accent-subtle)] border border-[var(--dept-border)] text-[var(--dept-accent-text)] font-bold text-xs flex items-center justify-center shrink-0">
                  {initialLetter}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--dept-text-primary)] truncate font-mono">
                    {username}
                  </div>
                  <div className="text-[10px] text-[var(--dept-text-muted)] truncate" title={departmentName}>
                    {departmentShort} Staff
                  </div>
                </div>
              </div>

              <CivicTooltip content="Sign Out" side="top">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/60 text-[var(--dept-text-muted)] hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </CivicTooltip>
            </div>
          )}
        </div>
      </aside>
    </CivicTooltipProvider>
  );
};
