import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { type DepartmentId } from '../../types';
import { LimeRibbonArtwork } from './design-system/DepartmentArtwork';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';

interface DepartmentSelectionScreenProps {
  onSelectDepartment: (deptId: DepartmentId) => void;
  isOnline?: boolean;
}

export const DepartmentSelectionScreen: React.FC<DepartmentSelectionScreenProps> = ({
  onSelectDepartment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDepartmentChosen = (deptId: DepartmentId) => {
    setIsModalOpen(false);
    onSelectDepartment(deptId);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#FAF8F5] text-[#111827] flex flex-col justify-between selection:bg-[#111827] selection:text-white">
      {/* 1. Sweeping Vibrant Lime Ribbon Artwork (Reference 03) */}
      <LimeRibbonArtwork />

      {/* 2. Top Clean Branding */}
      <header className="relative z-10 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-serif font-black text-2xl text-[#111827]">a.</span>
          <span className="font-bold text-base tracking-tight text-[#111827]">
            Awaaz-e-Awam
          </span>
        </div>
      </header>

      {/* 3. Center Monumental Typography & Prominent Selector Composition */}
      <main className="relative z-10 w-full px-6 sm:px-12 my-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl flex flex-col items-center">
          {/* Monumental DEPARTMENT Heading */}
          <h1 className="w-full text-center text-[2.6rem] xs:text-[3.25rem] sm:text-7xl md:text-8xl lg:text-[9.5rem] font-black tracking-tighter text-[#111827] leading-[0.88] select-none uppercase mb-6 sm:mb-8">
            DEPARTMENT.
          </h1>

          {/* Prominent, Oversized Selector Control */}
          <div className="w-full max-w-4xl px-2 sm:px-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isModalOpen}
              className="w-full py-4 sm:py-5 px-6 sm:px-8 rounded-2xl sm:rounded-full bg-white/85 hover:bg-white backdrop-blur-xl border border-black/10 hover:border-black/25 shadow-[0_12px_36px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_44px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
            >
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] text-left">
                Select Department
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/5 group-hover:bg-[#111827] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-y-0.5" />
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* 4. Minimal Clean Bottom Anchor */}
      <footer className="relative z-10 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between text-xs text-slate-400">
        <span>Awaaz-e-Awam • Department Portal</span>
        <span>Karachi Municipal Operational Workspace</span>
      </footer>

      {/* Full-Screen Selection Menu Modal Overlay */}
      <DepartmentSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectDepartment={handleDepartmentChosen}
      />
    </div>
  );
};
