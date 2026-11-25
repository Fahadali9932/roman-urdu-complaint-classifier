import React, { useMemo } from 'react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import type { WorkspaceSection } from './DepartmentSidebar';
import type { StaffPosition } from '../services/fieldOperations';
import { V3TopNav, type V3NavTab } from '../../../components/v3';

interface DepartmentTopbarProps {
  currentSection: WorkspaceSection;
  activeTaskFilter?: string;
  selectedReference?: string | null;
  selectedCaseId?: string | null;
  onOpenMobileDrawer?: () => void;
  onSelectSection?: (section: WorkspaceSection) => void;
  themeMode?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSignOut?: () => void;
  onOpenPasswordModal?: () => void;
  staffPosition?: StaffPosition | null;
  menuOpen?: boolean;
  onToggleWorkspaceMenu?: () => void;
}

/**
 * Floating Atmospheric Civic Glass pill header shared across Department Head
 * and Field Officer workspaces (replaces legacy multi-row chrome & sidebar).
 */
export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  onSelectSection,
  themeMode = 'light',
  onToggleTheme,
  staffPosition = 'head',
  menuOpen = false,
  onToggleWorkspaceMenu,
}) => {
  const { departmentId, departmentMeta, session } = useDepartmentAuth();
  const isHead = staffPosition !== 'officer';
  const username = session?.username || (isHead ? 'roads-01' : 'roads-02');
  const departmentCode = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');

  const avatarInitial = useMemo(() => {
    if (isHead) return 'H';
    if (staffPosition === 'officer') return 'O';
    return username.slice(0, 1).toUpperCase() || 'S';
  }, [isHead, staffPosition, username]);

  const tabs: V3NavTab[] = isHead
    ? [
        {
          id: 'dashboard',
          label: 'Focus',
          active: !menuOpen && (currentSection === 'dashboard' || currentSection === 'overview'),
          onClick: () => onSelectSection?.('dashboard'),
        },
        {
          id: 'queue',
          label: 'Complaints',
          active:
            !menuOpen &&
            (currentSection === 'queue' || currentSection === 'tasks' || currentSection === 'review'),
          onClick: () => onSelectSection?.('queue'),
        },
        {
          id: 'dispatch',
          label: 'Dispatch',
          active: !menuOpen && currentSection === 'dispatch',
          onClick: () => onSelectSection?.('dispatch'),
        },
        {
          id: 'verification',
          label: 'Proof',
          active: !menuOpen && currentSection === 'verification',
          onClick: () => onSelectSection?.('verification'),
        },
      ]
    : [
        {
          id: 'field',
          label: 'My day',
          active: !menuOpen && (currentSection === 'field' || currentSection === 'overview' || currentSection === 'dashboard'),
          onClick: () => onSelectSection?.('field'),
        },
        {
          id: 'tasks',
          label: 'Assignments',
          active: !menuOpen && currentSection === 'tasks',
          onClick: () => onSelectSection?.('tasks'),
        },
        {
          id: 'field_archive',
          label: 'History',
          active: !menuOpen && currentSection === 'field_archive',
          onClick: () => onSelectSection?.('field_archive'),
        },
      ];

  return (
    <V3TopNav
      brandLabel={`Awaaz-e-Awam · ${departmentCode}`}
      tabs={tabs}
      onOpenMenu={() => onToggleWorkspaceMenu?.()}
      menuOpen={menuOpen}
      theme={themeMode}
      onToggleTheme={() => onToggleTheme?.()}
      avatarInitial={avatarInitial}
      avatarLabel={`${username} (${isHead ? 'Department Head' : 'Field Officer'})`}
    />
  );
};
