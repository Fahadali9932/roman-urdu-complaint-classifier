import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface LiquidSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * Apple-inspired contextual sheet / dialog (centered modal on desktop, bottom sheet on mobile).
 */
export const LiquidSheet: React.FC<LiquidSheetProps> = ({
  open,
  title,
  onClose,
  children,
  maxWidth = 560,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="lg-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="lg-glass-popover lg-sheet-surface"
        style={{ maxWidth: `${maxWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--lg-border-hairline)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--lg-ink)' }}>
            {title}
          </h2>
          <button
            type="button"
            className="lg-icon-btn"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
