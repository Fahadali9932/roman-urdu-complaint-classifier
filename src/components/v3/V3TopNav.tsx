import React from 'react';
import { MoreHorizontal, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface V3NavTab {
  id: string;
  label: string;
  to?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

interface V3TopNavProps {
  brandLabel?: string;
  brandTo?: string;
  tabs: V3NavTab[];
  activeTabId?: string;
  onTabSelect?: (tabId: string) => void;
  onOpenMenu: () => void;
  menuOpen?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  avatarInitial: string;
  avatarLabel?: string;
  extraActions?: React.ReactNode;
}

/**
 * Floating 1120x56px frosted pill navigation shared across Department Head,
 * Field Officer, and Central Administrator V3 workspaces.
 */
export const V3TopNav: React.FC<V3TopNavProps> = ({
  brandLabel = 'Awaaz-e-Awam',
  brandTo,
  tabs,
  activeTabId,
  onTabSelect,
  onOpenMenu,
  menuOpen = false,
  theme,
  onToggleTheme,
  avatarInitial,
  avatarLabel = 'Workspace account',
  extraActions,
}) => {
  const brandNode = brandTo ? (
    <Link to={brandTo} className="v3-nav-brand">
      {brandLabel}
    </Link>
  ) : (
    <span className="v3-nav-brand">{brandLabel}</span>
  );

  return (
    <header className="v3-nav-outer">
      <nav className="v3-nav-pill" aria-label="Workspace navigation">
        {brandNode}

        <div className="v3-nav-tabs" role="tablist" aria-label="Primary sections">
          {tabs.map((tab) => {
            const isActive = tab.active ?? (activeTabId === tab.id);
            const content = (
              <>
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: isActive ? 'var(--v3-surface)' : 'var(--v3-soft)',
                      color: 'var(--v3-ink)',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </>
            );

            if (tab.to && !tab.onClick && !onTabSelect) {
              return (
                <Link
                  key={tab.id}
                  to={tab.to}
                  data-nav-section={tab.id}
                  aria-current={isActive ? 'page' : undefined}
                  className={`v3-nav-tab ${isActive ? 'is-active' : ''}`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                data-nav-section={tab.id}
                onClick={() => {
                  tab.onClick?.();
                  onTabSelect?.(tab.id);
                }}
                className={`v3-nav-tab ${isActive ? 'is-active' : ''}`}
              >
                {content}
              </button>
            );
          })}
        </div>

        <div className="v3-nav-actions">
          {extraActions}

          <button
            type="button"
            className="v3-icon-btn"
            onClick={onOpenMenu}
            aria-label="Open workspace menu"
            aria-expanded={menuOpen}
            data-testid="v3-workspace-menu-trigger"
            title="Workspace menu"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </button>

          <button
            type="button"
            className="v3-icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="v3-theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            )}
          </button>

          <div
            className="v3-avatar-pill"
            aria-label={avatarLabel}
            title={avatarLabel}
          >
            {(avatarInitial || 'S').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </nav>
    </header>
  );
};
