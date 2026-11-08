import React, { type ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'slate' | 'teal' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  const variantStyles = {
    slate: 'bg-[#283041] text-[#B5B9BC] border-[#34394A]',
    teal: 'bg-[#182d27] text-[#86efac] border-[#224b3f]',
    emerald: 'bg-[#182d27] text-[#86efac] border-[#224b3f]',
    amber: 'bg-[#2f2413] text-[#fde047] border-[#4c3a1f]',
    rose: 'bg-[#331821] text-[#fca5a5] border-[#552735]',
    blue: 'bg-[#16273b] text-[#93c5fd] border-[#243e5c]',
    purple: 'bg-[#251b38] text-[#d8b4fe] border-[#3e2e5a]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
