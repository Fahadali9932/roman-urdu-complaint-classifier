import React from 'react';
import { type DepartmentId } from '../../../types';

interface DepartmentArtworkProps {
  departmentId?: DepartmentId;
  className?: string;
}

/**
 * Sweeping Vibrant Lime Ribbon for Department Selection
 * Exactly referencing Reference 03 (03_APPROVED_DEPARTMENT_SELECTION.png)
 */
export const LimeRibbonArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="limeRibbonGrad" x1="1200" y1="0" x2="200" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#84CC16" />
            <stop offset="45%" stopColor="#8CE800" />
            <stop offset="80%" stopColor="#A3E635" />
            <stop offset="100%" stopColor="#65A30D" />
          </linearGradient>
          <filter id="ribbonShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#4D7C0F" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Sweeping Lime S-Curved Ribbon */}
        <path
          d="M 1250 -60
             C 1420 180, 1260 410, 960 480
             C 680 540, 380 500, 180 620
             C 20 720, -60 840, -120 960
             L -60 980
             C 40 850, 140 760, 280 660
             C 480 560, 780 580, 1080 520
             C 1380 440, 1540 180, 1380 -60
             Z"
          fill="url(#limeRibbonGrad)"
          filter="url(#ribbonShadow)"
        />

        {/* Subtle highlight sheen along ribbon spine */}
        <path
          d="M 1320 -60
             C 1450 170, 1310 420, 1020 500
             C 730 560, 430 530, 230 640
             C 50 740, -10 850, -90 970"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};

/**
 * Flowing 3D Sculptural Charcoal Asphalt Highway
 * Exactly referencing Reference 02 (02_APPROVED_ROADS_LAYOUT.png)
 */
export const RoadsHighwayArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <defs>
          {/* Main Asphalt Road Surface Gradient */}
          <linearGradient id="asphaltSurface" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#252A32" />
            <stop offset="40%" stopColor="#1E2228" />
            <stop offset="75%" stopColor="#181B21" />
            <stop offset="100%" stopColor="#12151A" />
          </linearGradient>

          {/* 3D Road Curb / Elevation Bevel */}
          <linearGradient id="asphaltCurb" x1="1200" y1="50" x2="0" y2="900" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#101317" />
            <stop offset="50%" stopColor="#0D0F12" />
            <stop offset="100%" stopColor="#080A0D" />
          </linearGradient>

          {/* Golden Yellow Road Marking Stripe */}
          <linearGradient id="yellowStripe" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>

          {/* Ground Contact Shadow */}
          <filter id="roadGroundShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#000000" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* 1. 3D Road Thickness / Elevation Curb (Extruded bottom edge for physical depth) */}
        <path
          d="M 1250 -40
             C 1420 180, 1260 410, 960 480
             C 680 550, 360 520, 160 670
             C 20 780, -40 880, -120 980
             L -120 1025
             C -30 920, 30 820, 180 705
             C 385 555, 705 585, 985 515
             C 1285 445, 1450 215, 1280 -10
             Z"
          fill="url(#asphaltCurb)"
          filter="url(#roadGroundShadow)"
        />

        {/* 2. Main Asphalt Highway Driving Surface */}
        <path
          d="M 1250 -40
             C 1420 180, 1260 410, 960 480
             C 680 550, 360 520, 160 670
             C 20 780, -40 880, -120 980
             L -40 980
             C 40 870, 100 770, 240 660
             C 440 510, 760 540, 1040 470
             C 1340 400, 1500 170, 1330 -40
             Z"
          fill="url(#asphaltSurface)"
        />

        {/* 3. Subtle Asphalt Texture / Specular Edge on Inner Curb */}
        <path
          d="M 1250 -40
             C 1420 180, 1260 410, 960 480
             C 680 550, 360 520, 160 670
             C 20 780, -40 880, -120 980"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Continuous Golden-Yellow Centerline Road Marking */}
        <path
          d="M 1290 -40
             C 1455 175, 1295 405, 1000 475
             C 720 545, 400 515, 200 665
             C 60 775, 0 875, -80 980"
          stroke="url(#yellowStripe)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Inner glow on the yellow line */}
        <path
          d="M 1290 -40
             C 1455 175, 1295 405, 1000 475
             C 720 545, 400 515, 200 665
             C 60 775, 0 875, -80 980"
          stroke="#FEF08A"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};

/**
 * Electricity & Power (KE) Artwork
 * Sculptural deep navy high-voltage transmission conduit with glowing electric blue current core
 */
export const ElectricityConduitArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="elecConduit" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="40%" stopColor="#172554" />
            <stop offset="80%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>
          <linearGradient id="elecCore" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <filter id="elecShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 3D Conduit Depth Bevel */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -120 1020 C -30 920, 30 820, 180 700 C 385 550, 705 580, 985 510 C 1285 440, 1450 210, 1280 -10 Z"
          fill="#0B132B"
          filter="url(#elecShadow)"
        />

        {/* Conduit Body */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -40 980 C 40 870, 100 770, 240 660 C 440 510, 760 540, 1040 470 C 1340 400, 1500 170, 1330 -40 Z"
          fill="url(#elecConduit)"
        />

        {/* Core Electric Transmission Arterial Current */}
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="url(#elecCore)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="#E0F2FE"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * Water & Sewerage (KWSC) Artwork
 * Architectural deep marine aqueduct channel with vibrant cyan fluid arterial band
 */
export const WaterAqueductArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="waterChannel" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#075985" />
            <stop offset="40%" stopColor="#0369A1" />
            <stop offset="80%" stopColor="#0C4A6E" />
            <stop offset="100%" stopColor="#082F49" />
          </linearGradient>
          <linearGradient id="waterFlow" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>
          <filter id="waterShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#0C4A6E" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 3D Aqueduct Wall Depth */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -120 1020 C -30 920, 30 820, 180 700 C 385 550, 705 580, 985 510 C 1285 440, 1450 210, 1280 -10 Z"
          fill="#082F49"
          filter="url(#waterShadow)"
        />

        {/* Aqueduct Channel Surface */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -40 980 C 40 870, 100 770, 240 660 C 440 510, 760 540, 1040 470 C 1340 400, 1500 170, 1330 -40 Z"
          fill="url(#waterChannel)"
        />

        {/* Pure Fluid Flow Line */}
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="url(#waterFlow)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="#F0F9FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * Gas Utility (SSGC) Artwork
 * Refined industrial burnished copper pipeline curve with cylindrical metallic highlights
 */
export const GasPipelineArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="gasPipeBody" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9A3412" />
            <stop offset="40%" stopColor="#7C2D12" />
            <stop offset="80%" stopColor="#451A03" />
            <stop offset="100%" stopColor="#2E1002" />
          </linearGradient>
          <linearGradient id="gasGoldCore" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="50%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#FED7AA" />
          </linearGradient>
          <filter id="gasShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#451A03" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 3D Pipe Thickness Bevel */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -120 1020 C -30 920, 30 820, 180 700 C 385 550, 705 580, 985 510 C 1285 440, 1450 210, 1280 -10 Z"
          fill="#2E1002"
          filter="url(#gasShadow)"
        />

        {/* Copper Pipe Body */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -40 980 C 40 870, 100 770, 240 660 C 440 510, 760 540, 1040 470 C 1340 400, 1500 170, 1330 -40 Z"
          fill="url(#gasPipeBody)"
        />

        {/* Metallic Copper Sheen Stripe */}
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="url(#gasGoldCore)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="#FFEDD5"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * Sanitation & Waste (SSWMB) Artwork
 * Continuous forest green municipal collection arterial route band with vibrant emerald stripe
 */
export const SanitationRouteArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="sanitRoute" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14532D" />
            <stop offset="40%" stopColor="#166534" />
            <stop offset="80%" stopColor="#052E16" />
            <stop offset="100%" stopColor="#021C0D" />
          </linearGradient>
          <linearGradient id="sanitCore" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#86EFAC" />
          </linearGradient>
          <filter id="sanitShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#052E16" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 3D Route Curb Bevel */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -120 1020 C -30 920, 30 820, 180 700 C 385 550, 705 580, 985 510 C 1285 440, 1450 210, 1280 -10 Z"
          fill="#021C0D"
          filter="url(#sanitShadow)"
        />

        {/* Route Surface */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -40 980 C 40 870, 100 770, 240 660 C 440 510, 760 540, 1040 470 C 1340 400, 1500 170, 1330 -40 Z"
          fill="url(#sanitRoute)"
        />

        {/* Emerald Civic Arterial Stripe */}
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="url(#sanitCore)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="#F0FDF4"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * Building Control (SBCA) Artwork
 * Architectural slate structural elevation curve with structural flange depth
 */
export const BuildingStructuralArtwork: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <linearGradient id="beamSurface" x1="1300" y1="0" x2="100" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="80%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="beamFlange" x1="1300" y1="0" x2="50" y2="850" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="beamShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-8" dy="24" stdDeviation="30" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 3D Flange Depth */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -120 1020 C -30 920, 30 820, 180 700 C 385 550, 705 580, 985 510 C 1285 440, 1450 210, 1280 -10 Z"
          fill="#0F172A"
          filter="url(#beamShadow)"
        />

        {/* Structural Beam Web */}
        <path
          d="M 1250 -40 C 1420 180, 1260 410, 960 480 C 680 550, 360 520, 160 670 C 20 780, -40 880, -120 980 L -40 980 C 40 870, 100 770, 240 660 C 440 510, 760 540, 1040 470 C 1340 400, 1500 170, 1330 -40 Z"
          fill="url(#beamSurface)"
        />

        {/* Precision Flange Line */}
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="url(#beamFlange)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 1290 -40 C 1455 175, 1295 405, 1000 475 C 720 545, 400 515, 200 665 C 60 775, 0 875, -80 980"
          stroke="#F8FAFC"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

/**
 * Universal Department Artwork Switcher
 */
export const DepartmentArtwork: React.FC<DepartmentArtworkProps> = ({
  departmentId = 'kmc',
  className = '',
}) => {
  switch (departmentId) {
    case 'kmc':
      return <RoadsHighwayArtwork className={className} />;
    case 'kelectric':
      return <ElectricityConduitArtwork className={className} />;
    case 'kwsc':
      return <WaterAqueductArtwork className={className} />;
    case 'ssgc':
      return <GasPipelineArtwork className={className} />;
    case 'sswmb':
      return <SanitationRouteArtwork className={className} />;
    case 'sbca':
      return <BuildingStructuralArtwork className={className} />;
    default:
      return <RoadsHighwayArtwork className={className} />;
  }
};
