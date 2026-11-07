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
            className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full min-h-[44px] rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:bg-white focus:outline-hidden ${
              leftIcon ? 'ps-10' : ''
            } ${rightAction || rightIcon ? 'pe-11' : ''} ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600'
            } ${className}`}
            {...props}
          />
          {rightAction ? (
            <div className="absolute inset-y-0 end-0 pe-2 flex items-center">
              {rightAction}
            </div>
          ) : rightIcon ? (
            <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
