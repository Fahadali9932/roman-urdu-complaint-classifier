import React from 'react';
import { Menu, Sun, Moon, LogOut, ChevronRight, Building2, Zap, Trash2, Flame, Droplets } from 'lucide-react';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { type DepartmentId } from '../../../types';
import { CivicTooltip, CivicTooltipProvider } from './CivicTooltip';

interface DepartmentTopbarProps {
  currentSection: 'dashboard' | 'tasks' | 'priority_queue' | 'settings' | 'home';
  activeTaskFilter?: string;
  selectedReference?: string | null;
  onOpenMobileDrawer?: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
}

const getDepartmentIcon = (id: DepartmentId | null, className = 'w-4 h-4') => {
  switch (id) {
    case 'kelectric':
      return <Zap className={className} />;
    case 'sswmb':
      return <Trash2 className={className} />;
    case 'ssgc':
      return <Flame className={className} />;
    case 'kwsc':
      return <Droplets className={className} />;
    case 'kmc':
    case 'sbca':
    default:
      return <Building2 className={className} />;
  }
};

export const DepartmentTopbar: React.FC<DepartmentTopbarProps> = ({
  currentSection,
  activeTaskFilter,
  selectedReference,
  onOpenMobileDrawer,
  themeMode,
  onToggleTheme,
  onSignOut,
}) => {
  const { departmentId, departmentMeta, session } = useDepartmentAuth();

  const getSectionLabel = () => {
    if (selectedReference) {
      return `Complaint ${selectedReference}`;
    }
    switch (currentSection) {
      case 'dashboard':
        return 'Overview';
      case 'priority_queue':
        return 'Priority Queue';
      case 'settings':
        return 'Settings';
      case 'tasks':
      default:
        if (activeTaskFilter === 'under_review') return 'Review Queue';
        return 'Complaints';
    }
  };

  const departmentName = departmentMeta?.name || 'Municipal Agency';
  const departmentCode = departmentMeta?.code || (departmentId ? departmentId.toUpperCase() : 'DEPT');
  const username = session?.username || 'Staff Officer';

  return (
    <CivicTooltipProvider delayDuration={150}>
      <header
        aria-label="Department Top Navigation"
        className="w-full h-16 min-h-[64px] max-h-[64px] px-4 sm:px-6 dept-topbar flex items-center justify-between z-20 shrink-0 select-none"
      >
        {/* Left: Mobile Toggle & Hierarchical Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileDrawer && (
            <button
              type="button"
              onClick={onOpenMobileDrawer}
              className="md:hidden p-2 rounded-lg bg-[var(--dept-surface-subtle)] text-[var(--dept-text-primary)] border border-[var(--dept-border)] hover:bg-[var(--dept-surface-hover)] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Breadcrumb Hierarchy */}
          <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--dept-text-secondary)] min-w-0">
            <span className="font-semibold text-[var(--dept-text-primary)] shrink-0 hidden sm:inline">
              Awaaz-e-Awam
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0 hidden sm:inline" />
            <span className="truncate max-w-[160px] md:max-w-[260px] font-medium text-[var(--dept-text-secondary)]" title={departmentName}>
              {departmentName}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0" />
            <span className="font-semibold text-[var(--dept-text-primary)] truncate max-w-[140px] sm:max-w-[200px]">
              {getSectionLabel()}
            </span>
          </nav>
        </div>

        {/* Right: Department Identifier, Authenticated Staff, Theme Toggle, Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Department Code Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-xs font-semibold text-[var(--dept-text-primary)]"
            title={`${departmentName} (${departmentCode})`}
          >
            <div className="text-[var(--dept-accent)]">
              {getDepartmentIcon(departmentId, 'w-3.5 h-3.5')}
            </div>
            <span className="font-mono tracking-wide">{departmentCode}</span>
          </div>

          {/* Authenticated Staff User Pill */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--dept-surface-subtle)] border border-[var(--dept-border)] text-xs text-[var(--dept-text-secondary)]"
            title={`Signed in as ${username}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-mono font-medium truncate max-w-[120px] text-[var(--dept-text-primary)]">{username}</span>
          </div>

          {/* Theme Toggle Button */}
          <CivicTooltip content={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} side="bottom">
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] text-[var(--dept-text-secondary)] hover:text-[var(--dept-text-primary)] hover:bg-[var(--dept-surface-hover)] transition-colors cursor-pointer"
              aria-label={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {themeMode === 'light' ? (
                <Moon className="w-4 h-4 text-[var(--dept-text-muted)]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </CivicTooltip>

          {/* Sign Out Action */}
          <CivicTooltip content="Sign Out of Department Console" side="bottom">
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] text-[var(--dept-text-secondary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </CivicTooltip>
        </div>
      </header>
    </CivicTooltipProvider>
  );
};
