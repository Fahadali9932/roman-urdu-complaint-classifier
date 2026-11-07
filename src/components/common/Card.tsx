import React, { type ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden ${
        hoverable ? 'hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
