import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface V3WorkspaceMenuItem {
  id: string;
  label: string;
  meta?: string;
  group?: string;
  mobileOnly?: boolean;
  to?: string;
  onSelect?: () => void;
  active?: boolean;
}

interface V3WorkspaceMenuProps {
  subtitle: string;
  items: V3WorkspaceMenuItem[];
  onClose: () => void;
  onSignOut: () => void;
  signOutLabel?: string;
  footerSlot?: React.ReactNode;
}

/**
 * Full-page centered Workspace menu matching the V3 Workspace menu frames
 * (640px max width, 52px bordered rows with right chevrons, Sign out footer).
 */
export const V3WorkspaceMenu: React.FC<V3WorkspaceMenuProps> = ({
  subtitle,
  items,
  onClose,
  onSignOut,
  signOutLabel = 'Sign out',
  footerSlot,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <section
      className="v3-main-column"
      aria-label="Workspace menu"
      data-testid="v3-workspace-menu"
    >
      <div className="mx-auto w-full max-w-[640px]">
        <button
          type="button"
          onClick={onClose}
          className="v3-quiet-action mb-5 -ml-3 justify-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to workspace</span>
        </button>

        <h1 className="v3-page-h1" style={{ fontSize: '32px' }}>
          Workspace
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--v3-muted)' }}>
          {subtitle}
        </p>

        <div className="mt-6 space-y-5" role="menu">
          {items.map((item, idx) => {
            const prevGroup = idx > 0 ? items[idx - 1].group : undefined;
            const showGroupHeader = Boolean(item.group && item.group !== prevGroup);
            const inner = (
              <>
                <span className="min-w-0">
                  <span
                    className="block text-[15px] font-medium"
                    style={{ color: 'var(--v3-ink)' }}
                  >
                    {item.label}
                  </span>
                  {item.meta && (
                    <span
                      className="block text-[13px]"
                      style={{ color: 'var(--v3-muted)' }}
                    >
                      {item.meta}
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0"
                  style={{ color: 'var(--v3-muted)' }}
                />
              </>
            );

            const visibilityClass = item.mobileOnly ? 'md:hidden ' : '';
            const rowClass =
              `${visibilityClass}flex min-h-[54px] w-full items-center justify-between gap-4 rounded-[12px] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--v3-soft)]/50`;

            const control =
              item.to && !item.onSelect ? (
                <Link
                  to={item.to}
                  role="menuitem"
                  onClick={onClose}
                  className={rowClass}
                  style={{
                    backgroundColor: item.active ? 'var(--v3-soft)' : 'transparent',
                    border: item.active ? '1px solid var(--v3-edge)' : '1px solid transparent',
                  }}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  data-menu-item={item.id}
                  onClick={() => {
                    item.onSelect?.();
                    onClose();
                  }}
                  className={rowClass}
                  style={{
                    backgroundColor: item.active ? 'var(--v3-soft)' : 'transparent',
                    border: item.active ? '1px solid var(--v3-edge)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {inner}
                </button>
              );

            return (
              <React.Fragment key={item.id}>
                {showGroupHeader && (
                  <div
                    className={`${visibilityClass}pt-2 px-3.5 text-[12px] font-medium`}
                    style={{ color: 'var(--v3-muted)' }}
                  >
                    {item.group}
                  </div>
                )}
                {control}
              </React.Fragment>
            );
          })}
        </div>

        {footerSlot && <div className="mt-6">{footerSlot}</div>}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={onSignOut}
            data-testid="v3-sign-out"
            className="v3-quiet-action -ml-3 justify-start"
            style={{ color: 'var(--v3-danger)' }}
          >
            <LogOut className="h-4 w-4" />
            <span>{signOutLabel}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
