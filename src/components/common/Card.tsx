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
      className={`bg-[#283041]/70 backdrop-blur-sm rounded-xl border border-[#34394A] text-[#F1F2F3] shadow-md transition-all duration-200 ${
        hoverable
          ? 'hover:border-[#B5B9BC]/40 hover:bg-[#283041] hover:-translate-y-0.5 cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
