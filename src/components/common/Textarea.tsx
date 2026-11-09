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
            className="block text-xs sm:text-sm font-semibold text-[#263E59] mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-[#88413F] ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helperId}
          className={`w-full rounded-lg border bg-white px-3.5 py-3 text-sm sm:text-base text-[#101A28] placeholder:text-[#5A626E]/50 transition-colors focus:bg-white focus:outline-hidden ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/30'
              : 'border-[#DFD9CF] hover:border-[#D5B995] focus:border-[#101A28] focus:ring-1 focus:ring-[#101A28]'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-[#88413F] font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-[#5A626E]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
