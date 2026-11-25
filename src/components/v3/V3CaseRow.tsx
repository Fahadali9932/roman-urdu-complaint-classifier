import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface V3CaseRowProps {
  title: string;
  meta: string;
  status: string;
  statusTone?: 'default' | 'danger' | 'warning' | 'success';
  actionLabel?: string;
  onAction?: () => void;
  focused?: boolean;
  actionDisabled?: boolean;
  testId?: string;
}

/**
 * Operational list row aligned with V3 Case row geometry:
 * 80px desktop height, 88px+ responsive stack on narrow screens,
 * focused tinted row (var(--v3-soft), 12px radius), and >=44px action hit target.
 */
export const V3CaseRow: React.FC<V3CaseRowProps> = ({
  title,
  meta,
  status,
  statusTone = 'default',
  actionLabel = 'Inspect',
  onAction,
  focused = false,
  actionDisabled = false,
  testId,
}) => {
  return (
    <div
      className={`v3-case-row ${focused ? 'is-focused' : ''}`}
      data-testid={testId}
    >
      <div className="min-w-0">
        <div className="v3-case-row-title">{title}</div>
        <div className="v3-case-row-meta">{meta}</div>
      </div>

      <div className="v3-case-row-footer-mobile contents md:contents">
        <span
          className="v3-case-row-status"
          data-tone={statusTone}
        >
          {status}
        </span>

        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="v3-quiet-action"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </div>
  );
};
