import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col text-[#172D31] w-full overflow-x-hidden">
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};
