import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);
    const errorId = error && selectId ? `${selectId}-error` : undefined;
    const helperId = helperText && selectId ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full text-start">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs sm:text-sm font-semibold text-[#111111] mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-2xs">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full min-h-[44px] appearance-none rounded-lg border bg-white px-3.5 pe-10 py-2.5 text-sm sm:text-base text-[#111111] transition-colors focus:bg-white focus:outline-hidden ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-[#D5D5D3] focus:border-[#111111] focus:ring-1 focus:ring-[#111111]'
            } ${className}`}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-[#5B5B5B]">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-600 font-medium" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-xs text-[#5B5B5B]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
