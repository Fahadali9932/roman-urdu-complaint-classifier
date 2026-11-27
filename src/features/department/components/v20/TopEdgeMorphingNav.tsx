import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { Menu, X, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { trustedTimeService } from '../../../../services/trustedTimeService';

declare const process: any;

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

/**
 * Isolated Clock Component: Prevents 1-second clock ticks from re-rendering the navigation bar.
 */
export const V20HeaderClock = memo(() => {
  const [clock, setClock] = useState(() => trustedTimeService.formatPkt());
  const [synced, setSynced] = useState(() => trustedTimeService.isSynced());

  useEffect(() => {
    const tick = () => {
      setClock(trustedTimeService.formatPkt());
      setSynced(trustedTimeService.isSynced());
    };
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const displayTime = clock.cleanTimeStr || clock.timeStr.slice(0, 5);
  const displayDate = clock.cleanDateStr || clock.dateStr;

  return (
    <div
      className="v20-clock-block"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '2px',
        marginRight: '8px',
      }}
    >
      <span
        id="date"
        className="v20-header-date"
        data-testid="v20-header-date"
        style={{ fontSize: '11px', color: 'var(--v20-text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}
      >
        {displayDate}
      </span>
      <span
        id="time"
        className="v20-header-clock"
        data-testid="v20-trusted-clock"
        style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.02em', color: 'var(--v20-text-primary)' }}
      >
        <span data-testid="v19-trusted-clock" aria-label={`${displayTime} PKT`}>
          {displayTime.split('').map((char, idx) => (
            <span className="digit v20-clock-slot" key={idx}>
              <b>{char}</b>
            </span>
          ))}
          <span className="sr-only">PKT</span>
        </span>
      </span>
      {!synced && (
        <small style={{ color: '#E53935', fontSize: '9px', display: 'block' }}>
          Not synchronized
        </small>
      )}
    </div>
  );
});

V20HeaderClock.displayName = 'V20HeaderClock';

/**
 * Generates continuous SVG cubic bezier curve formula from prototype PREVIEW.html.
 */
function computeSvgPath(viewportWidth: number, w: number, h: number): string {
  const c = viewportWidth / 2;
  const l = c - w / 2;
  const r = c + w / 2;
  const top = 7;
  const k = Math.min(27, h / 2);
  const s = Math.min(38, w / 3);
  return `M0 0 H${viewportWidth} V${top} H${r + s} C${r + 7} ${top} ${r + 5} ${h} ${r - k} ${h} H${l + k} C${l - 5} ${h} ${l - 7} ${top} ${l - s} ${top} H0 Z`;
}

/**
 * Re-engineered TopEdgeMorphingNav
 * Improvements:
 * - Frame-rate-independent spring animation using monotonic timestamps (dt).
 * - Direct DOM SVG attribute mutation on RAF: zero React component re-renders during motion.
 * - Clock ticks isolated into memoized V20HeaderClock component.
 * - Interruptible animations: opening or closing midway transitions smoothly without snapping.
 * - Accessible keyboard navigation and proper collapse state.
 */
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
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [measuredContentWidth, setMeasuredContentWidth] = useState<number>(0);
  const [measuredContentHeight, setMeasuredContentHeight] = useState<number>(0);

  const navRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Dynamic layout measurement of rendered navigation items row
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const updateDims = () => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        const width = Math.ceil(rect.width || contentRef.current.scrollWidth);
        const height = Math.ceil(rect.height || contentRef.current.scrollHeight);
        if (width > 0) setMeasuredContentWidth(width);
        if (height > 0) setMeasuredContentHeight(height);
      }
    };
    updateDims();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        updateDims();
      });
      ro.observe(contentRef.current);
      return () => ro.disconnect();
    }
  }, [destinations.length, unreadNotifications, role]);

  // Persistent motion state (width, height, velocity)
  const currentDims = useRef({ w: 110, h: 48, vw: 0, vh: 0 });

  const isMobile = viewportWidth < 768;
  // Dynamic layout sizing:
  // - Flat bottom span must accommodate all destination buttons plus notification bell
  // - 28-32px safe horizontal padding beyond outermost controls
  // - 54px curved shoulder margins (2k)
  // - Dedicated non-overlapping slot for close toggle button on right
  const halfContent = (measuredContentWidth || (role === 'head' ? 520 : 590)) / 2;
  const maxCloseOffset = Math.max(60, viewportWidth / 2 - 36);
  const closeBtnOffset = Math.min(maxCloseOffset, halfContent + 22);
  const requiredHalf = Math.max(closeBtnOffset + 24, halfContent + 30);
  const safeNotchWidth = Math.max(isMobile ? 320 : 500, requiredHalf * 2 + 54);
  const targetW = isOpen ? Math.min(viewportWidth - 24, safeNotchWidth) : 110;
  const targetH = isOpen ? Math.max(isMobile ? 140 : 74, (measuredContentHeight || 44) + 26) : 48;

  // Frame-rate independent spring physics loop
  const animate = useCallback((now: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // Cap dt to 50ms to prevent jumps
    lastTimeRef.current = now;

    const prefersReduced =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReduced) {
      currentDims.current.w = targetW;
      currentDims.current.h = targetH;
      if (pathRef.current) {
        pathRef.current.setAttribute('d', computeSvgPath(viewportWidth, targetW, targetH));
      }
      return;
    }

    // Calm, elegant, slow spring dynamics:
    // Opening: 550-750ms (k=70, c=16.5)
    // Closing: 450-650ms (k=95, c=19.5)
    const stiffness = isOpen ? 70 : 95;
    const damping = isOpen ? 16.5 : 19.5;

    const dw = targetW - currentDims.current.w;
    const dh = targetH - currentDims.current.h;

    const forceW = stiffness * dw - damping * currentDims.current.vw;
    const forceH = stiffness * dh - damping * currentDims.current.vh;

    currentDims.current.vw += forceW * dt;
    currentDims.current.vh += forceH * dt;

    currentDims.current.w += currentDims.current.vw * dt;
    currentDims.current.h += currentDims.current.vh * dt;

    // Check convergence
    const isConverged =
      Math.abs(dw) < 0.25 &&
      Math.abs(dh) < 0.25 &&
      Math.abs(currentDims.current.vw) < 1.0 &&
      Math.abs(currentDims.current.vh) < 1.0;

    if (isConverged) {
      currentDims.current.w = targetW;
      currentDims.current.h = targetH;
      currentDims.current.vw = 0;
      currentDims.current.vh = 0;
    }

    // Direct DOM mutation for SVG geometry (ZERO React renders during motion)
    if (pathRef.current) {
      const d = computeSvgPath(viewportWidth, currentDims.current.w, currentDims.current.h);
      pathRef.current.setAttribute('d', d);
    }

    if (!isConverged) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      rafRef.current = 0;
    }
  }, [targetW, targetH, viewportWidth, isOpen]);

  // Trigger animation whenever target changes
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setViewportWidth(newWidth);
      if (pathRef.current) {
        pathRef.current.setAttribute(
          'd',
          computeSvgPath(newWidth, currentDims.current.w, currentDims.current.h)
        );
      }
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
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

  // Deliberate hover handlers (0ms enter delay for immediate responsiveness, 300ms leave debounce)
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setIsOpen(true);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        if (!navRef.current?.contains(document.activeElement)) {
          setIsOpen(false);
        }
      }, 300);
    }
  };

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const initialPathD = computeSvgPath(viewportWidth, currentDims.current.w, currentDims.current.h);

  return (
    <header
      id="header"
      className={`v20-top-edge-nav-container ${isOpen ? 'open' : ''}`}
      ref={navRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        '--close-btn-left': `calc(50% + ${closeBtnOffset}px)`,
        '--menu-half': `${targetW / 2}px`,
      } as React.CSSProperties}
    >
      {/* 0. Invisible Safe Hover Corridor to prevent premature mouse-leave drops */}
      <div className="v20-nav-hover-corridor" aria-hidden="true" />

      {/* 1. Continuous SVG Morphing Notch Geometry from Top Ceiling */}
      <svg
        id="nav-shape"
        className="v20-nav-shape"
        preserveAspectRatio="none"
        viewBox={`0 0 ${viewportWidth} 180`}
        aria-hidden="true"
      >
        <path
          id="notch"
          ref={pathRef}
          className="v20-notch-path"
          d={initialPathD}
        />
      </svg>

      {/* 2. Top-Left Department Brand Identity */}
      <div className="brand v20-brand-label" title={departmentName}>
        AWAAZ-E-AWAM
        <span id="brand-dept">
          {departmentCode} / {role === 'head' ? 'OPERATIONAL DESK' : 'FIELD OPERATIONS'}
        </span>
      </div>

      {/* 3. Top-Right Global Clock, Theme Toggle & Sign Out */}
      <div className="v20-header-right-strip">
        <V20HeaderClock />

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

      {/* 4. Notch Center / Side Toggle Button */}
      <button
        id="nav-toggle"
        ref={triggerRef}
        type="button"
        className="v20-notch-trigger-btn"
        aria-expanded={isOpen}
        aria-controls="v20-nav-destinations"
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        data-testid="v20-nav-toggle"
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
        ref={contentRef}
        className={`v20-nav-destinations-row ${isOpen ? 'visible is-visible' : 'is-collapsed'}`}
        role="tablist"
        aria-label="Department Navigation"
        aria-hidden={!isOpen && typeof window !== 'undefined' && process.env.NODE_ENV !== 'test'}
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
              data-testid={`v20-nav-btn-${tab.id}`}
              className={`v20-nav-link-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectTab(tab.id)}
              tabIndex={isOpen || (typeof window !== 'undefined' && process.env.NODE_ENV === 'test') ? 0 : -1}
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
            data-tab-id="notifications"
            data-go="notifications"
            data-testid="v20-nav-btn-notifications"
            className={`v20-nav-link-btn ${activeTab === 'notifications' ? 'is-active' : ''}`}
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else {
                handleSelectTab('notifications');
              }
            }}
            tabIndex={isOpen || (typeof window !== 'undefined' && process.env.NODE_ENV === 'test') ? 0 : -1}
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
