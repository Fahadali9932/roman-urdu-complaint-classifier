import React from 'react';
import {
  LayoutGrid,
  Inbox,
  Flame,
  Layers,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';

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
  isMobileOpen?: boolean;
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
  isMobileOpen = false,
}) => {
  const { session, departmentMeta, departmentId } = useDepartmentAuth();

  const isKmc = departmentId === 'kmc';
  const username = session?.username || 'roads-01';
  const initialLetter = username.charAt(0).toUpperCase() || 'R';
  const departmentShort = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');

  const isOverviewActive = currentSection === 'dashboard';
  const isComplaintsActive = currentSection === 'tasks' && activeTaskFilter !== 'under_review';
  const isPriorityActive = currentSection === 'priority_queue';
  const isReviewActive = currentSection === 'tasks' && activeTaskFilter === 'under_review';
  const isSettingsActive = currentSection === 'settings';

  const handleNavClick = (section: WorkspaceSection, filter?: TaskFilterType) => {
    if (filter && onSelectTaskFilter) {
      onSelectTaskFilter(filter);
    }
    onSelectSection(section);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  return (
    <aside
      id="sidebar"
      aria-label="Department Navigation"
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
    >
      {/* Brand row with logo, monogram, titles, and collapse button */}
      <div className="brand-row">
        <div className="brand-mark">a.</div>
        <div className="brand-words">
          <strong>Awaaz-e-Awam</strong>
          <span>Department workspace</span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            id="collapseButton"
            onClick={onToggleCollapse}
            className="icon-button collapse-btn"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="icon" />
          </button>
        )}
      </div>

      {/* Navigation items scroll area */}
      <div className="sidebar-scroll">
        <span className="nav-section">Workspace</span>
        <nav className="primary-nav" aria-label="Main navigation">
          {/* Overview */}
          <button
            type="button"
            data-view="dashboard"
            onClick={() => handleNavClick('dashboard')}
            className={`nav-link ${isOverviewActive ? 'active' : ''}`}
            aria-current={isOverviewActive ? 'page' : undefined}
          >
            <LayoutGrid className="icon" />
            <span className="nav-text">Overview</span>
          </button>

          {/* Complaints */}
          <button
            type="button"
            data-view="complaints"
            onClick={() => handleNavClick('tasks', 'all')}
            className={`nav-link ${isComplaintsActive ? 'active' : ''}`}
            aria-current={isComplaintsActive ? 'page' : undefined}
          >
            <Inbox className="icon" />
            <span className="nav-text">Complaints</span>
            <span className="nav-count" id="complaintCount">{complaintsCount}</span>
          </button>

          {/* Priority queue */}
          <button
            type="button"
            data-view="priority"
            onClick={() => handleNavClick('priority_queue')}
            className={`nav-link ${isPriorityActive ? 'active' : ''}`}
            aria-current={isPriorityActive ? 'page' : undefined}
          >
            <Flame className="icon" />
            <span className="nav-text">Priority queue</span>
            {priorityCount > 0 && (
              <span className="nav-count priority-count" id="priorityCount">{priorityCount}</span>
            )}
          </button>

          {/* Review queue (KMC clearinghouse only) */}
          {isKmc && (
            <button
              type="button"
              data-view="review"
              onClick={() => handleNavClick('tasks', 'under_review')}
              className={`nav-link ${isReviewActive ? 'active' : ''}`}
              aria-current={isReviewActive ? 'page' : undefined}
            >
              <Layers className="icon" />
              <span className="nav-text">Review Queue</span>
              {reviewCount > 0 && (
                <span className="nav-count">{reviewCount}</span>
              )}
            </button>
          )}
        </nav>

        <span className="nav-section secondary-section">Preferences</span>
        <nav className="primary-nav" aria-label="Preferences navigation">
          {/* Settings */}
          <button
            type="button"
            data-view="settings"
            onClick={() => handleNavClick('settings')}
            className={`nav-link ${isSettingsActive ? 'active' : ''}`}
            aria-current={isSettingsActive ? 'page' : undefined}
          >
            <Settings className="icon" />
            <span className="nav-text">Settings</span>
          </button>
        </nav>
      </div>

      {/* Bottom Account Card */}
      <div className="sidebar-bottom">
        <div className="avatar">{initialLetter}</div>
        <div className="account-info">
          <strong>{username}</strong>
          <span>{departmentShort} · Department staff</span>
        </div>
        <div className="bottom-dot" title="Authenticated session" />
      </div>
    </aside>
  );
};
