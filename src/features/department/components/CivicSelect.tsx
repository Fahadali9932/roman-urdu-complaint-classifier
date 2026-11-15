import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

export interface CivicSelectOption {
  value: string;
  label: string;
}

interface CivicSelectProps {
  id?: string;
  label?: string;
  value: string;
  onValueChange: (val: string) => void;
  options: CivicSelectOption[];
  ariaLabel?: string;
  className?: string;
}

export const CivicSelect: React.FC<CivicSelectProps> = ({
  id,
  label,
  value,
  onValueChange,
  options,
  ariaLabel,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs text-[var(--dept-text-secondary)] font-medium select-none shrink-0"
        >
          {label}
        </label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel || label || 'Select option'}
          className="inline-flex items-center justify-between gap-2 h-9 px-3 rounded-lg bg-[var(--dept-surface)] border border-[var(--dept-border)] hover:border-[var(--dept-border-strong)] text-xs text-[var(--dept-text-primary)] font-medium shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--dept-accent)] transition-colors cursor-pointer select-none min-w-[140px]"
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--dept-text-muted)] shrink-0" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[160px] overflow-hidden rounded-xl bg-[var(--dept-surface)] border border-[var(--dept-border-strong)] p-1 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          >
            <SelectPrimitive.Viewport className="p-0.5">
              {options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex items-center justify-between px-3 py-2 text-xs text-[var(--dept-text-primary)] rounded-md outline-none cursor-pointer select-none data-[highlighted]:bg-[var(--dept-surface-hover)] data-[highlighted]:text-[var(--dept-accent)] data-[state=checked]:font-semibold transition-colors"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="w-3.5 h-3.5 text-[var(--dept-accent)] ml-2 shrink-0" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
};
