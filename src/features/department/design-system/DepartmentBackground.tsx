import React, { type ReactNode } from 'react';
import { type DepartmentId } from '../../../types';
import { DEPARTMENT_THEMES } from './tokens';

interface DepartmentBackgroundProps {
  departmentId?: DepartmentId;
  children: ReactNode;
}

export const DepartmentBackground: React.FC<DepartmentBackgroundProps> = ({
  departmentId = 'kmc',
  children,
}) => {
  const theme = DEPARTMENT_THEMES[departmentId] || DEPARTMENT_THEMES.kmc;

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#FAF8F5] text-[#111827] selection:bg-[#111827] selection:text-white"
      style={{
        backgroundImage: `
          radial-gradient(circle at 90% 10%, ${theme.ambientGlowColor} 0%, transparent 40%),
          radial-gradient(circle at 10% 90%, rgba(0, 0, 0, 0.02) 0%, transparent 50%),
          ${theme.backgroundGradient}
        `,
      }}
    >
      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
