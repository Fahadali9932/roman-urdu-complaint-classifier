import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const CitizenLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3] text-[#141414] w-full overflow-x-hidden selection:bg-[#681822] selection:text-[#FFFFFF]">
      <PublicHeader />
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 pt-24 sm:pt-28 pb-32 sm:pb-36">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
