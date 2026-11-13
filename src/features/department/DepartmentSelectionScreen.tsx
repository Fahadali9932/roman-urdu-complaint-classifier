import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, Layers, ArrowUpRight, Wifi, WifiOff } from 'lucide-react';
import { type DepartmentId } from '../../types';
import { DepartmentBackground } from './design-system/DepartmentBackground';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';
import { GlassCard } from './design-system/GlassCard';
import { DEPARTMENT_THEMES } from './design-system/tokens';

interface DepartmentSelectionScreenProps {
  onSelectDepartment: (deptId: DepartmentId) => void;
  isOnline?: boolean;
}

export const DepartmentSelectionScreen: React.FC<DepartmentSelectionScreenProps> = ({
  onSelectDepartment,
  isOnline = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduledNotice, setScheduledNotice] = useState<string | null>(null);

  const handleDepartmentChosen = (deptId: DepartmentId) => {
    if (deptId === 'kmc') {
      setIsModalOpen(false);
      onSelectDepartment(deptId);
    } else {
      const config = DEPARTMENT_THEMES[deptId as keyof typeof DEPARTMENT_THEMES] || DEPARTMENT_THEMES.kmc;
      setScheduledNotice(
        `${config.name} (${config.code}) console is scheduled for deployment in Phase 4C. Please access Roads & Infrastructure (KMC) for current municipal operations.`
      );
      setIsModalOpen(false);
    }
  };

  return (
    <DepartmentBackground departmentId="kmc" showRoadGeometry={true}>
      <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 lg:p-16 relative">
        {/* Top Institutional Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-[#D4AF37] font-serif font-black text-xl shadow-inner shrink-0">
              a.
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Awaaz-e-Awam</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 border border-white/10 px-2 py-0.5 rounded">
                  INSTITUTIONAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Greenwich University • Karachi Municipal Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Offline / Online Network Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono border ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>ONLINE PWA SHELL</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>OFFLINE SHELL</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>All 6 Authorities</span>
            </button>
          </div>
        </header>

        {/* Scheduled Department Notice Banner */}
        {scheduledNotice && (
          <div className="my-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-4 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{scheduledNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setScheduledNotice(null);
                  onSelectDepartment('kmc');
                }}
                className="px-3 py-1 bg-[#D4AF37] text-black font-bold rounded-lg hover:brightness-110 transition cursor-pointer"
              >
                Open Roads Console
              </button>
              <button
                type="button"
                onClick={() => setScheduledNotice(null)}
                className="text-slate-400 hover:text-white cursor-pointer px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Center Dominant Typographic Composition */}
        <main className="my-auto py-12 sm:py-16 flex flex-col items-start max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#D4AF37] mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTHORITATIVE ACCESS CONSOLE</span>
          </div>

          {/* Monumental Primary Heading: Dominant Typographic Element */}
          <h1
            className="text-[2.6rem] xs:text-[3.25rem] sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-white font-sans leading-[0.92] select-none break-normal"
            style={{
              textShadow: '0 20px 40px rgba(0,0,0,0.8)',
            }}
          >
            DEPARTMENT.
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
            Civic incident routing and operational management system for verified municipal officials across Karachi.
          </p>

          {/* Prominent Integrated Department Selector Trigger */}
          <div className="mt-10 sm:mt-12 w-full max-w-xl">
            <GlassCard
              className="p-2 sm:p-2.5 transition-all duration-300 hover:border-white/25 hover:shadow-[0_32px_72px_-12px_rgba(212,175,55,0.18)]"
              accentBorderColor="#D4AF37"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isModalOpen}
                className="w-full text-left p-4 sm:p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between gap-4 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#F3E5AB] font-bold text-base shadow-inner group-hover:scale-105 transition-transform">
                    KMC
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest text-[#D4AF37]">
                      CLICK TO SELECT CONSOLE
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white group-hover:text-white transition-colors">
                      Roads & Infrastructure
                    </div>
                    <div className="text-xs text-slate-400">
                      Karachi Metropolitan Corporation (Active)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                  <span className="text-xs font-mono hidden sm:inline text-slate-400">
                    OPEN MENU
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-black group-hover:border-[#D4AF37] transition-all">
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            </GlassCard>

            <div className="flex items-center justify-between mt-3 px-2 text-xs text-slate-400">
              <span>Press Space or Click to open authority list</span>
              <button
                type="button"
                onClick={() => onSelectDepartment('kmc')}
                className="text-[#D4AF37] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Direct to Roads Login</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>

        {/* Footer Attribution */}
        <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 border-t border-white/10 pt-6">
          <div className="flex items-center gap-4">
            <span>© 2026 Awaaz-e-Awam</span>
            <span>•</span>
            <span>Department Portal PWA</span>
            <span>•</span>
            <span className="text-slate-400">Institutional Use Only</span>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            SECURE ACCESS • SERVER-ENFORCED MEMBERSHIP
          </div>
        </footer>
      </div>

      {/* Full-Screen Department Selection Menu */}
      <DepartmentSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectDepartment={handleDepartmentChosen}
        selectedDeptId="kmc"
      />
    </DepartmentBackground>
  );
};
