import React, { useRef, useEffect, useState } from 'react';
import { TrustedClock } from './TrustedClock';
import { WatermarkOverlay } from './WatermarkOverlay';
import { Bell, Sun, Moon, LogOut } from 'lucide-react';

export interface NavTabOption {
  id: string;
  label: string;
  badge?: number;
}

export interface StaffPortalLayoutProps {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  username: string;
  role: 'head' | 'officer';
  tabs: NavTabOption[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onSignOut: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  children: React.ReactNode;
}

/**
 * Shared Staff Portal Layout (HOD and Officer Portals)
 * Features:
 * - Full-screen atmospheric department glow (KMC / KW&SC / KE / Default)
 * - Top-edge morphing navigation ribbon with sliding active pill capsule
 * - Trusted PKT Clock & Notification trigger
 * - Removal of obsolete V18 circular left quick-operation rails
 * - Dynamic authorized user watermarking
 */
export const StaffPortalLayout: React.FC<StaffPortalLayoutProps> = ({
  departmentId,
  departmentCode,
  departmentName,
  username,
  role,
  tabs,
  activeTab,
  onSelectTab,
  onSignOut,
  themeMode,
  onToggleTheme,
  unreadNotifications = 0,
  onOpenNotifications,
  children,
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Update sliding indicator position over active tab
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeBtn = tabsContainerRef.current.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  // Department CSS class mapping
  const deptClass =
    departmentId === 'kmc'
      ? 'dept-kmc'
      : departmentId === 'kwsc'
      ? 'dept-kwsc'
      : departmentId === 'kelectric'
      ? 'dept-kelectric'
      : 'dept-default';

  return (
    <div
      className={`v19-staff-shell ${deptClass}`}
      data-theme={themeMode}
      data-role={role}
      data-testid="v19-staff-portal-shell"
    >
      {/* Background Watermark */}
      <WatermarkOverlay userId={username} departmentCode={departmentCode} />

      {/* Top-Edge Morphing Navigation Ribbon */}
      <header className="v19-top-nav-wrap" role="banner">
        <nav className="v19-top-nav-bar" aria-label="Staff Portal Main Navigation">
          {/* Brand & Department Symbol */}
          <div className="v19-nav-brand">
            <span className="v19-brand-logo" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="16" y2="21" />
                <line x1="3" y1="8" x2="21" y2="8" />
                <line x1="3" y1="16" x2="21" y2="16" />
                <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                <circle cx="16" cy="21" r="1.5" fill="currentColor" />
                <circle cx="3" cy="16" r="1.5" fill="currentColor" />
                <circle cx="21" cy="8" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <div className="v19-brand-text">
              <span className="v19-brand-name">Awaaz-e-Awam</span>
              <span className="v19-brand-dept">
                {departmentName} · {role === 'head' ? 'Department Head' : 'Field Officer'}
              </span>
            </div>
          </div>

          {/* Morphing Segmented Navigation Destinations */}
          <div className="v19-nav-destinations" ref={tabsContainerRef} role="tablist">
            {/* Sliding Pill Indicator */}
            {indicatorStyle.width > 0 && (
              <div
                className="v19-nav-active-pill"
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                }}
                aria-hidden="true"
              />
            )}

            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tab-id={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  className={`v19-nav-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="v19-nav-badge">{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Actions: Trusted Clock, Notifications, Theme, Logout */}
          <div className="v19-nav-actions">
            <TrustedClock />

            {/* Notification Trigger */}
            <button
              type="button"
              className="v19-action-icon-btn"
              title="Notifications"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
              onClick={onOpenNotifications}
            >
              <Bell size={16} />
              {unreadNotifications > 0 && (
                <span className="v19-action-badge">{unreadNotifications}</span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className="v19-action-icon-btn"
              title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme mode"
              onClick={onToggleTheme}
              data-testid="v19-theme-toggle"
            >
              {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Logout */}
            <button
              type="button"
              className="v19-action-icon-btn"
              title={`Sign out (${username})`}
              aria-label="Sign out of portal"
              onClick={onSignOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Workspace */}
      <main className="v19-workspace-main" id="main-content" role="main">
        {children}
      </main>
    </div>
  );
};
