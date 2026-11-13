import React, { useState, useRef, useEffect } from 'react';
import { type DepartmentId, type Department } from '../../../types';
import { useDepartmentAuth } from '../../../context/DepartmentAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ChevronDown, Check } from 'lucide-react';
import { getDepartmentIcon } from '../../department/components/DepartmentHeader';

interface DepartmentSelectorProps {
  value: DepartmentId | '';
  onChange: (id: DepartmentId) => void;
  placeholder?: string;
  id?: string;
  hasError?: boolean;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select department',
  id = 'department-selector',
  hasError = false,
}) => {
  const { availableDepartments } = useDepartmentAuth();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDepartment: Department | undefined = availableDepartments.find(
    (d) => d.id === value
  );

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-[48px] px-3.5 rounded-xl border bg-white text-[#0F1E21] flex items-center justify-between transition-colors focus:outline-none focus:border-[#122E32] focus:ring-2 focus:ring-[#122E32]/15 cursor-pointer ${
          hasError
            ? 'border-rose-400 bg-rose-50/20'
            : isOpen
            ? 'border-[#122E32] ring-2 ring-[#122E32]/10'
            : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedDepartment ? (
            <>
              <div className="w-6 h-6 rounded-md bg-[#F1F5F9] text-[#2C4A52] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                {getDepartmentIcon(selectedDepartment.id, 'w-3.5 h-3.5')}
              </div>
              <span className="block text-sm font-medium text-[#0F1E21] truncate text-left rtl:text-right">
                {language === 'ur' ? selectedDepartment.nameUrdu : selectedDepartment.name}
              </span>
            </>
          ) : (
            <span className="block text-sm text-[#94A3B8] truncate text-left rtl:text-right">
              {placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedDepartment && (
            <span className="font-mono text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
              {selectedDepartment.code}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[#64748B] transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden py-1 max-h-[260px] overflow-y-auto"
          role="listbox"
          tabIndex={-1}
        >
          {availableDepartments.map((dept) => {
            const isSelected = value === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  onChange(dept.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left rtl:text-right transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#F1F5F9] font-semibold text-[#0F1E21]'
                    : 'hover:bg-[#F8FAFC] text-[#1E293B]'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#122E32] text-white border-[#122E32]'
                        : 'bg-[#F1F5F9] text-[#2C4A52] border-[#E2E8F0]'
                    }`}
                  >
                    {getDepartmentIcon(dept.id, 'w-3.5 h-3.5')}
                  </div>
                  <span className="block text-sm truncate">
                    {language === 'ur' ? dept.nameUrdu : dept.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-[#64748B]">{dept.code}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#122E32]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
