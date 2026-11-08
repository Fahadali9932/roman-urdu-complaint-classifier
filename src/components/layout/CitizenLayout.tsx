import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const CitizenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#E9EBED] text-[#0B1421] w-full overflow-x-hidden selection:bg-[#DEE1E5] selection:text-[#0B1421]">
      <PublicHeader />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-8 sm:pb-12">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
