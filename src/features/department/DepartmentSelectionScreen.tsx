import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type DepartmentId } from '../../types';
import { DepartmentSelectionModal } from './design-system/DepartmentSelectionModal';

interface DepartmentSelectionScreenProps {
  onSelectDepartment: (deptId: DepartmentId) => void;
  isOnline?: boolean;
}

export const DepartmentSelectionScreen: React.FC<DepartmentSelectionScreenProps> = ({
  onSelectDepartment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const navigate = useNavigate();

  const handleDepartmentChosen = (deptId: DepartmentId) => {
    setIsModalOpen(false);
    onSelectDepartment(deptId);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    navigate('/');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#151417] text-white flex flex-col justify-between select-none">
      {/* 1. Subtle Dark Ambient Underlay (Matching Reference 03 / Visual Preview) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* 2. Top Clean Minimal Brand Header */}
      <header className="relative z-10 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <span className="font-serif font-black text-2xl text-white">a.</span>
          <span className="font-bold text-base tracking-tight text-white">
            Awaaz-e-Awam
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
            Department Access
          </span>
        </div>
      </header>

      {/* 3. Center Context Trigger */}
      <main className="relative z-10 w-full px-6 sm:px-12 my-auto flex flex-col items-center justify-center text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-300 mb-4">
          Municipal Operations Gateway
        </h2>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all cursor-pointer shadow-lg hover:shadow-xl"
        >
          Choose department console
        </button>
      </main>

      {/* 4. Minimal Clean Footer */}
      <footer className="relative z-10 w-full px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between text-xs text-slate-500 border-t border-white/[0.08]">
        <span>Awaaz-e-Awam • Department Portal</span>
        <span>Karachi Municipal Operational Workspace</span>
      </footer>

      {/* 5. Approved Frosted-Glass Modal Popup Overlay */}
      <DepartmentSelectionModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSelectDepartment={handleDepartmentChosen}
      />
    </div>
  );
};
