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
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.99] tracking-tight';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-7 py-3.5 min-h-[50px] gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-[#101A28] hover:bg-[#263E59] text-[#F0EDE7] font-semibold shadow-md shadow-[#101A28]/20 focus-visible:outline-[#101A28]',
    secondary:
      'bg-[#E8E3DA] hover:bg-[#DFD8CC] text-[#101A28] border border-[#D5B995]/60 shadow-xs focus-visible:outline-[#101A28]',
    civic:
      'bg-[#101A28] hover:bg-[#263E59] text-[#F0EDE7] font-semibold shadow-md focus-visible:outline-[#101A28]',
    outline:
      'border border-[#D5B995]/80 bg-transparent hover:border-[#101A28] hover:bg-[#D5B995]/20 text-[#101A28] focus-visible:outline-[#101A28]',
    ghost:
      'bg-transparent hover:bg-[#D5B995]/20 text-[#263E59] hover:text-[#101A28] focus-visible:outline-[#101A28]',
    danger:
      'bg-[#88413F] hover:bg-[#6E3331] text-white shadow-xs focus-visible:outline-[#88413F]',
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
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
