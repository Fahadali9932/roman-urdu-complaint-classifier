import React from 'react';
import { Menu } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';

interface DepartmentTopbarProps {
  currentSection: 'dashboard' | 'tasks' | 'priority_queue' | 'settings' | 'home';
  activeTaskFilter?: string;
  selectedReference?: string | null;
  onOpenMobileDrawer?: () => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSignOut?: () => void;
}

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  activeTaskFilter,
  selectedReference,
  onOpenMobileDrawer,
}) => {
  const { departmentId, departmentMeta } = useDepartmentAuth();

  const getSectionLabel = () => {
    if (selectedReference) {
      return `Complaint ${selectedReference}`;
    }
    switch (currentSection) {
      case 'dashboard':
        return 'Overview';
      case 'priority_queue':
        return 'Priority queue';
      case 'settings':
        return 'Settings';
      case 'tasks':
      default:
        if (activeTaskFilter === 'under_review') return 'Review queue';
        return 'Complaints';
    }
  };

  const departmentName = departmentMeta?.name || 'Municipal Agency';
  const departmentCode = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');

  // Today's date formatted in PKT (e.g. 15 Nov 2026)
  const todayPkt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="topbar" aria-label="Department Top Navigation">
      <div className="topbar-left">
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="icon-button mobile-menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="breadcrumb-root">{departmentCode} workspace</span>
        <span className="crumb-sep">/</span>
        <span className="breadcrumb-current" id="breadcrumb">{getSectionLabel()}</span>
      </div>

      <div className="topbar-right">
        <span className="demo-note">{todayPkt}</span>
        <div className="topbar-divider" />
        <div className="department-tag" title={`${departmentCode} · ${departmentName}`}>
          {departmentCode} <span>· {departmentName}</span>
        </div>
      </div>
    </header>
  );
};
