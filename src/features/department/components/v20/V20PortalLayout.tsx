import React from 'react';
import { TopEdgeMorphingNav, type V20NavOption } from './TopEdgeMorphingNav';
import { V20CursorSpotlight } from './V20CursorSpotlight';

export interface V20PortalLayoutProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  username: string;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  tabs?: V20NavOption[];
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  children: React.ReactNode;
}

export const V20PortalLayout: React.FC<V20PortalLayoutProps> = ({
  departmentCode,
  departmentName,
  role,
  username,
  themeMode,
  onToggleTheme,
  onSignOut,
  activeTab,
  onSelectTab,
  tabs,
  unreadNotifications = 0,
  onOpenNotifications,
  children,
}) => {
  const normalizedDept = departmentCode.toLowerCase();

  return (
    <div
      className={`v20-portal-root ${themeMode === 'light' ? 'v20-light-mode' : ''}`}
      data-dept={normalizedDept}
      data-theme={themeMode}
      data-role={role}
      data-username={username}
      data-testid="v20-portal-root"
      data-shell-testid="v19-staff-portal-shell"
    >
      {/* 1. Persistent Continuous Departmental Atmospheric Background */}
      <div className="v20-atmospheric-background" aria-hidden="true" />

      {/* 1b. Smooth Cursor Spotlight Glow Layer */}
      <V20CursorSpotlight themeMode={themeMode} departmentCode={departmentCode} />

      {/* 2. Top-Edge Morphing Notch Navigation */}
      <TopEdgeMorphingNav
        departmentCode={departmentCode}
        departmentName={departmentName}
        role={role}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        onSignOut={onSignOut}
        tabs={tabs}
        unreadNotifications={unreadNotifications}
        onOpenNotifications={onOpenNotifications}
      />

      {/* 3. Active Destination Content with Unified Layout Containment */}
      <div className="v20-portal-content" data-active-tab={activeTab}>
        {activeTab === 'home' || activeTab === 'dashboard' ? (
          children
        ) : (
          <div className="v20-page-container v20-operational-container">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
