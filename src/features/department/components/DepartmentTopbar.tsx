import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Menu, LogOut, Sun, Moon, KeyRound } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import type { WorkspaceSection } from './DepartmentSidebar';

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
}

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  activeTaskFilter,
  selectedReference,
  selectedCaseId,
  onOpenMobileDrawer,
  onSelectSection: _onSelectSection,
  themeMode = 'light',
  onToggleTheme,
  onSignOut,
  onOpenPasswordModal,
}) => {
  const { departmentId, departmentMeta, session } = useDepartmentAuth();
  const isKmc = departmentId === 'kmc';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const departmentCode =
    departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'KMC');

  // Breadcrumb generation
  const renderBreadcrumb = () => {
    if (selectedReference) {
      return (
        <>
          <span className="crumb">Work queue</span>
          <span className="crumb-divider">/</span>
          <strong className="crumb-current">Complaint {selectedReference}</strong>
        </>
      );
    }
    if (selectedCaseId) {
      return (
        <>
          <span className="crumb">Work queue</span>
          <span className="crumb-divider">/</span>
          <strong className="crumb-current">Case {selectedCaseId}</strong>
        </>
      );
    }
    switch (currentSection) {
      case 'dashboard':
      case 'overview':
        return <strong className="crumb-current">Overview</strong>;
      case 'areas':
        return <strong className="crumb-current">Areas</strong>;
      case 'priority':
      case 'priority_queue':
        return <strong className="crumb-current">Priority</strong>;
      case 'review':
        return <strong className="crumb-current">Review queue</strong>;
      case 'settings':
        return <strong className="crumb-current">Overview</strong>;
      case 'queue':
      case 'tasks':
      default:
        if (activeTaskFilter === 'under_review') {
          return <strong className="crumb-current">Review queue</strong>;
        }
        return <strong className="crumb-current">Work queue</strong>;
    }
  };

  // Today's date formatted in PKT (e.g. 15 Nov 2026)
  const todayPkt = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const username = session?.username || 'Staff Officer';
  const userInitials = useMemo(() => {
    if (!username) return 'SO';
    const parts = username.split(/[-_.\s]+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }, [username]);

  return (
    <header
      className="topbar"
      aria-label="Department Top Navigation"
      style={{ height: '60px', minHeight: '60px' }}
    >
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenMobileDrawer && (
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="icon-btn mobile-menu"
            aria-label="Open navigation menu"
          >
            <Menu className="ico" style={{ width: 18, height: 18 }} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px' }}>
          {renderBreadcrumb()}
        </div>
      </div>

      <div
        className="topbar-right"
        style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #718692)',
            display: 'none',
          }}
          className="demo-note sm:inline"
        >
          {todayPkt}
        </span>

        {/* Small Agency Pill */}
        <span
          className="pill"
          style={{
            fontSize: '11px',
            fontWeight: 750,
            color: 'var(--text-muted, #55707E)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle, #DBE5EA)',
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            letterSpacing: '0.04em',
          }}
        >
          {departmentCode}
        </span>

        {/* User Avatar with Dropdown */}
        <div className="relative" ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-label="Account menu"
            aria-expanded={isUserMenuOpen}
            className="avatar-btn"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#EAF3F5',
              color: '#16617A',
              fontWeight: 750,
              fontSize: '12px',
              border: '1px solid #D5E5E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {userInitials}
          </button>

          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '42px',
                width: '260px',
                backgroundColor: 'var(--v7-surface, var(--surface, #FFFFFF))',
                border: '1px solid var(--v7-border, var(--border-subtle, #E6E3DF))',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(20, 20, 20, 0.12)',
                zIndex: 50,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Account Information Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--v7-border, #EFECE8)', background: 'var(--v7-subtle, #FAF9F7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--v7-ink, #141414)' }}>
                    {username}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 750,
                      color: 'var(--v7-brand, #16617A)',
                      background: 'rgba(22, 97, 122, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(22, 97, 122, 0.25)',
                    }}
                  >
                    {departmentCode}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--v7-muted, #625D58)', wordBreak: 'break-all' }}>
                  {session?.email || 'Authenticated Staff Officer'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--v7-muted, #8A847C)', marginTop: '4px' }}>
                  {isKmc ? 'Clearinghouse & Operations Officer' : `${departmentMeta?.name || departmentCode} Operations Officer`}
                </div>
              </div>

              {/* Controls & Actions */}
              <div style={{ padding: '6px' }}>
                {/* Theme / Appearance Switch */}
                {onToggleTheme && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={{ fontSize: '12.5px', fontWeight: 550, color: 'var(--v7-ink, #141414)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {themeMode === 'dark' ? <Moon className="w-3.5 h-3.5 text-[#38bdf8]" /> : <Sun className="w-3.5 h-3.5 text-[#D97706]" />}
                      <span>Appearance</span>
                    </span>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 650,
                        borderRadius: '6px',
                        border: '1px solid var(--v7-border, #DBE5EA)',
                        background: 'var(--v7-surface, #FFFFFF)',
                        color: 'var(--v7-ink, #141414)',
                        cursor: 'pointer',
                      }}
                      title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                      aria-label={`Current theme is ${themeMode}. Click to switch theme.`}
                    >
                      {themeMode === 'dark' ? 'Dark mode' : 'Light mode'}
                    </button>
                  </div>
                )}

                {/* Change Password (NIST 800-63B) */}
                {onOpenPasswordModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenPasswordModal();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      fontSize: '12.5px',
                      fontWeight: 550,
                      color: 'var(--v7-ink, #141414)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[var(--v7-muted,#625D58)]" />
                    <span>Change password</span>
                  </button>
                )}

                <div style={{ height: '1px', background: 'var(--v7-border, #EFECE8)', margin: '4px 6px' }} />

                {/* Sign Out */}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      fontSize: '12.5px',
                      fontWeight: 550,
                      color: '#B4233E',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#B4233E]" />
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
