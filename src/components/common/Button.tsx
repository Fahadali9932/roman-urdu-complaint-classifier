import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'civic';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-3 min-h-[48px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-teal-700 hover:bg-teal-800 text-white shadow-xs focus-visible:outline-teal-700 active:bg-teal-900',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white shadow-xs focus-visible:outline-slate-800 active:bg-slate-950',
    civic:
      'bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 hover:from-slate-800 hover:to-teal-900 text-white shadow-sm ring-1 ring-white/10',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 focus-visible:outline-teal-600 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 focus-visible:outline-slate-600',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:outline-rose-600 active:bg-rose-800',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
