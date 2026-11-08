import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const CitizenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1421] text-[#F1F2F3] w-full overflow-x-hidden selection:bg-[#283041] selection:text-[#F1F2F3]">
      <PublicHeader />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
