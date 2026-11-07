import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  rightAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      rightAction,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const helperId = helperText && inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full text-start">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-[#172D31] mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[#667679]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full min-h-[44px] rounded-lg border bg-white px-3.5 py-2.5 text-sm sm:text-base text-[#172D31] placeholder:text-[#667679]/60 transition-colors focus:bg-white focus:outline-hidden ${
              leftIcon ? 'ps-10' : ''
            } ${rightAction || rightIcon ? 'pe-11' : ''} ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-[#DFE7E4] focus:border-[#126B63] focus:ring-1 focus:ring-[#126B63]'
            } ${className}`}
            {...props}
          />
          {rightAction && (
            <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
              {rightAction}
            </div>
          )}
          {rightIcon && !rightAction && (
            <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-[#667679]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-600 font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-[#667679]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
