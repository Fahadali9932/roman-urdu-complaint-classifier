import React, { useEffect } from 'react';
import { ArrowLeft, ChevronRight, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface V3WorkspaceMenuItem {
  id: string;
  label: string;
  meta?: string;
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

        <div
          className="mt-8 border-t"
          style={{ borderColor: 'var(--v3-edge)' }}
          role="menu"
        >
          {items.map((item) => {
            const inner = (
              <>
                <span className="min-w-0">
                  <span
                    className="block text-[16px] font-medium"
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

            const rowClass =
              'flex min-h-[56px] w-full items-center justify-between gap-4 border-b px-2 text-left transition-colors hover:bg-[var(--v3-soft)]/50';

            if (item.to && !item.onSelect) {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  role="menuitem"
                  onClick={onClose}
                  className={rowClass}
                  style={{
                    borderColor: 'var(--v3-edge)',
                    backgroundColor: item.active ? 'var(--v3-soft)' : 'transparent',
                  }}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                data-menu-item={item.id}
                onClick={() => {
                  item.onSelect?.();
                  onClose();
                }}
                className={rowClass}
                style={{
                  borderColor: 'var(--v3-edge)',
                  backgroundColor: item.active ? 'var(--v3-soft)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {inner}
              </button>
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
