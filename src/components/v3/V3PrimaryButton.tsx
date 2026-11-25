import React from 'react';

interface V3PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const V3PrimaryButton: React.FC<V3PrimaryButtonProps> = ({
  children,
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`v3-btn-primary ${className}`}
    {...props}
  >
    {children}
  </button>
);

interface V3QuietActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const V3QuietAction: React.FC<V3QuietActionProps> = ({
  children,
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`v3-quiet-action ${className}`}
    {...props}
  >
    {children}
  </button>
);

interface V3RadioOptionCardProps {
  selected: boolean;
  title: string;
  description?: string;
  rightMeta?: string;
  onSelect: () => void;
  disabled?: boolean;
  name?: string;
}

export const V3RadioOptionCard: React.FC<V3RadioOptionCardProps> = ({
  selected,
  title,
  description,
  rightMeta,
  onSelect,
  disabled = false,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onSelect}
    className={`v3-radio-card ${selected ? 'is-selected' : ''}`}
  >
    <div className="min-w-0">
      <div className="text-[15px] font-medium" style={{ color: 'var(--v3-ink)' }}>
        {title}
      </div>
      {description && (
        <div className="mt-0.5 text-[13px]" style={{ color: 'var(--v3-muted)' }}>
          {description}
        </div>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-3">
      {rightMeta && (
        <span className="text-[12px] font-medium" style={{ color: 'var(--v3-muted)' }}>
          {rightMeta}
        </span>
      )}
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border"
        style={{
          borderColor: selected ? 'var(--v3-action)' : 'var(--v3-edge)',
          backgroundColor: selected ? 'var(--v3-action)' : 'transparent',
        }}
        aria-hidden="true"
      >
        {selected && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--v3-onaction)' }}
          />
        )}
      </span>
    </div>
  </button>
);
