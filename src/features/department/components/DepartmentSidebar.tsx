import React from 'react';
import {
  BarChart3,
  Bell,
  CheckSquare2,
  Settings,
  LogOut,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useNavigate } from 'react-router-dom';

export type WorkspaceSection = 'home' | 'dashboard' | 'notifications' | 'tasks' | 'settings';
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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  currentSection,
  onSelectSection,
  activeTaskFilter,
  onSelectTaskFilter,
  taskCounts,
  onCloseMobileDrawer,
}) => {
  const { session, departmentMeta, departmentId, signOut } = useDepartmentAuth();
  const navigate = useNavigate();

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

  const handleTasksClick = () => {
    onSelectSection('tasks');
    if (activeTaskFilter === 'under_review') {
      onSelectTaskFilter('all');
    }
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const handleReviewQueueClick = () => {
    onSelectSection('tasks');
    onSelectTaskFilter('under_review');
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');

  const isTasksActive = currentSection === 'tasks' && activeTaskFilter !== 'under_review';
  const isReviewActive = currentSection === 'tasks' && activeTaskFilter === 'under_review';

  return (
    <aside className="w-full h-full flex flex-col justify-between p-3.5 sm:p-4 text-slate-300 select-none bg-[var(--dept-dark-shell)]">
      {/* Top Segment: Brand & Primary Navigation */}
      <div className="space-y-4">
        {/* Brand Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center font-serif font-black text-white text-sm shadow-inner">
              a.
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-white leading-tight">
                Awaaz-e-Awam
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                {departmentShort} Workspace
              </span>
            </div>
          </div>

          {onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              aria-label="Close navigation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1" aria-label="Main Navigation">
          {/* 1. Tasks / Department Complaints */}
          <button
            type="button"
            onClick={handleTasksClick}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isTasksActive
                ? 'dept-nav-active font-semibold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare2 className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Tasks</span>
            </div>
            {taskCounts && (
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {taskCounts.all}
              </span>
            )}
          </button>

          {/* 2. Review Queue (Restricted to KMC Clearinghouse) */}
          {departmentId === 'kmc' && (
            <button
              type="button"
              onClick={handleReviewQueueClick}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isReviewActive
                  ? 'bg-purple-500/15 text-purple-200 border-l-[3px] border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-purple-200 hover:bg-purple-500/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-purple-400" />
                <span>Review Queue</span>
              </div>
              {taskCounts?.under_review !== undefined && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    taskCounts.under_review > 0
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-500'
                  }`}
                >
                  {taskCounts.under_review}
                </span>
              )}
            </button>
          )}

          {/* 3. Dashboard */}
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              currentSection === 'dashboard'
                ? 'dept-nav-active font-semibold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Dashboard</span>
          </button>

          {/* 4. Notifications */}
          <button
            type="button"
            onClick={() => handleNavClick('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              currentSection === 'notifications'
                ? 'dept-nav-active font-semibold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Notifications</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-500">
              0
            </span>
          </button>

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              currentSection === 'settings'
                ? 'dept-nav-active font-semibold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Bottom Segment: Compact Staff Account & Sign Out */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0"
              style={{
                backgroundColor: 'var(--dept-accent-muted)',
                color: 'var(--dept-accent)',
              }}
            >
              {initialLetter}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-white truncate">
                {username}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {departmentShort} Staff
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
