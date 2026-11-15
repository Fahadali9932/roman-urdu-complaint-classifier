import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Menu, Settings, LogOut } from 'lucide-react';
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
}

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  activeTaskFilter,
  selectedReference,
  selectedCaseId,
  onOpenMobileDrawer,
  onSelectSection,
  onSignOut,
}) => {
  const { departmentId, departmentMeta, session } = useDepartmentAuth();
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
        return <strong className="crumb-current">Settings</strong>;
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
                width: '210px',
                backgroundColor: 'var(--surface, #FFFFFF)',
                border: '1px solid var(--border-subtle, #E6E3DF)',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(20, 20, 20, 0.08)',
                zIndex: 50,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle, #EFECE8)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #141414)' }}>
                  {username}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #625D58)', marginTop: '2px' }}>
                  {departmentCode} Staff Officer
                </div>
              </div>

              <div style={{ padding: '4px' }}>
                {onSelectSection && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectSection('settings');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      fontSize: '12.5px',
                      fontWeight: 550,
                      color: 'var(--text-primary, #141414)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Settings className="w-3.5 h-3.5 text-[#625D58]" />
                    <span>Settings</span>
                  </button>
                )}

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
