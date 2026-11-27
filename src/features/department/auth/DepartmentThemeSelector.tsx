import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  type AuthorizedDepartmentKey,
} from '../services/departmentThemes';

export interface DepartmentOption {
  key: AuthorizedDepartmentKey;
  label: string;
  fullName: string;
  swatchHex: string;
}

export const DEPARTMENT_OPTIONS: DepartmentOption[] = [
  { key: 'kmc', label: 'KMC', fullName: 'Karachi Metropolitan Corporation', swatchHex: '#E5A044' },
  { key: 'kelectric', label: 'K-Electric', fullName: 'K-Electric (Infrastructure & Distribution)', swatchHex: '#548EFF' },
  { key: 'kwsc', label: 'KW&SC', fullName: 'Karachi Water & Sewerage Corporation', swatchHex: '#42C6C9' },
  { key: 'sswmb', label: 'SSWMB', fullName: 'Sindh Solid Waste Management Board', swatchHex: '#58C78C' },
  { key: 'gas', label: 'SSGC', fullName: 'Sui Southern Gas Company', swatchHex: '#EC667B' },
  { key: 'sbca', label: 'SBCA', fullName: 'Sindh Building Control Authority', swatchHex: '#AA80E8' },
  { key: 'admin', label: 'Central Admin', fullName: 'Central Municipal Administration', swatchHex: '#A4B2C5' },
];

export interface DepartmentThemeSelectorProps {
  selectedDeptKey: AuthorizedDepartmentKey;
  onSelectDepartment: (deptKey: AuthorizedDepartmentKey) => void;
  className?: string;
  themeMode?: 'light' | 'dark';
}

export const DepartmentThemeSelector: React.FC<DepartmentThemeSelectorProps> = ({
  selectedDeptKey,
  onSelectDepartment,
  className = '',
  themeMode = 'dark',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption =
    DEPARTMENT_OPTIONS.find((opt) => opt.key === selectedDeptKey) ||
    DEPARTMENT_OPTIONS[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isLight = themeMode === 'light';

  return (
    <div
      ref={containerRef}
      className={`v20-department-theme-selector-wrap ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 650,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isLight ? '#454545' : 'rgba(242, 239, 233, 0.7)',
          marginBottom: '6px',
        }}
      >
        Department
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="department-theme-selector-trigger"
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.06)',
          border: isLight
            ? '1px solid rgba(0, 0, 0, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.14)',
          color: isLight ? '#171717' : '#F2EFE9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'border-color 180ms ease, background 180ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {/* Approved Department Swatch */}
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: activeOption.swatchHex,
              boxShadow: `0 0 10px ${activeOption.swatchHex}80`,
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isLight ? '#171717' : '#F2EFE9',
            }}
          >
            {activeOption.fullName}
          </span>
        </div>

        <ChevronDown
          size={16}
          style={{
            color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.6)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          data-testid="department-theme-options-list"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 200,
            padding: '6px',
            borderRadius: '16px',
            background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(16, 20, 28, 0.96)',
            border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {DEPARTMENT_OPTIONS.map((opt) => {
            const isSelected = opt.key === selectedDeptKey;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={`department-option-${opt.key}`}
                onClick={() => {
                  onSelectDepartment(opt.key);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isSelected
                    ? isLight
                      ? 'rgba(0, 0, 0, 0.06)'
                      : 'rgba(255, 255, 255, 0.1)'
                    : 'transparent',
                  color: isLight ? '#171717' : '#F2EFE9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  transition: 'background 140ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: opt.swatchHex,
                      boxShadow: `0 0 8px ${opt.swatchHex}80`,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: isSelected ? 650 : 500 }}>
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: isLight ? '#626262' : 'rgba(242, 239, 233, 0.6)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {opt.fullName}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check
                    size={15}
                    style={{
                      color: opt.swatchHex,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
