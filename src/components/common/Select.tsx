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
            className="block text-xs sm:text-sm font-semibold text-[#263E59] mb-1.5 select-none"
          >
            {label}
            {props.required && <span className="text-[#88413F] ms-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={`w-full min-h-[44px] appearance-none rounded-lg border bg-white px-3.5 pe-10 py-2.5 text-sm sm:text-base text-[#101A28] transition-colors focus:bg-white focus:outline-hidden ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/30'
                : 'border-[#DFD9CF] hover:border-[#D5B995] focus:border-[#101A28] focus:ring-1 focus:ring-[#101A28]'
            } ${className}`}
            {...props}
          >
            {placeholder && <option value="" className="bg-white text-[#5A626E]">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#101A28]">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-[#5A626E]">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
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

Select.displayName = 'Select';
