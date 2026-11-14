import React, { useState } from 'react';
import {
  Home,
  BarChart3,
  Bell,
  CheckSquare2,
  ChevronDown,
  ChevronUp,
  Settings,
  Search,
  LogOut,
  Building,
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  searchQuery,
  onSearchChange,
  taskCounts,
  onCloseMobileDrawer,
}) => {
  const { session, departmentMeta, signOut } = useDepartmentAuth();
  const navigate = useNavigate();
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);

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

  const handleTaskFilterClick = (filter: TaskFilterType, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectSection('tasks');
    onSelectTaskFilter(filter);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  // User badge initials
  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentName = departmentMeta?.name || 'Municipal Agency';

  return (
    <aside className="w-full h-full flex flex-col justify-between p-5 text-slate-300 select-none">
      {/* Top Segment: Brand, Search, Primary Navigation */}
      <div className="space-y-5">
        {/* Brand Wordmark (Single, Clean) */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-serif font-black text-white text-base shadow-inner">
              a.
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white leading-tight">
                Awaaz-e-Awam
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Department Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Scoped Search Input (Searches department complaints only) */}
        <div className="relative">
          <div className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus-within:border-white/30 transition-all flex items-center gap-2 text-slate-400 focus-within:text-white">
            <Search className="w-4 h-4 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by reference, locality, or keyword..."
              className="w-full bg-transparent border-0 outline-none text-xs text-white placeholder:text-slate-500"
              aria-label="Search accessible complaints"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 rounded border border-white/10">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentSection === 'home'
                ? 'dept-nav-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </button>

          {/* 2. Dashboard */}
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentSection === 'dashboard'
                ? 'dept-nav-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* 3. Notifications */}
          <button
            type="button"
            onClick={() => handleNavClick('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentSection === 'notifications'
                ? 'dept-nav-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
              0
            </span>
          </button>

          {/* 4. Tasks (Expandable) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                if (currentSection !== 'tasks') {
                  onSelectSection('tasks');
                } else {
                  setIsTasksExpanded(!isTasksExpanded);
                }
              }}
              aria-expanded={isTasksExpanded}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                currentSection === 'tasks' && activeTaskFilter === 'all'
                  ? 'dept-nav-active'
                  : currentSection === 'tasks'
                  ? 'bg-white/[0.06] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare2 className="w-4 h-4 shrink-0" />
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                {taskCounts && (
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                    {taskCounts.all}
                  </span>
                )}
                {isTasksExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Indented Sub-items: Pending Acceptance, Accepted, In Progress, Work Done, Rejected */}
            {isTasksExpanded && (
              <div className="ml-5 mt-1.5 pl-4 border-l border-white/15 space-y-1">
                {/* 1. All Complaints */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('all', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'all'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-slate-300/40" />
                    <span>All Complaints</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.all}
                    </span>
                  )}
                </button>

                {/* 2. Review Queue (under_review) */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('under_review', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'under_review'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-purple-400 bg-purple-400/70 shadow-sm" />
                    <span>Review Queue</span>
                  </div>
                  {taskCounts && taskCounts.under_review !== undefined && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      taskCounts.under_review > 0
                        ? 'text-purple-300 bg-purple-500/20 font-bold border border-purple-500/30'
                        : 'text-slate-400'
                    }`}>
                      {taskCounts.under_review}
                    </span>
                  )}
                </button>

                {/* 2. Pending Acceptance (assigned) */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('assigned', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'assigned'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-amber-400 bg-amber-400/60" />
                    <span>Pending Acceptance</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.assigned}
                    </span>
                  )}
                </button>

                {/* 3. Accepted */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('accepted', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'accepted'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-sky-400 bg-sky-400/60" />
                    <span>Accepted</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.accepted}
                    </span>
                  )}
                </button>

                {/* 4. In Progress */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('in_progress', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'in_progress'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-indigo-400 bg-indigo-400/60" />
                    <span>In Progress</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.in_progress}
                    </span>
                  )}
                </button>

                {/* 5. Work Done */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('resolved', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'resolved'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-emerald-400 bg-emerald-400/60" />
                    <span>Work Done</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.resolved}
                    </span>
                  )}
                </button>

                {/* 6. Rejected */}
                <button
                  type="button"
                  onClick={(e) => handleTaskFilterClick('rejected', e)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    currentSection === 'tasks' && activeTaskFilter === 'rejected'
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full border border-red-400 bg-red-400/60" />
                    <span>Rejected</span>
                  </div>
                  {taskCounts && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {taskCounts.rejected}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              currentSection === 'settings'
                ? 'dept-nav-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Bottom Segment: Anchored Profile Card with Real Identity & Logout */}
      <div className="pt-6 border-t border-white/[0.08]">
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-white/15"
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
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Building className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{departmentName}</span>
              </div>
            </div>
          </div>

          {/* Working Sign Out Action */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full h-8 px-3 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
