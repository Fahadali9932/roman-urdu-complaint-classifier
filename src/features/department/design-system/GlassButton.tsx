import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  accentColor?: string;
  accentHoverColor?: string;
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  accentColor = '#D4AF37',
  accentHoverColor = '#E5C158',
  icon,
  className = '',
  disabled,
  ...rest
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <button
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center gap-2 font-bold text-sm tracking-wide rounded-xl py-3.5 px-6 transition-all duration-200 active:scale-[0.99] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0C1015] ${
        disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''
      } ${
        isPrimary
          ? 'text-[#0C1015] shadow-lg'
          : isSecondary
          ? 'bg-white/5 border border-white/15 text-white hover:bg-white/10'
          : 'bg-transparent text-slate-300 hover:text-white'
      } ${className}`}
      style={
        isPrimary
          ? {
              backgroundColor: accentColor,
              boxShadow: `0 8px 24px -4px ${accentColor}44`,
            }
          : undefined
      }
      onMouseEnter={(e) => {
        if (isPrimary && !disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = accentHoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (isPrimary && !disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = accentColor;
        }
      }}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Authenticating...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
