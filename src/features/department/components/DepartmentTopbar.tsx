import React, { useMemo } from 'react';
import { Menu } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import type { WorkspaceSection } from './DepartmentSidebar';

interface DepartmentTopbarProps {
  currentSection: WorkspaceSection;
  activeTaskFilter?: string;
  selectedReference?: string | null;
  selectedCaseId?: string | null;
  onOpenMobileDrawer?: () => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSignOut?: () => void;
}

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  activeTaskFilter,
  selectedReference,
  selectedCaseId,
  onOpenMobileDrawer,
}) => {
  const { departmentId, departmentMeta } = useDepartmentAuth();

  const getSectionLabel = () => {
    if (selectedReference) {
      return `Complaint ${selectedReference}`;
    }
    if (selectedCaseId) {
      return `Case ${selectedCaseId}`;
    }
    switch (currentSection) {
      case 'dashboard':
      case 'overview':
        return 'Overview';
      case 'areas':
        return 'Areas';
      case 'priority':
      case 'priority_queue':
        return 'Priority';
      case 'review':
        return 'Review queue';
      case 'settings':
        return 'Settings';
      case 'queue':
      case 'tasks':
      default:
        if (activeTaskFilter === 'under_review') return 'Review queue';
        return 'Work queue';
    }
  };

  const departmentName = departmentMeta?.name || 'Karachi Metropolitan Corporation';
  const departmentCode =
    departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');

  // Today's date formatted in PKT (e.g. 15 Nov 2026)
  const todayPkt = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  return (
    <header className="topbar" aria-label="Department Top Navigation">
      <div className="topbar-left">
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="icon-btn mobile-menu"
            aria-label="Open navigation menu"
          >
            <Menu className="ico" style={{ width: 18, height: 18 }} />
          </button>
        )}
        <span className="crumb">{departmentCode} workspace</span>
        <span className="crumb-divider">/</span>
        <strong className="crumb-current" id="crumbCurrent">
          {getSectionLabel()}
        </strong>
      </div>

      <div className="topbar-right">
        <span className="demo-note">{todayPkt}</span>
        <div className="topbar-divider" />
        <strong>{departmentCode}</strong>
        <span className="org-name">{departmentName}</span>
      </div>
    </header>
  );
};
