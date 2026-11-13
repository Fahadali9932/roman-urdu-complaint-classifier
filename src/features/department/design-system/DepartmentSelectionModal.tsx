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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[560px] bg-[#1a191d]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_32px_90px_rgba(0,0,0,0.65)] p-6 sm:p-7 text-white animate-scaleIn"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-5">
          <div>
            <h1
              id="choose-department-title"
              className="text-2xl sm:text-[26px] font-bold tracking-tight text-white"
            >
              Choose department
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Continue to your department sign-in.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close department selector"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Restrained Department Rows */}
        <div className="space-y-0 border-t border-white/[0.09]">
          {DEPARTMENT_CHOICES.map((dept, index) => (
            <button
              key={dept.id}
              ref={index === 0 ? firstButtonRef : undefined}
              type="button"
              onClick={() => onSelectDepartment(dept.id)}
              className="w-full group flex items-center justify-between py-4 px-2 sm:px-3 text-left border-b border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition-all cursor-pointer focus:outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-white/20"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                  {dept.icon}
                </div>
                <span className="font-semibold text-sm sm:text-base text-slate-100 group-hover:text-white transition-colors">
                  {dept.name}
                </span>
              </div>

              <div className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Modal Footer Note */}
        <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Esc to close</span>
          <span className="text-[11px] text-slate-500/80">Awaaz-e-Awam</span>
        </div>
      </div>
    </div>
  );
};
