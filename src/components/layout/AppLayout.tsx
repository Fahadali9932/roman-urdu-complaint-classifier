import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3] text-[#141414] w-full overflow-x-clip selection:bg-[#681822] selection:text-[#FFFFFF]">
      <PublicHeader />
      <main className={`flex-1 w-full overflow-x-clip ${isHome ? '' : 'pt-24 sm:pt-28 pb-32 sm:pb-36'}`}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
