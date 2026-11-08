import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#E9EBED] text-[#0B1421] w-full overflow-x-hidden selection:bg-[#DEE1E5] selection:text-[#0B1421]">
      <PublicHeader />
      <main className={`flex-1 w-full overflow-x-hidden ${isHome ? '' : 'pt-28 sm:pt-32'}`}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
