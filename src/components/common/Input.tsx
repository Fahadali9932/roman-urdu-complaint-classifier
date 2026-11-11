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
            className="block text-xs sm:text-sm font-medium text-[#141414] mb-1.5 select-none font-ui"
          >
            {label}
            {props.required && <span className="text-[#681822] ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[#6B6864]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full min-h-[50px] rounded-xl border bg-[#FAF9F7] px-4 py-3 text-sm sm:text-base text-[#141414] placeholder:text-[#88827A] transition-[border-color,box-shadow,background-color] duration-150 outline-none ${
              leftIcon ? 'ps-11' : ''
            } ${rightAction || rightIcon ? 'pe-11' : ''} ${
              error
                ? 'border-[#B4233E] focus:bg-white focus:border-[#B4233E] focus:shadow-[0_0_0_3px_rgba(180,35,62,0.12)]'
                : 'border-[#E6E3DF] hover:border-[#C8C2BA] focus:bg-white focus:border-[#681822] focus:shadow-[0_0_0_3px_rgba(104,24,34,0.10)]'
            } ${className}`}
            {...props}
          />
          {rightAction ? (
            <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
              {rightAction}
            </div>
          ) : (
            rightIcon && (
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-[#6B6864]">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-[#681822] font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-[#6B6864]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
