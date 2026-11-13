import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline';
  isLoading?: boolean;
  icon?: ReactNode;
  accentColor?: string;
  accentHoverColor?: string;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'dark',
  isLoading = false,
  icon,
  accentColor = '#111827',
  accentHoverColor = '#000000',
  className = '',
  disabled,
  ...rest
}) => {
  const isDark = variant === 'dark' || variant === 'primary';
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const baseStyle =
    'relative inline-flex items-center justify-center font-bold text-sm tracking-wide rounded-2xl py-3.5 px-6 transition-all duration-200 active:scale-[0.99] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  let variantStyle = '';
  if (isDark) {
    variantStyle =
      'bg-[#111827] hover:bg-black text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] focus:ring-[#111827]/40';
  } else if (isOutline) {
    variantStyle =
      'bg-transparent hover:bg-black/5 text-[#111827] border border-black/15 focus:ring-[#111827]/30';
  } else if (isSecondary) {
    variantStyle =
      'bg-white/80 hover:bg-white text-[#111827] border border-black/10 shadow-sm focus:ring-[#111827]/30';
  }

  return (
    <button
      disabled={disabled || isLoading}
      style={{
        ['--btn-accent' as string]: accentColor,
        ['--btn-hover' as string]: accentHoverColor,
      }}
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Signing In...</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <span>{children}</span>
          {icon && <span className="shrink-0">{icon}</span>}
        </span>
      )}
    </button>
  );
};
