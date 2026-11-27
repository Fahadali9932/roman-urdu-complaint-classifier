import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [clock, setClock] = useState(() => trustedTimeService.formatPkt());
  const [synced, setSynced] = useState(() => trustedTimeService.isSynced());
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  // Animated dimensions for SVG notch
  const [w, setW] = useState(110);
  const [h, setH] = useState(48);

  const navRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number>(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDims = useRef({ w: 110, h: 48 });

  const isMobile = viewportWidth < 768;
  const targetW = isOpen
    ? Math.min(viewportWidth - 48, role === 'head' ? 730 : 810)
    : 110;
  const targetH = isOpen ? (isMobile ? 148 : 74) : 48;

  // Spring animation loop for continuous SVG notch interpolation (factor 0.17 from prototype)
  const animateToTarget = useCallback(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReduced) {
      currentDims.current = { w: targetW, h: targetH };
      setW(targetW);
      setH(targetH);
      return;
    }

    const dw = targetW - currentDims.current.w;
    const dh = targetH - currentDims.current.h;

    if (Math.abs(dw) > 0.2 || Math.abs(dh) > 0.2) {
      currentDims.current.w += dw * 0.17;
      currentDims.current.h += dh * 0.17;
      setW(currentDims.current.w);
      setH(currentDims.current.h);
      rafRef.current = requestAnimationFrame(animateToTarget);
    } else {
      currentDims.current = { w: targetW, h: targetH };
      setW(targetW);
      setH(targetH);
      rafRef.current = 0;
    }
  }, [targetW, targetH]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateToTarget);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateToTarget]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live PKT clock updates
  useEffect(() => {
    const tick = () => {
      setClock(trustedTimeService.formatPkt());
      setSynced(trustedTimeService.isSynced());
    };
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Escape key & Click outside dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (isOpen && navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  // Debounced hover handlers
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setIsOpen(true);
      }, 170);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        if (!navRef.current?.contains(document.activeElement)) {
          setIsOpen(false);
        }
      }, 500);
    }
  };

  // Default tabs for role
  const destinations: V20NavOption[] = tabs ?? [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'complaints', label: 'Complaints' },
    ...(role === 'head'
      ? [
          { id: 'verification', label: 'Verification' },
          { id: 'officers', label: 'Officers' },
        ]
      : [
          { id: 'work', label: 'Work' },
          { id: 'performance', label: 'Performance' },
          { id: 'notifications', label: 'Notifications' },
        ]),
    { id: 'profile', label: 'Profile' },
  ];

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Exact continuous SVG cubic bezier curve formula from prototype
  const c = viewportWidth / 2;
  const l = c - w / 2;
  const r = c + w / 2;
  const top = 7;
  const k = Math.min(27, h / 2);
  const s = Math.min(38, w / 3);
  const pathD = `M0 0 H${viewportWidth} V${top} H${r + s} C${r + 7} ${top} ${r + 5} ${h} ${r - k} ${h} H${l + k} C${l - 5} ${h} ${l - 7} ${top} ${l - s} ${top} H0 Z`;

  return (
    <header
      id="header"
      className={`v20-top-edge-nav-container ${isOpen ? 'open' : ''}`}
      ref={navRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* 1. Continuous SVG Morphing Notch Geometry from Top Ceiling */}
      <svg
        id="nav-shape"
        className="v20-nav-shape"
        preserveAspectRatio="none"
        viewBox={`0 0 ${viewportWidth} 180`}
        aria-hidden="true"
      >
        <path id="notch" className="v20-notch-path" d={pathD} />
      </svg>

      {/* 2. Top-Left Department Brand Identity */}
      <div className="brand v20-brand-label" title={departmentName}>
        AWAAZ-E-AWAM
        <span id="brand-dept">
          {departmentCode.toUpperCase()} / {role === 'head' ? 'Department head' : 'Field officer'}
        </span>
      </div>

      {/* 3. Top-Right Utility Strip (Trusted PKT Clock, Theme, Sign Out) */}
      <div className="utility v20-header-right-strip">
        <div
          className="clock v20-clock-block"
          title={synced ? 'Origin server time (Asia/Karachi PKT)' : 'Time not yet synchronized'}
        >
          <span id="date" className="v20-header-date" data-testid="v20-header-date">
            {clock.dateStr}
          </span>
          <span
            id="time"
            className="v20-header-clock"
            data-testid="v20-trusted-clock"
          >
            <span data-testid="v19-trusted-clock" aria-label={`${clock.timeStr} PKT`}>
              {clock.timeStr.split('').map((char, idx) => (
                <span className="digit v20-clock-slot" key={idx}>
                  <b key={char}>{char}</b>
                </span>
              ))}
              <small>PKT</small>
            </span>
          </span>
          {!synced && (
            <small style={{ color: '#E53935', fontSize: '9px', display: 'block' }}>
              Not synchronized
            </small>
          )}
        </div>

        <button
          id="theme"
          type="button"
          className="v20-icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          data-testid="v20-theme-toggle"
        >
          {themeMode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          id="logout"
          type="button"
          className="v20-icon-btn"
          onClick={onSignOut}
          aria-label="Sign out"
          data-testid="v20-signout-btn"
        >
          <LogOut size={17} />
        </button>
      </div>

      {/* 4. Notch Center Toggle Button */}
      <button
        id="nav-toggle"
        ref={triggerRef}
        type="button"
        className="v20-notch-trigger-btn"
        aria-expanded={isOpen}
        aria-controls="v20-nav-destinations"
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <Menu size={20} />
        )}
      </button>

      {/* 5. Expanded Segmented Tab Destinations Bar */}
      <nav
        id="v20-nav-destinations"
        className={`v20-nav-destinations-row ${isOpen ? 'visible is-visible' : 'is-collapsed'}`}
        role="tablist"
        aria-label="Department Navigation"
      >
        {destinations.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="v20-portal-content"
              aria-current={isActive ? 'page' : undefined}
              data-tab-id={tab.id}
              data-go={tab.id}
              className={`v20-nav-link-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <small className="v20-nav-badge">{tab.badge}</small>
              )}
            </button>
          );
        })}

        {/* HOD Compact Notices Access */}
        {role === 'head' && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notifications'}
            aria-label="Notifications"
            className={`v20-nav-link-btn ${activeTab === 'notifications' ? 'is-active' : ''}`}
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else {
                handleSelectTab('notifications');
              }
            }}
          >
            <Bell size={16} />
            <span className="sr-only">Notices</span>
            {unreadNotifications > 0 && (
              <small className="v20-nav-badge">{unreadNotifications}</small>
            )}
          </button>
        )}
      </nav>
    </header>
  );
};
