import React from 'react';
import {
  LayoutGrid,
  Inbox,
  MapPin,
  Flame,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';

export type WorkspaceSection =
  | 'dashboard'
  | 'overview'
  | 'queue'
  | 'tasks'
  | 'areas'
  | 'priority'
  | 'priority_queue'
  | 'review'
  | 'settings'
  | 'case'
  | 'home';

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
  const departmentShort =
    departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');
  const departmentDesc =
    departmentId === 'kmc'
      ? 'Road works'
      : departmentId === 'kwsc'
      ? 'Water & Sewerage'
      : departmentId === 'kelectric'
      ? 'Power grid'
      : departmentId === 'ssgc'
      ? 'Gas distribution'
      : departmentId === 'sbca'
      ? 'Building control'
      : 'Sanitation';

  const isOverviewActive =
    currentSection === 'dashboard' || currentSection === 'overview';
  const isQueueActive =
    (currentSection === 'queue' || currentSection === 'tasks') &&
    activeTaskFilter !== 'under_review';
  const isAreasActive = currentSection === 'areas';
  const isPriorityActive =
    currentSection === 'priority' || currentSection === 'priority_queue';
  const isReviewActive =
    currentSection === 'review' ||
    (currentSection === 'tasks' && activeTaskFilter === 'under_review');
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
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${
        isMobileOpen ? 'mobile-open' : ''
      }`}
    >
      {/* Brand row with logo, monogram, titles, and collapse button */}
      <div className="brand-line">
        <div className="mark" aria-hidden="true">
          a.
        </div>
        <div className="brand-copy">
          <strong>Awaaz-e-Awam</strong>
          <span>Department operations</span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            id="collapseButton"
            onClick={onToggleCollapse}
            className="icon-btn collapse-btn"
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isCollapsed ? (
              <ChevronRight className="ico" />
            ) : (
              <ChevronLeft className="ico" />
            )}
          </button>
        )}
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav className="navigation" aria-label="Main navigation">
        {/* Overview */}
        <button
          type="button"
          data-view="overview"
          onClick={() => handleNavClick('overview')}
          className={`nav-item ${isOverviewActive ? 'active' : ''}`}
          aria-current={isOverviewActive ? 'page' : undefined}
          data-tooltip="Overview"
        >
          <LayoutGrid className="ico" />
          <span>Overview</span>
        </button>

        {/* Work queue */}
        <button
          type="button"
          data-view="queue"
          data-view-alias="complaints"
          onClick={() => handleNavClick('queue', 'all')}
          className={`nav-item ${isQueueActive ? 'active' : ''}`}
          aria-current={isQueueActive ? 'page' : undefined}
          data-tooltip="Work queue"
        >
          <Inbox className="ico" />
          <span>Work queue</span>
          <b className="nav-count" id="queueCount">
            {complaintsCount}
          </b>
        </button>

        {/* Areas */}
        <button
          type="button"
          data-view="areas"
          onClick={() => handleNavClick('areas')}
          className={`nav-item ${isAreasActive ? 'active' : ''}`}
          aria-current={isAreasActive ? 'page' : undefined}
          data-tooltip="Areas"
        >
          <MapPin className="ico" />
          <span>Areas</span>
        </button>

        {/* Priority queue */}
        <button
          type="button"
          data-view="priority"
          onClick={() => handleNavClick('priority')}
          className={`nav-item ${isPriorityActive ? 'active' : ''}`}
          aria-current={isPriorityActive ? 'page' : undefined}
          data-tooltip="Priority"
        >
          <Flame className="ico" />
          <span>Priority</span>
          <b className="nav-count danger-count" id="priorityCount">
            {priorityCount}
          </b>
        </button>

        {/* Review queue (KMC clearinghouse only) */}
        {isKmc && (
          <button
            type="button"
            data-view="review"
            onClick={() => handleNavClick('tasks', 'under_review')}
            className={`nav-item ${isReviewActive ? 'active' : ''}`}
            aria-current={isReviewActive ? 'page' : undefined}
            data-tooltip="Review queue"
          >
            <Layers className="ico" />
            <span>Review Queue</span>
            <b className="nav-count review-count" id="reviewCount">
              {reviewCount}
            </b>
          </button>
        )}
      </nav>

      <div className="nav-label nav-second">PREFERENCES</div>
      <nav className="navigation" aria-label="Preferences navigation">
        {/* Settings */}
        <button
          type="button"
          data-view="settings"
          onClick={() => handleNavClick('settings')}
          className={`nav-item ${isSettingsActive ? 'active' : ''}`}
          aria-current={isSettingsActive ? 'page' : undefined}
          data-tooltip="Settings"
        >
          <Settings className="ico" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Bottom Account Card */}
      <div className="sidebar-footer">
        <div className="avatar">{initialLetter}</div>
        <div className="account-copy">
          <strong>{username}</strong>
          <span>
            {departmentShort} · {departmentDesc}
          </span>
        </div>
        <span className="account-presence" title="Active session" />
      </div>
    </aside>
  );
};
