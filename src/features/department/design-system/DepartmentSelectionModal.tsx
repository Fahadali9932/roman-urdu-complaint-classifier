import React, { useEffect, useRef } from 'react';
import { X, ArrowRight, Zap, Droplets, Flame, Trash2, Building2, Route as RoadIcon } from 'lucide-react';
import { type DepartmentId } from '../../../types';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDepartment: (deptId: DepartmentId) => void;
}

interface DepartmentRowItem {
  id: DepartmentId;
  name: string;
  icon: React.ReactNode;
}

const DEPARTMENT_CHOICES: DepartmentRowItem[] = [
  {
    id: 'kmc',
    name: 'Roads & Infrastructure',
    icon: <RoadIcon className="w-4 h-4 text-amber-300/90" />,
  },
  {
    id: 'kelectric',
    name: 'Electricity & Power',
    icon: <Zap className="w-4 h-4 text-blue-400" />,
  },
  {
    id: 'kwsc',
    name: 'Water & Sewerage',
    icon: <Droplets className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'ssgc',
    name: 'Gas Utility',
    icon: <Flame className="w-4 h-4 text-amber-500" />,
  },
  {
    id: 'sswmb',
    name: 'Sanitation',
    icon: <Trash2 className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'sbca',
    name: 'Building Control',
    icon: <Building2 className="w-4 h-4 text-purple-400" />,
  },
];

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectDepartment,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first choice on open
    const timer = setTimeout(() => {
      firstButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-department-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[540px] rounded-[24px] border p-6 sm:p-8 shadow-2xl animate-scaleIn"
        style={{
          backgroundColor: 'var(--v3-surface-glass)',
          borderColor: 'var(--v3-edge)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: 'var(--v3-ink)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-5">
          <div>
            <h1
              id="choose-department-title"
              className="text-[26px] font-medium tracking-tight"
              style={{ color: 'var(--v3-ink)' }}
            >
              Choose department
            </h1>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--v3-muted)' }}>
              Continue to your department sign-in.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close department selector"
            className="v3-icon-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 6 Clean Hairline Department Rows */}
        <div className="border-t" style={{ borderColor: 'var(--v3-edge)' }}>
          {DEPARTMENT_CHOICES.map((dept, index) => (
            <button
              key={dept.id}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              onClick={() => onSelectDepartment(dept.id)}
              className="group flex min-h-[56px] w-full items-center justify-between border-b px-3 py-3 text-left transition-colors hover:bg-[var(--v3-soft)]/60 cursor-pointer"
              style={{ borderColor: 'var(--v3-edge)' }}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                  style={{
                    backgroundColor: 'var(--v3-raised)',
                    borderColor: 'var(--v3-edge)',
                  }}
                >
                  {dept.icon}
                </div>
                <span
                  className="text-[15px] font-medium"
                  style={{ color: 'var(--v3-ink)' }}
                >
                  {dept.name}
                </span>
              </div>

              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--v3-accent)' }}
              />
            </button>
          ))}
        </div>

        {/* Modal Footer Note */}
        <div
          className="flex items-center justify-between pt-4 text-[12px]"
          style={{ color: 'var(--v3-muted)' }}
        >
          <span>Esc to close</span>
          <span>Awaaz-e-Awam</span>
        </div>
      </div>
    </div>
  );
};
