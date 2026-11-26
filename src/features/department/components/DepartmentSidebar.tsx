import React from 'react';
import {
  LayoutGrid,
  Inbox,
  MapPin,
  Flame,
  Layers,
  Archive,
  ClipboardList,
  HardHat,
  Users,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { isSupabaseConfigured } from '../../../lib/supabase';

export type WorkspaceSection =
  | 'dashboard'
  | 'overview'
  | 'queue'
  | 'archive'
  | 'tasks'
  | 'areas'
  | 'priority'
  | 'priority_queue'
  | 'review'
  | 'settings'
  | 'case'
  | 'home'
  | 'dispatch'
  | 'work_orders'
  | 'field'
  | 'team'
  | 'verification'
  | 'field_archive';

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
  staffPosition?: 'head' | 'officer' | null;
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
  staffPosition = null,
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
  const isArchiveActive = currentSection === 'archive';
  const isPriorityActive =
    currentSection === 'priority' || currentSection === 'priority_queue';
  const isReviewActive =
    currentSection === 'review' ||
    (currentSection === 'tasks' && activeTaskFilter === 'under_review');

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
          <span>{staffPosition === 'head' ? 'Department Head console' : staffPosition === 'officer' ? 'Field Officer workspace' : 'Department operations'}</span>
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

      <div className="nav-label">{staffPosition === 'head' ? 'FIELD OPERATIONS' : 'MY WORKSPACE'}</div>
      <nav className="navigation" aria-label="Main navigation">
        {staffPosition === 'head' && <>
          <button type="button" data-view="dispatch" onClick={() => handleNavClick('dispatch')} className={`nav-item ${currentSection === 'dispatch' ? 'active' : ''}`} aria-current={currentSection === 'dispatch' ? 'page' : undefined} data-tooltip="Dispatch desk"><ClipboardList className="ico" /><span>Dispatch desk</span></button>
          <button type="button" data-view="verification" onClick={() => handleNavClick('verification')} className={`nav-item ${currentSection === 'verification' ? 'active' : ''}`} aria-current={currentSection === 'verification' ? 'page' : undefined} data-tooltip="Proof verification"><FileCheck2 className="ico"/><span>Proof verification</span></button>
          <button type="button" data-view="team" onClick={() => handleNavClick('team')} className={`nav-item ${currentSection === 'team' ? 'active' : ''}`} aria-current={currentSection === 'team' ? 'page' : undefined} data-tooltip="Officer roster"><Users className="ico"/><span>Officer roster</span></button>
        </>}
        {staffPosition === 'officer' && <button type="button" data-view="field" onClick={() => handleNavClick('field')} className={`nav-item ${currentSection === 'field' ? 'active' : ''}`} aria-current={currentSection === 'field' ? 'page' : undefined} data-tooltip="My field work"><HardHat className="ico"/><span>My field work</span></button>}
        {staffPosition && <button type="button" data-view="field_archive" onClick={() => handleNavClick('field_archive')} className={`nav-item ${currentSection === 'field_archive' ? 'active' : ''}`} aria-current={currentSection === 'field_archive' ? 'page' : undefined} data-tooltip="Verified work archive"><Archive className="ico"/><span>Verified work</span></button>}
        {staffPosition !== 'officer' && <>
        <div className="nav-label nav-label-secondary" role="presentation">COMPLAINT RECORDS</div>
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

        <button
          type="button"
          data-view="archive"
          onClick={() => handleNavClick('archive')}
          className={`nav-item ${isArchiveActive ? 'active' : ''}`}
          aria-current={isArchiveActive ? 'page' : undefined}
          data-tooltip="Completed cases"
        >
          <Archive className="ico" />
          <span>Completed cases</span>
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
        </>}
      </nav>

      {/* Bottom Account Card */}
      <div className="sidebar-footer">
        <div className="avatar">{initialLetter}</div>
        <div className="account-copy">
          <strong>{username}</strong>
          <span>
            {departmentShort} · {departmentDesc}
          </span>
          {!isSupabaseConfigured() && <span className="staff-demo-label">Local demonstration</span>}
        </div>
        <span className="account-presence" title="Active session" />
      </div>
    </aside>
  );
};
