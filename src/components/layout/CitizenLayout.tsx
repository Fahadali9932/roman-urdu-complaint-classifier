import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CitizenHeader } from './CitizenHeader';
import { CitizenSidebar } from './CitizenSidebar';
import { PublicFooter } from './PublicFooter';

export const CitizenLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <CitizenHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex w-full">
        <CitizenSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <PublicFooter />
    </div>
  );
};
