import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#F0EDE7] text-[#101A28] w-full overflow-x-clip selection:bg-[#D5B995]/30 selection:text-[#101A28]">
      <PublicHeader />
      <main className={`flex-1 w-full overflow-x-clip ${isHome ? '' : 'pt-28 sm:pt-32'}`}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
