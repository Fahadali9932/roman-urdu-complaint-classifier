import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  Bell,
  ChevronRight,
  Inbox,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sun,
  User,
  Users,
} from 'lucide-react';
import type { WorkspaceSection } from '../DepartmentSidebar';
import { LiquidSheet } from './LiquidSheet';

export interface RibbonMetrics {
  newComplaints: number;
  urgentComplaints: number;
  unassignedComplaints: number;
  awaitingVerification: number;
  availableOfficers: number;
  assignedOfficers: number;
  extensionRequests: number;
}

interface LiquidGlassRibbonProps {
  departmentCode: string;
  departmentName: string;
  username: string;
  currentSection: WorkspaceSection;
  themeMode: 'light' | 'dark';
  metrics: RibbonMetrics;
  onSelectSection: (section: WorkspaceSection, options?: { queueView?: 'needs' | 'unassigned' | 'mine' | 'all' | 'completed'; focusSearch?: boolean }) => void;
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onSignOut: () => void;
}

type PopoverKey = 'complaints' | 'officers' | 'notifications' | 'account' | null;

/**
 * Thin floating Apple Liquid Glass navigation ribbon for Department Heads.
 * - Left: Awaaz-e-Awam branding
 * - Center: Overview, Complaints, Officers, Archive
 * - Right: Search, Notifications, Light/Dark theme, Account
 * - Signature interaction: hovering/focusing Complaints, Officers, or Notifications
 *   expands a compact contextual preview with real authorized counts.
 */
export const LiquidGlassRibbon: React.FC<LiquidGlassRibbonProps> = ({
  departmentCode,
  departmentName,
  username,
  currentSection,
  themeMode,
  metrics,
  onSelectSection,
  onToggleTheme,
  onOpenPasswordModal,
  onSignOut,
}) => {
  const [openPopover, setOpenPopover] = useState<PopoverKey>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  const cancelHoverClose = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimerRef.current = window.setTimeout(() => {
      setOpenPopover(null);
    }, 150);
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPopover(null);
        setMobileSheetOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelHoverClose();
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const isOverview = currentSection === 'dashboard' || currentSection === 'overview' || currentSection === 'home';
  const isComplaints = currentSection === 'queue' || currentSection === 'tasks' || currentSection === 'dispatch' || currentSection === 'work_orders' || currentSection === 'verification' || currentSection === 'review';
  const isOfficers = currentSection === 'team';
  const isArchive = currentSection === 'archive' || currentSection === 'field_archive';

  const notificationCount =
    metrics.newComplaints + metrics.extensionRequests + metrics.awaitingVerification;

  const navigate = (
    sec: WorkspaceSection,
    opts?: { queueView?: 'needs' | 'unassigned' | 'mine' | 'all' | 'completed'; focusSearch?: boolean }
  ) => {
    setOpenPopover(null);
    setMobileSheetOpen(false);
    onSelectSection(sec, opts);
  };

  return (
    <div className="lg-ribbon-wrap" ref={ribbonRef}>
      <nav
        className="lg-glass-bar lg-ribbon"
        aria-label="Department Head navigation"
        data-testid="lg-head-ribbon"
      >
        {/* Left: Brand & Department */}
        <button
          type="button"
          className="lg-ribbon-brand"
          onClick={() => navigate('dashboard')}
        >
          <span className="lg-ribbon-mark" aria-hidden="true">
            {departmentCode.slice(0, 4)}
          </span>
          <span className="lg-ribbon-brand-text">
            <span className="lg-ribbon-brand-name">Awaaz-e-Awam</span>
            <span className="lg-ribbon-brand-dept">{departmentName}</span>
          </span>
        </button>

        {/* Center: Primary Navigation Destinations */}
        <div className="lg-ribbon-nav">
          <div className="lg-nav-item-wrap">
            <button
              type="button"
              className={`lg-nav-pill ${isOverview ? 'is-active' : ''}`}
              aria-current={isOverview ? 'page' : undefined}
              onClick={() => navigate('dashboard')}
              onMouseEnter={() => setOpenPopover(null)}
            >
              <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Overview</span>
            </button>
          </div>

          <div
            className="lg-nav-item-wrap"
            onMouseEnter={() => {
              cancelHoverClose();
              setOpenPopover('complaints');
            }}
            onMouseLeave={scheduleHoverClose}
          >
            <button
              type="button"
              className={`lg-nav-pill ${isComplaints ? 'is-active' : ''}`}
              aria-current={isComplaints ? 'page' : undefined}
              aria-expanded={openPopover === 'complaints'}
              onClick={() => navigate('queue')}
            >
              <Inbox size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Complaints</span>
            </button>

            {openPopover === 'complaints' && (
              <div
                className="lg-glass-popover lg-preview-popover"
                role="region"
                aria-label="Complaints summary"
              >
                <div className="lg-preview-title">Complaint inbox</div>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('queue', { queueView: 'needs' })}
                >
                  <span>New complaints</span>
                  <span className="lg-preview-count">{metrics.newComplaints}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('queue')}
                >
                  <span>Urgent complaints</span>
                  <span className="lg-preview-count">{metrics.urgentComplaints}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('queue', { queueView: 'unassigned' })}
                >
                  <span>Unassigned complaints</span>
                  <span className="lg-preview-count">{metrics.unassignedComplaints}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('verification')}
                >
                  <span>Awaiting verification</span>
                  <span className="lg-preview-count">{metrics.awaitingVerification}</span>
                </button>
              </div>
            )}
          </div>

          <div
            className="lg-nav-item-wrap"
            onMouseEnter={() => {
              cancelHoverClose();
              setOpenPopover('officers');
            }}
            onMouseLeave={scheduleHoverClose}
          >
            <button
              type="button"
              className={`lg-nav-pill ${isOfficers ? 'is-active' : ''}`}
              aria-current={isOfficers ? 'page' : undefined}
              aria-expanded={openPopover === 'officers'}
              onClick={() => navigate('team')}
            >
              <Users size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Officers</span>
            </button>

            {openPopover === 'officers' && (
              <div
                className="lg-glass-popover lg-preview-popover"
                role="region"
                aria-label="Officers summary"
              >
                <div className="lg-preview-title">Field roster</div>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('team')}
                >
                  <span>Available officers</span>
                  <span className="lg-preview-count">{metrics.availableOfficers}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('team')}
                >
                  <span>Officers currently assigned</span>
                  <span className="lg-preview-count">{metrics.assignedOfficers}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('dispatch')}
                >
                  <span>Pending extension requests</span>
                  <span className="lg-preview-count">{metrics.extensionRequests}</span>
                </button>
              </div>
            )}
          </div>

          <div className="lg-nav-item-wrap">
            <button
              type="button"
              className={`lg-nav-pill ${isArchive ? 'is-active' : ''}`}
              aria-current={isArchive ? 'page' : undefined}
              onClick={() => navigate('archive')}
              onMouseEnter={() => setOpenPopover(null)}
            >
              <Archive size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Archive</span>
            </button>
          </div>
        </div>

        {/* Right: Search, Notifications, Theme, Account & Compact Mobile Menu */}
        <div className="lg-ribbon-actions">
          <button
            type="button"
            className="lg-icon-btn"
            aria-label="Search complaints"
            title="Search complaints"
            onClick={() => navigate('queue', { focusSearch: true })}
          >
            <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <div
            className="lg-nav-item-wrap"
            onMouseEnter={() => {
              cancelHoverClose();
              setOpenPopover('notifications');
            }}
            onMouseLeave={scheduleHoverClose}
          >
            <button
              type="button"
              className={`lg-icon-btn ${openPopover === 'notifications' ? 'is-open' : ''}`}
              aria-label="Notifications"
              aria-expanded={openPopover === 'notifications'}
              onClick={() =>
                setOpenPopover((prev) => (prev === 'notifications' ? null : 'notifications'))
              }
            >
              <Bell size={16} strokeWidth={1.75} aria-hidden="true" />
              {notificationCount > 0 && (
                <span className="lg-badge-dot">{notificationCount}</span>
              )}
            </button>

            {openPopover === 'notifications' && (
              <div
                className="lg-glass-popover lg-preview-popover is-right"
                role="region"
                aria-label="Notifications"
              >
                <div className="lg-preview-title">Operational notifications</div>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('queue', { queueView: 'needs' })}
                >
                  <span>New complaints requiring attention</span>
                  <span className="lg-preview-count">{metrics.newComplaints}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('dispatch')}
                >
                  <span>Assignment updates &amp; dispatch</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('dispatch')}
                >
                  <span>Deadline extension requests</span>
                  <span className="lg-preview-count">{metrics.extensionRequests}</span>
                </button>
                <button
                  type="button"
                  className="lg-preview-row"
                  onClick={() => navigate('verification')}
                >
                  <span>Evidence awaiting verification</span>
                  <span className="lg-preview-count">{metrics.awaitingVerification}</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lg-icon-btn"
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="v15-home-theme-toggle"
            onClick={onToggleTheme}
          >
            {themeMode === 'dark' ? (
              <Sun size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Moon size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>

          <div className="lg-nav-item-wrap">
            <button
              type="button"
              className={`lg-icon-btn ${openPopover === 'account' ? 'is-open' : ''}`}
              aria-label="Open workspace menu"
              aria-expanded={openPopover === 'account'}
              onClick={() =>
                setOpenPopover((prev) => (prev === 'account' ? null : 'account'))
              }
            >
              <User size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>

            {openPopover === 'account' && (
              <div
                className="lg-glass-popover lg-preview-popover is-right"
                role="menu"
                aria-label="Workspace settings and tools"
              >
                <div className="lg-preview-title">
                  {username} · Department Head ({departmentCode})
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="lg-preview-row"
                  onClick={() => navigate('dispatch')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={14} strokeWidth={1.75} />
                    Dispatch workflow
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="lg-preview-row"
                  onClick={() => navigate('verification')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={14} strokeWidth={1.75} />
                    Evidence verification
                  </span>
                  <span className="lg-preview-count">{metrics.awaitingVerification}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="lg-preview-row"
                  onClick={() => navigate('review')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={14} strokeWidth={1.75} />
                    Review queue
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="lg-preview-row"
                  onClick={() => {
                    setOpenPopover(null);
                    onOpenPasswordModal();
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={14} strokeWidth={1.75} />
                    Change passphrase
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="lg-preview-row"
                  style={{ color: 'var(--lg-red)' }}
                  onClick={() => {
                    setOpenPopover(null);
                    onSignOut();
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={14} strokeWidth={1.75} />
                    Sign out
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lg-icon-btn lg-mobile-menu-btn"
            aria-label="Open navigation sheet"
            onClick={() => setMobileSheetOpen(true)}
          >
            <Menu size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Responsive Mobile / Tablet Navigation Sheet (<= 820px) */}
      <LiquidSheet
        open={mobileSheetOpen}
        title={`${departmentCode} · Department Head`}
        onClose={() => setMobileSheetOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button type="button" className="lg-preview-row" onClick={() => navigate('dashboard')}>
            <span>Overview</span>
            <ChevronRight size={15} />
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('queue')}>
            <span>Complaints</span>
            <span className="lg-preview-count">{metrics.newComplaints}</span>
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('team')}>
            <span>Officers</span>
            <span className="lg-preview-count">{metrics.availableOfficers}</span>
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('dispatch')}>
            <span>5-Stage Dispatch</span>
            <ChevronRight size={15} />
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('verification')}>
            <span>Evidence verification</span>
            <span className="lg-preview-count">{metrics.awaitingVerification}</span>
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('archive')}>
            <span>Archive</span>
            <ChevronRight size={15} />
          </button>
          <button type="button" className="lg-preview-row" onClick={() => navigate('review')}>
            <span>Review queue</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </LiquidSheet>
    </div>
  );
};
