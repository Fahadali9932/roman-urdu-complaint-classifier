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
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#126B63] hover:bg-[#17423F] text-white shadow-xs focus-visible:outline-[#126B63] active:bg-[#0f4b46]',
    secondary:
      'bg-[#172D31] hover:bg-[#112225] text-white shadow-xs focus-visible:outline-[#172D31]',
    civic:
      'bg-[#126B63] hover:bg-[#17423F] text-white shadow-sm ring-1 ring-white/20',
    outline:
      'border border-[#DFE7E4] bg-white/80 hover:bg-white text-[#172D31] hover:text-[#172D31] focus-visible:outline-[#126B63] shadow-2xs',
    ghost:
      'bg-transparent hover:bg-[#DFE7E4]/50 text-[#172D31] focus-visible:outline-[#126B63]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:outline-rose-600',
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
