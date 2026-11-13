import React, { type ReactNode } from 'react';
import { type DepartmentId } from '../../../types';
import { DEPARTMENT_THEMES } from './tokens';

interface DepartmentBackgroundProps {
  departmentId?: DepartmentId;
  children: ReactNode;
  showRoadGeometry?: boolean;
}

export const DepartmentBackground: React.FC<DepartmentBackgroundProps> = ({
  departmentId = 'kmc',
  children,
  showRoadGeometry = true,
}) => {
  const theme = DEPARTMENT_THEMES[departmentId] || DEPARTMENT_THEMES.kmc;
  const isRoads = departmentId === 'kmc';

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden bg-[#0A0D12] text-white selection:bg-[#D4AF37]/30 selection:text-white"
      style={{
        backgroundImage: `
          radial-gradient(circle at 85% 15%, ${theme.ambientGlowColor} 0%, transparent 45%),
          radial-gradient(circle at 15% 85%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          ${theme.backgroundGradient}
        `,
      }}
    >
      {/* Structural Architectural Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FFFFFF 1px, transparent 1px),
            linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />

      {/* Restrained Road Geometry Motif (Roads Department) */}
      {isRoads && showRoadGeometry && (
        <div
          className="pointer-events-none absolute inset-0 flex justify-center items-center overflow-hidden opacity-[0.04]"
          aria-hidden="true"
        >
          {/* Subtle architectural highway/road centerline motif */}
          <div className="w-[1200px] h-[1200px] border border-white/40 rounded-full absolute -top-48 -right-48" />
          <div className="w-[900px] h-[900px] border border-white/30 rounded-full absolute -top-12 -right-12" />
          <div className="w-[600px] h-[600px] border border-white/20 rounded-full absolute top-24 right-24" />
          {/* Subtle dashed highway lane dividers */}
          <div
            className="absolute left-[8%] inset-y-0 w-px border-l-2 border-dashed border-[#D4AF37]"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
            }}
          />
          <div
            className="absolute right-[8%] inset-y-0 w-px border-l-2 border-dashed border-[#D4AF37]"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
            }}
          />
        </div>
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
