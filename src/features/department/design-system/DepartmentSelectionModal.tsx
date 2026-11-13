import React, { useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { type DepartmentId } from '../../../types';
import { DEPARTMENT_THEMES, AUTHORITATIVE_DEPARTMENT_ORDER } from './tokens';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDepartment: (deptId: DepartmentId) => void;
}

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectDepartment,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select Municipal Department Console"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#FAF8F5]/96 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 lg:p-16 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Modal Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-black/[0.08]">
        <div className="flex items-center gap-3">
          <span className="font-serif font-black text-2xl text-[#111827]">a.</span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#111827]">
              Select Municipal Department Console
            </h2>
            <p className="text-xs text-slate-500">Awaaz-e-Awam • Institutional Workspace</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close selection menu"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-bold text-[#111827] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/20"
        >
          <span>Close</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid of All 6 Municipal Authorities */}
      <div
        ref={modalRef}
        className="w-full max-w-5xl mx-auto py-8 sm:py-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
      >
        {AUTHORITATIVE_DEPARTMENT_ORDER.map((deptId, idx) => {
          const config = DEPARTMENT_THEMES[deptId];
          const isRoads = deptId === 'kmc';

          return (
            <button
              key={deptId}
              ref={idx === 0 ? firstButtonRef : undefined}
              type="button"
              onClick={() => onSelectDepartment(deptId)}
              className="group text-left p-5 sm:p-6 rounded-2xl bg-white/80 hover:bg-white border border-black/[0.08] hover:border-black/25 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: config.badgeBg,
                      color: config.badgeText,
                      border: `1px solid ${config.badgeBorder}`,
                    }}
                  >
                    {config.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium truncate">
                    {config.name}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-bold text-[#111827] group-hover:text-black transition-colors">
                  {config.shortName}
                </div>

                <p className="text-xs text-slate-500 line-clamp-1">
                  {config.jurisdiction}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isRoads && (
                  <span className="hidden sm:inline-block text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE CONSOLE
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl bg-black/5 group-hover:bg-[#111827] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Navigation Tip */}
      <div className="w-full max-w-5xl mx-auto pt-6 border-t border-black/[0.08] flex items-center justify-between text-xs text-slate-500">
        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-[11px] text-slate-700 border border-black/10">Esc</kbd> to exit selection</span>
        <span>Awaaz-e-Awam Civic Incident Portal</span>
      </div>
    </div>
  );
};
