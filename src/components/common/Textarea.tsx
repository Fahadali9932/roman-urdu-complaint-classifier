import { type TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
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
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`w-full rounded-lg border bg-white px-3.5 py-3 text-sm sm:text-base text-[#141414] placeholder:text-[#6B6864]/50 transition-colors focus:bg-white focus:outline-hidden ${
            error
              ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
              : 'border-[#E5E3E0] hover:border-[#323232] focus:border-[#141414] focus:ring-1 focus:ring-[#141414]'
          } ${className}`}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
