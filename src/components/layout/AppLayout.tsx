import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#E9EBED] text-[#0B1421] w-full overflow-x-hidden selection:bg-[#DEE1E5] selection:text-[#0B1421]">
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
