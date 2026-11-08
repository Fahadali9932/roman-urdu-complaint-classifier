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
      'bg-[#F1F2F3] hover:bg-[#FFFFFF] text-[#0B1421] font-semibold shadow-md shadow-[#0B1421]/40 focus-visible:outline-[#F1F2F3]',
    secondary:
      'bg-[#283041] hover:bg-[#34394A] text-[#F1F2F3] border border-[#34394A] shadow-xs focus-visible:outline-[#F1F2F3]',
    civic:
      'bg-[#F1F2F3] hover:bg-[#FFFFFF] text-[#0B1421] font-semibold shadow-md focus-visible:outline-[#F1F2F3]',
    outline:
      'border border-[#34394A] bg-transparent hover:border-[#B5B9BC] hover:bg-[#283041]/40 text-[#B5B9BC] hover:text-[#F1F2F3] focus-visible:outline-[#F1F2F3]',
    ghost:
      'bg-transparent hover:bg-[#283041] text-[#B5B9BC] hover:text-[#F1F2F3] focus-visible:outline-[#F1F2F3]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:outline-rose-500',
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
