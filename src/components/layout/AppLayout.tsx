import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isInfoPage = ['/about', '/contact', '/privacy-policy', '/terms-of-use', '/privacy', '/terms'].includes(
    location.pathname
  );

  return (
    <div
      className={`min-h-screen flex flex-col w-full selection:bg-[#681822] selection:text-[#FFFFFF] ${
        isHome
          ? 'bg-[#F7F6F3] text-[#141414] overflow-visible'
          : isInfoPage
            ? 'bg-[#141414] text-[#F7F6F3] overflow-x-clip'
            : 'bg-[#F7F6F3] text-[#141414] overflow-x-clip'
      }`}
    >
      <PublicHeader />
      <main
        className={`flex-1 w-full ${
          isHome
            ? 'overflow-visible'
            : isInfoPage
              ? 'p-0 m-0 overflow-x-clip'
              : 'overflow-x-clip pt-24 sm:pt-28 pb-32 sm:pb-36'
        }`}
      >
        <Outlet />
      </main>
      {!isHome && !isInfoPage && <PublicFooter />}
    </div>
  );
};
