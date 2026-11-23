import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, KeyRound } from 'lucide-react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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

      {/* Role-Governed Navigation Tabs */}
      <nav className="v21-nav-tabs" aria-label="Portal Workspace Tabs">
        {isHead ? (
          <>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'dashboard' || currentSection === 'overview' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('dashboard')}
            >
              Focus Desk (Priority)
            </button>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'queue' || currentSection === 'tasks' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('queue')}
            >
              Complete Queue
            </button>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'dispatch' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('dispatch')}
            >
              Dispatch Orders
            </button>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'verification' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('verification')}
            >
              Proof Review
            </button>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'field_archive' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field_archive')}
            >
              Verified Archive
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'field' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field')}
            >
              Active Task (My Day)
            </button>
            <button
              type="button"
              className={`v21-nav-link ${currentSection === 'field_archive' ? 'active' : ''}`}
              onClick={() => onSelectSection?.('field_archive')}
            >
              Completed Shifts
            </button>
          </>
        )}
      </nav>
    </header>
  );
};
