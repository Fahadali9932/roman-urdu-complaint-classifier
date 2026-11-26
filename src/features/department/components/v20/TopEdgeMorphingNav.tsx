import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export interface V20NavOption {
  id: string;
  label: string;
  badge?: number;
}

export interface TopEdgeMorphingNavProps {
  departmentCode: string;
  departmentName: string;
  role: 'head' | 'officer';
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  themeMode: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  tabs?: V20NavOption[];
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

export const TopEdgeMorphingNav: React.FC<TopEdgeMorphingNavProps> = ({
  departmentCode,
  departmentName,
  role,
  activeTab,
  onSelectTab,
  themeMode,
  onToggleTheme,
  onSignOut,
  tabs,
  unreadNotifications = 0,
  onOpenNotifications,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live trusted PKT clock updates
  useEffect(() => {
    const updateTime = () => {
      const pkt = trustedTimeService.formatPkt();
      setTimeStr(pkt.timeStr + ' PKT');
      setDateStr(pkt.dateStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation & Escape dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Hover handlers with debounce
  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    collapseTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 380);
  };

  // Role-specific destinations
  const defaultNavTabs: V20NavOption[] = role === 'head'
    ? [
        { id: 'home', label: 'Home' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'complaints', label: 'Complaints' },
        { id: 'verification', label: 'Verification' },
        { id: 'officers', label: 'Officers' },
        { id: 'profile', label: 'Profile' },
      ]
    : [
        { id: 'home', label: 'Home' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'complaints', label: 'Complaints' },
        { id: 'work', label: 'Work' },
        { id: 'performance', label: 'Performance' },
        { id: 'notifications', label: 'Notices', badge: unreadNotifications },
        { id: 'profile', label: 'Profile' },
      ];

  const effectiveTabs = tabs || defaultNavTabs;
  const currentLabel = effectiveTabs.find((t) => t.id === activeTab)?.label || 'Menu';

  return (
    <header className="v20-top-edge-nav-container" ref={containerRef}>
      {/* 1. Continuous Top Edge Bar extending across the full viewport */}
      <div className="v20-top-edge-bar">
        {/* Left: Department Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--v20-accent)' }}>
            AWAAZ-E-AWAM
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)' }}>/</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v20-text-secondary)' }} title={departmentName}>
            {departmentCode.toUpperCase()}
          </span>
        </div>

        {/* Right: Date, PKT Clock, Theme Toggle & Sign Out */}
        <div className="v20-header-right-strip">
          <span className="v20-header-date" data-testid="v20-header-date">
            {dateStr || 'Pakistan Standard Time'}
          </span>
          <span className="v20-header-clock" data-testid="v20-trusted-clock">
            <span data-testid="v19-trusted-clock">{timeStr || '12:00:00 PKT'}</span>
          </span>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Theme toggle */}
          <button
            type="button"
            className="v20-icon-btn"
            onClick={onToggleTheme}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            data-testid="v20-theme-toggle"
          >
            {themeMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Sign out */}
          <button
            type="button"
            className="v20-icon-btn"
            onClick={onSignOut}
            title="Sign Out"
            data-testid="v20-signout-btn"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* 2. Central Morphing Notch physically connected to top bar */}
      <div
        className="v20-morphing-notch-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`v20-notch-shell ${isExpanded ? 'v20-notch-expanded' : 'v20-notch-collapsed'}`}
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
          role="navigation"
          aria-label="Department Morphing Navigation"
        >
          {/* Destination Row (always in DOM for accessibility, styled according to expanded state) */}
          <div
            className={`v20-nav-destinations-row ${isExpanded ? 'is-visible' : 'is-collapsed'}`}
            role="tablist"
            style={
              !isExpanded
                ? {
                    position: 'absolute',
                    opacity: 0,
                    pointerEvents: 'none',
                    height: 0,
                    overflow: 'hidden',
                  }
                : undefined
            }
          >
            {effectiveTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-tab-id={tab.id}
                  className={`v20-nav-link-btn ${isActive ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTab(tab.id);
                    setIsExpanded(false);
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        background: isActive ? '#0E0E0E' : 'var(--v20-accent)',
                        color: isActive ? '#FFF' : '#0E0E0E',
                        marginLeft: '2px',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Notification Quick Bell for HOD */}
            {role === 'head' && (
              <button
                type="button"
                className="v20-nav-link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenNotifications) {
                    onOpenNotifications();
                  } else {
                    onSelectTab('notifications');
                  }
                  setIsExpanded(false);
                }}
                title="Operational Notices"
                style={{ padding: '8px 12px' }}
              >
                <Bell size={15} />
                {unreadNotifications > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      background: 'var(--v20-accent)',
                      color: '#0E0E0E',
                    }}
                  >
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {/* Close Notch Button */}
            <button
              type="button"
              className="v20-icon-btn"
              style={{ marginLeft: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              title="Collapse Navigation"
            >
              <X size={15} />
            </button>
          </div>

          {!isExpanded && (
            /* Collapsed Resting State Trigger */
            <div className="v20-notch-trigger-content">
              <Menu size={16} style={{ color: 'var(--v20-accent)' }} />
              <span>{currentLabel}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
