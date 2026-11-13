import React, { useEffect, useRef } from 'react';
import { X, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { type DepartmentId } from '../../../types';
import { DEPARTMENT_THEMES, AUTHORITATIVE_DEPARTMENT_ORDER } from './tokens';

interface DepartmentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDepartment: (deptId: DepartmentId) => void;
  selectedDeptId?: DepartmentId | null;
}

export const DepartmentSelectionModal: React.FC<DepartmentSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectDepartment,
  selectedDeptId,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dept-selection-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-y-auto bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl rounded-[28px] bg-[#10151C]/90 border border-white/12 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.85)] p-6 sm:p-8 lg:p-12 flex flex-col gap-8 my-auto"
      >
        {/* Top Specular Line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden="true"
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#D4AF37]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MUNICIPAL AUTHORITY SELECTOR</span>
            </div>
            <h2
              id="dept-selection-title"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans"
            >
              Select Municipal Department Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Choose your assigned municipal agency to open the dedicated departmental workspace. Departmental permissions are verified by the server upon authentication.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close department selection menu"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Department Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {AUTHORITATIVE_DEPARTMENT_ORDER.map((deptId) => {
            const config = DEPARTMENT_THEMES[deptId];
            const isSelected = selectedDeptId === deptId;
            const isRoads = deptId === 'kmc';

            return (
              <button
                key={deptId}
                type="button"
                onClick={() => {
                  onSelectDepartment(deptId);
                }}
                className={`relative text-left p-5 sm:p-6 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#10151C] flex flex-col justify-between group min-h-[190px] ${
                  isSelected
                    ? 'bg-white/[0.08] border-2 shadow-xl'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20'
                }`}
                style={{
                  borderColor: isSelected ? config.primaryAccent : undefined,
                  boxShadow: isSelected
                    ? `0 12px 32px -8px ${config.primaryAccentGlow}`
                    : undefined,
                  ['--tw-ring-color' as string]: config.focusRing,
                }}
              >
                {/* Header row: Authority Code & Status Badge */}
                <div className="flex items-center justify-between w-full mb-3">
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider"
                    style={{
                      backgroundColor: config.badgeBg,
                      color: config.badgeText,
                      border: `1px solid ${config.badgeBorder}`,
                    }}
                  >
                    {config.code}
                  </span>

                  {isRoads ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/30">
                      <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                      <span>ACTIVE CONSOLE</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-white/5 text-slate-400 border border-white/10">
                      SCHEDULED
                    </span>
                  )}
                </div>

                {/* Main Content */}
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-white transition-colors">
                    {config.shortName}
                  </h3>
                  <p className="text-xs font-medium text-slate-300">
                    {config.name}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 pt-1">
                    {config.jurisdiction}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-3 text-xs font-semibold">
                  <span
                    className="transition-colors"
                    style={{ color: config.primaryAccent }}
                  >
                    {isRoads ? 'Enter Roads Console' : 'Console Specification'}
                  </span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: config.primaryAccent }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-white/10 pt-4">
          <span>
            Strict server-side validation: Sign-in will be rejected if authenticated account does not match chosen department.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white underline cursor-pointer"
          >
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  );
};

