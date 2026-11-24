import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, KeyRound, ChevronDown, Check } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import type { WorkspaceSection } from './DepartmentSidebar';
import type { StaffPosition } from '../services/fieldOperations';
import '../v13_21_operations.css';

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
}

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  onSelectSection,
  themeMode = 'light',
  onToggleTheme,
  onSignOut,
  onOpenPasswordModal,
  staffPosition = 'head',
}) => {
  const { departmentId, departmentMeta, session } = useDepartmentAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavOverflowOpen, setIsNavOverflowOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navOverflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (navOverflowRef.current && !navOverflowRef.current.contains(e.target as Node)) {
        setIsNavOverflowOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsNavOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const departmentCode = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');
  const departmentName = departmentMeta?.name || 'Roads & Infrastructure';
  const username = session?.username || 'roads-01';
  const isHead = staffPosition === 'head';

  const userInitials = useMemo(() => {
    if (!username) return 'SO';
    const parts = username.split(/[-_.\s]+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }, [username]);

  const isOverflowActive = currentSection === 'verification' || currentSection === 'field_archive';
  const overflowLabel = currentSection === 'verification'
    ? 'Proof ▾'
    : currentSection === 'field_archive'
    ? 'Archive ▾'
    : 'More ▾';

  const headSections: { id: WorkspaceSection; label: string; shortLabel: string }[] = [
    { id: 'dashboard', label: 'Focus Desk (Priority)', shortLabel: 'Focus' },
    { id: 'queue', label: 'Complete Queue', shortLabel: 'Queue' },
    { id: 'dispatch', label: 'Dispatch Orders', shortLabel: 'Dispatch' },
    { id: 'verification', label: 'Proof Review', shortLabel: 'Proof Review' },
    { id: 'field_archive', label: 'Verified Archive', shortLabel: 'Verified Archive' },
  ];

  return (
    <header className="v21-header" aria-label="Department Top Navigation">
      <div className="v21-header-top">
        <div className="v21-brand-group">
          <div className="v21-brand-mark">a.</div>
          <span className="v21-brand-title">Awaaz-e-Awam</span>
          <span className="v21-dept-badge">{departmentCode} • {departmentName}</span>
        </div>

        <div className="v21-header-actions">
          {onToggleTheme && (
            <button
              type="button"
              className="v21-theme-btn"
              onClick={onToggleTheme}
              aria-label={`Current theme is ${themeMode}. Click to switch theme.`}
              title="Toggle Light/Dark Theme"
            >
              {themeMode === 'light' ? (
                <>
                  <Sun style={{ width: 14, height: 14, color: '#D97706' }} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon style={{ width: 14, height: 14, color: '#38BDF8' }} />
                  <span>Dark</span>
                </>
              )}
            </button>
          )}

          {/* User Profile Chip with Context Menu Dropdown */}
          <div className="v21-user-chip" ref={menuRef} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className="v21-user-avatar">{userInitials}</div>
            <span>{username}</span>

            {isMenuOpen && (
              <div className="v21-acrylic-menu" role="menu" aria-label="Account actions">
                <div className="v21-menu-header">
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v21-text-main)' }}>
                    {username} ({isHead ? 'Department Head' : 'Field Officer'})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--v21-text-tertiary)' }}>
                    {session?.email || `${departmentCode} Operations Desk`}
                  </div>
                </div>

                {isHead ? (
                  <>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('dashboard'); }}
                    >
                      <span>Focus Desk</span>
                      <span className="v21-meta-code">⌥1</span>
                    </button>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('queue'); }}
                    >
                      <span>Operations Queue</span>
                      <span className="v21-meta-code">⌥2</span>
                    </button>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('dispatch'); }}
                    >
                      <span>Dispatch Orders</span>
                      <span className="v21-meta-code">⌥3</span>
                    </button>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('verification'); }}
                    >
                      <span>Proof Review</span>
                      <span className="v21-meta-code">⌥4</span>
                    </button>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('field_archive'); }}
                    >
                      <span>Verified Archive</span>
                      <span className="v21-meta-code">⌥5</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('field'); }}
                    >
                      <span>My Field Work</span>
                      <span className="v21-meta-code">⌥1</span>
                    </button>
                    <button
                      type="button"
                      className="v21-menu-item"
                      onClick={() => { setIsMenuOpen(false); onSelectSection?.('field_archive'); }}
                    >
                      <span>Completed Shifts</span>
                      <span className="v21-meta-code">⌥2</span>
                    </button>
                  </>
                )}

                {onOpenPasswordModal && (
                  <button
                    type="button"
                    className="v21-menu-item"
                    onClick={() => { setIsMenuOpen(false); onOpenPasswordModal(); }}
                  >
                    <span>Change Passphrase</span>
                    <KeyRound style={{ width: 14, height: 14 }} />
                  </button>
                )}

                <div style={{ height: 1, background: 'var(--v21-border-subtle)', margin: '4px 0' }} />

                {onSignOut && (
                  <button
                    type="button"
                    className="v21-menu-item danger"
                    onClick={() => { setIsMenuOpen(false); onSignOut(); }}
                  >
                    <span>Sign Out</span>
                    <LogOut style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-Governed Navigation Tabs with Desktop Strip and Accessible Mobile Overflow Menu */}
      <nav className="v21-nav-tabs" aria-label="Portal Workspace Tabs">
        {isHead ? (
          <>
            {/* 1. Focus Desk (Always visible) */}
            <button
              type="button"
              data-nav-section="dashboard"
              aria-label="Focus Desk (Priority)"
              className={`v21-nav-link ${currentSection === 'dashboard' || currentSection === 'overview' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('dashboard')}
            >
              <span className="v21-desktop-label">Focus Desk (Priority)</span>
              <span className="v21-mobile-label">Focus</span>
            </button>

            {/* 2. Operations Queue (Always visible) */}
            <button
              type="button"
              data-nav-section="queue"
              aria-label="Complete Queue"
              className={`v21-nav-link ${currentSection === 'queue' || currentSection === 'tasks' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('queue')}
            >
              <span className="v21-desktop-label">Complete Queue</span>
              <span className="v21-mobile-label">Queue</span>
            </button>

            {/* 3. Dispatch Orders (Always visible) */}
            <button
              type="button"
              data-nav-section="dispatch"
              aria-label="Dispatch Orders"
              className={`v21-nav-link ${currentSection === 'dispatch' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('dispatch')}
            >
              <span className="v21-desktop-label">Dispatch Orders</span>
              <span className="v21-mobile-label">Dispatch</span>
            </button>

            {/* 4. Proof Review (Visible on desktop, in overflow menu on mobile) */}
            <button
              type="button"
              data-nav-section="verification"
              aria-label="Proof Review"
              className={`v21-nav-link v21-desktop-only-nav ${currentSection === 'verification' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('verification')}
            >
              Proof Review
            </button>

            {/* 5. Verified Archive (Visible on desktop, in overflow menu on mobile) */}
            <button
              type="button"
              data-nav-section="field_archive"
              aria-label="Verified Archive"
              className={`v21-nav-link v21-desktop-only-nav ${currentSection === 'field_archive' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field_archive')}
            >
              Verified Archive
            </button>

            {/* Accessible Overflow Menu (Visible on mobile <= 640px) */}
            <div className="v21-nav-overflow-wrapper v21-mobile-only-nav" ref={navOverflowRef}>
              <button
                type="button"
                data-nav-section="overflow-trigger"
                className={`v21-nav-link v21-nav-overflow-btn ${isOverflowActive ? 'active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={isNavOverflowOpen}
                aria-label="More workspace destinations"
                onClick={() => setIsNavOverflowOpen(!isNavOverflowOpen)}
              >
                <span>{overflowLabel}</span>
                <ChevronDown style={{ width: 12, height: 12, transform: isNavOverflowOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isNavOverflowOpen && (
                <div className="v21-acrylic-menu v21-nav-overflow-dropdown" role="menu" aria-label="Additional workspace destinations">
                  <div className="v21-overflow-header">More Destinations</div>
                  {headSections.map((sec) => {
                    const isActive =
                      (sec.id === 'dashboard' && (currentSection === 'dashboard' || currentSection === 'overview')) ||
                      (sec.id === 'queue' && (currentSection === 'queue' || currentSection === 'tasks')) ||
                      currentSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        role="menuitem"
                        data-overflow-item={sec.id}
                        className={`v21-overflow-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setIsNavOverflowOpen(false);
                          onSelectSection?.(sec.id);
                        }}
                      >
                        <span>{sec.label}</span>
                        {isActive && <Check style={{ width: 14, height: 14, color: '#10B981', marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="v21-officer-nav-strip">
            <button
              type="button"
              data-nav-section="field"
              className={`v21-nav-link ${currentSection === 'field' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field')}
            >
              <span className="v21-desktop-text">Active Task (My Day)</span>
              <span className="v21-mobile-text">My Day</span>
            </button>
            <button
              type="button"
              data-nav-section="field_archive"
              className={`v21-nav-link ${currentSection === 'field_archive' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field_archive')}
            >
              <span className="v21-desktop-text">Completed Shifts</span>
              <span className="v21-mobile-text">Completed</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};
