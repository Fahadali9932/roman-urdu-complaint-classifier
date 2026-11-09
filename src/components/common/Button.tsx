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
    'inline-flex items-center justify-center font-ui font-medium rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98] tracking-normal';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-7 py-3.5 min-h-[50px] gap-2.5 font-medium',
  };

  const variantStyles = {
    primary:
      'bg-[#681822] hover:bg-[#53131B] text-[#FFFFFF] font-medium shadow-md shadow-[#681822]/20 focus-visible:outline-[#681822]',
    secondary:
      'bg-[#FFFFFF] hover:bg-[#FAF9F7] text-[#141414] border border-[#E5E3E0] hover:border-[#141414]/40 shadow-xs focus-visible:outline-[#141414]',
    civic:
      'bg-[#141414] hover:bg-[#323232] text-[#FFFFFF] font-medium shadow-md focus-visible:outline-[#141414]',
    outline:
      'border border-[#E5E3E0] bg-transparent hover:border-[#141414] hover:bg-[#141414]/05 text-[#141414] focus-visible:outline-[#141414]',
    ghost:
      'bg-transparent hover:bg-[#141414]/05 text-[#323232] hover:text-[#141414] focus-visible:outline-[#141414]',
    danger:
      'bg-[#681822] hover:bg-[#53131B] text-white shadow-xs focus-visible:outline-[#681822]',
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
