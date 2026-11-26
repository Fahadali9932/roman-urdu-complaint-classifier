import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  Inbox,
  Send,
  ClipboardList,
  ShieldCheck,
  Users,
  Archive,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import type { WorkspaceSection } from './DepartmentSidebar';

interface HeadSidebarNavProps {
  departmentCode: string;
  departmentName: string;
  username: string;
  currentSection: WorkspaceSection;
  activeTaskFilter?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSection: (section: WorkspaceSection) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onSignOut: () => void;
  proofCount?: number;
  unassignedCount?: number;
}

interface SidebarNavItem {
  id: string;
  label: string;
  section?: WorkspaceSection;
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>;
  badge?: number;
  isSettings?: boolean;
}

/**
 * V15.0 Iconsax-inspired Collapsible Vertical Navigation Rail
 * Collapsed width: 68px | Expanded width: 216px
 * Selected item carries restrained purple illumination while the surrounding workspace stays neutral.
 */
export const HeadSidebarNav: React.FC<HeadSidebarNavProps> = ({
  departmentCode,
  departmentName,
  username,
  currentSection,
  activeTaskFilter,
  collapsed,
  onToggleCollapse,
  onSelectSection,
  themeMode,
  onToggleTheme,
  onOpenPasswordModal,
  onSignOut,
  proofCount = 0,
  unassignedCount = 0,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        settingsBtnRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(target)
      ) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [settingsOpen]);

  const navItems: SidebarNavItem[] = [
    { id: 'home', label: 'Home', section: 'dashboard', icon: Home },
    { id: 'complaints', label: 'Complaints', section: 'queue', icon: Inbox, badge: unassignedCount > 0 ? unassignedCount : undefined },
    { id: 'dispatch', label: 'Dispatch', section: 'dispatch', icon: Send },
    { id: 'work_orders', label: 'Work orders', section: 'work_orders', icon: ClipboardList },
    { id: 'verification', label: 'Proof review', section: 'verification', icon: ShieldCheck, badge: proofCount > 0 ? proofCount : undefined },
    { id: 'officers', label: 'Officers', section: 'team', icon: Users },
    { id: 'archive', label: 'Archive', section: 'field_archive', icon: Archive },
    { id: 'settings', label: 'Settings', icon: Settings, isSettings: true },
  ];

  const isNavItemActive = (item: SidebarNavItem) => {
    if (item.isSettings) return settingsOpen || currentSection === 'review';
    if (item.id === 'home') return currentSection === 'dashboard' || currentSection === 'overview' || currentSection === 'home';
    if (item.id === 'complaints') {
      return (
        (currentSection === 'queue' || currentSection === 'tasks' || currentSection === 'areas' || currentSection === 'priority' || currentSection === 'priority_queue') &&
        activeTaskFilter !== 'under_review'
      );
    }
    if (item.id === 'dispatch') return currentSection === 'dispatch';
    if (item.id === 'work_orders') return currentSection === 'work_orders';
    if (item.id === 'verification') return currentSection === 'verification';
    if (item.id === 'officers') return currentSection === 'team';
    if (item.id === 'archive') return currentSection === 'field_archive' || currentSection === 'archive';
    return false;
  };

  return (
    <aside
      className={`v15-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      aria-label="Department Head workspace sidebar"
      data-testid="head-sidebar"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className="v15-sidebar-top">
        {/* Identity Lockup & Collapse Control */}
        <div className="v15-sidebar-header">
          <div className="v15-brand-lockup">
            <span className="v15-brand-emblem" aria-hidden="true">
              {departmentCode.slice(0, 3)}
            </span>
            {!collapsed && (
              <div className="v15-brand-text">
                <span className="v15-brand-title">Awaaz-e-Awam</span>
                <span className="v15-brand-sub" title={departmentName}>
                  {departmentCode} · Head
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="v15-rail-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            title={collapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            data-testid="head-sidebar-toggle"
          >
            {collapsed ? (
              <PanelLeftOpen size={17} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={17} strokeWidth={1.75} />
            )}
          </button>
        </div>

        {/* Navigation Destinations */}
        <nav className="v15-nav-list" aria-label="Department Head navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item);
            return (
              <div key={item.id} className="v15-nav-item-wrap">
                <button
                  ref={item.isSettings ? settingsBtnRef : undefined}
                  type="button"
                  aria-label={item.isSettings ? 'Open workspace menu' : item.label}
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={item.isSettings ? settingsOpen : undefined}
                  aria-haspopup={item.isSettings ? 'menu' : undefined}
                  data-nav-id={item.id}
                  className={`v15-nav-item ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    if (item.isSettings) {
                      setSettingsOpen((prev) => !prev);
                      return;
                    }
                    setSettingsOpen(false);
                    if (item.section) onSelectSection(item.section);
                  }}
                >
                  <Icon size={18} strokeWidth={1.75} className="v15-nav-icon" />
                  {!collapsed && <span className="v15-nav-label">{item.label}</span>}
                  {!collapsed && typeof item.badge === 'number' && (
                    <span className="v15-nav-badge">{item.badge}</span>
                  )}
                </button>
                {collapsed && (
                  <span className="v15-tooltip" role="tooltip">
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Account Controls */}
      <div className="v15-sidebar-footer">
        <div className="v15-account-row">
          <span className="v15-avatar" aria-hidden="true">
            {username.slice(0, 1).toUpperCase() || 'H'}
          </span>
          {!collapsed && (
            <div className="v15-account-meta">
              <span className="v15-account-name">{username}</span>
              <span className="v15-account-role">Department Head</span>
            </div>
          )}
        </div>

        <div className="v15-account-actions">
          <div className="v15-nav-item-wrap" style={{ flex: collapsed ? undefined : 1, display: 'flex' }}>
            <button
              type="button"
              onClick={onToggleTheme}
              className="v15-account-btn"
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-testid="head-sidebar-theme-toggle"
            >
              {themeMode === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
              {!collapsed && <span>{themeMode === 'dark' ? 'Light' : 'Dark'}</span>}
            </button>
            {collapsed && (
              <span className="v15-tooltip" role="tooltip">
                {themeMode === 'dark' ? 'Light theme' : 'Dark theme'}
              </span>
            )}
          </div>

          <div className="v15-nav-item-wrap" style={{ flex: collapsed ? undefined : 1, display: 'flex' }}>
            <button
              type="button"
              onClick={onSignOut}
              className="v15-account-btn"
              aria-label="Sign out"
              title="Sign out"
              data-testid="head-sidebar-signout"
            >
              <LogOut size={15} strokeWidth={1.75} />
              {!collapsed && <span>Sign out</span>}
            </button>
            {collapsed && (
              <span className="v15-tooltip" role="tooltip">
                Sign out
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Settings / Secondary Actions Popover */}
      {settingsOpen && (
        <div
          ref={popoverRef}
          className="v15-settings-popover"
          role="menu"
          aria-label="Workspace settings and tools"
        >
          <button
            type="button"
            role="menuitem"
            className="v15-popover-item"
            onClick={() => {
              setSettingsOpen(false);
              onSelectSection('review');
            }}
          >
            <span>Review queue</span>
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            role="menuitem"
            className="v15-popover-item"
            onClick={() => {
              setSettingsOpen(false);
              onOpenPasswordModal();
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={15} strokeWidth={1.75} />
              Change passphrase
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="v15-popover-item"
            onClick={() => {
              onToggleTheme();
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {themeMode === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
              {themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="v15-popover-item is-danger"
            onClick={() => {
              setSettingsOpen(false);
              onSignOut();
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={15} strokeWidth={1.75} />
              Sign out
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};
