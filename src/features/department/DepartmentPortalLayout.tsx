import React from 'react';
import { Outlet } from 'react-router-dom';

export const DepartmentPortalLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#141414] w-full">
      <Outlet />
    </div>
  );
};
