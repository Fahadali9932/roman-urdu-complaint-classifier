import React from 'react';

interface FountainPenNibProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const FountainPenNib: React.FC<FountainPenNibProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <div
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_24px_40px_rgba(20,20,20,0.28)] filter"
      >
        <defs>
          {/* Main nib metallic body gradient: Polished platinum & steel with deep graphite contrast */}
          <linearGradient id="nib-metal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D8D6D2" />
            <stop offset="18%" stopColor="#FFFFFF" />
            <stop offset="42%" stopColor="#ECEAE6" />
            <stop offset="50%" stopColor="#B4B2AE" />
            <stop offset="58%" stopColor="#ECEAE6" />
            <stop offset="85%" stopColor="#F5F4F0" />
            <stop offset="100%" stopColor="#C4C1BC" />
          </linearGradient>

          {/* Left tine subtle reflection */}
          <linearGradient id="nib-left-reflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ECEAE6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#323232" stopOpacity="0.4" />
          </linearGradient>

          {/* Right tine shadow gradient */}
          <linearGradient id="nib-right-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ECEAE6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#141414" stopOpacity="0.6" />
          </linearGradient>

          {/* Blood maroon accent inlay for Awaaz-e-Awam brand harmony */}
          <linearGradient id="nib-maroon-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A232E" />
            <stop offset="50%" stopColor="#681822" />
            <stop offset="100%" stopColor="#450F16" />
          </linearGradient>

          {/* Grip section / feed dark graphite */}
          <linearGradient id="nib-feed-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1C1C1C" />
            <stop offset="30%" stopColor="#383838" />
            <stop offset="50%" stopColor="#4A4A4A" />
            <stop offset="70%" stopColor="#2A2A2A" />
            <stop offset="100%" stopColor="#141414" />
          </linearGradient>
        </defs>

        {/* --- 1. Pen Body Grip Section / Collar Base (Bottom) --- */}
        <path
          d="M65 490 L175 490 L170 430 L70 430 Z"
          fill="url(#nib-feed-gradient)"
          stroke="#141414"
          strokeWidth="1.5"
        />
        {/* Collar decorative rings */}
        <line x1="68" y1="445" x2="172" y2="445" stroke="#E5E3E0" strokeWidth="2" opacity="0.8" />
        <line x1="66" y1="465" x2="174" y2="465" stroke="#681822" strokeWidth="2.5" />
        <line x1="65" y1="480" x2="175" y2="480" stroke="#E5E3E0" strokeWidth="1" opacity="0.5" />

        {/* --- 2. Main Nib Silhouette (Solid Metallic Canvas) --- */}
        {/* Tip at (120, 30), expanding shoulders at (35, 270) & (205, 270), tapering to base (70, 430) & (170, 430) */}
        <path
          d="M120 30
             C112 55, 96 110, 78 180
             C65 230, 35 255, 35 280
             C35 320, 50 380, 70 430
             L170 430
             C190 380, 205 320, 205 280
             C205 255, 175 230, 162 180
             C144 110, 128 55, 120 30 Z"
          fill="url(#nib-metal-gradient)"
          stroke="#323232"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* --- 3. Beveled Metallic Rim Shading --- */}
        {/* Left bevel highlight */}
        <path
          d="M120 30
             C112 55, 96 110, 78 180
             C65 230, 35 255, 35 280
             C35 320, 50 380, 70 430
             L78 430
             C60 380, 46 320, 46 280
             C46 258, 73 234, 85 185
             C102 115, 116 60, 120 30 Z"
          fill="url(#nib-left-reflection)"
          opacity="0.9"
        />

        {/* Right bevel shadow */}
        <path
          d="M120 30
             C128 55, 144 110, 162 180
             C175 230, 205 255, 205 280
             C205 320, 190 380, 170 430
             L162 430
             C180 380, 194 320, 194 280
             C194 258, 167 234, 155 185
             C138 115, 124 60, 120 30 Z"
          fill="url(#nib-right-shadow)"
          opacity="0.8"
        />

        {/* --- 4. Brand Maroon Inlay Filigree Border --- */}
        <path
          d="M120 90
             C114 125, 100 165, 88 215
             C78 255, 56 275, 56 295
             C56 325, 68 375, 82 415
             L158 415
             C172 375, 184 325, 184 295
             C184 275, 162 255, 152 215
             C140 165, 126 125, 120 90 Z"
          stroke="url(#nib-maroon-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />

        {/* Fine inner hairline border */}
        <path
          d="M120 102
             C115 132, 103 168, 93 214
             C84 250, 64 270, 64 292
             C64 320, 74 365, 87 405
             L153 405
             C166 365, 176 320, 176 292
             C176 270, 156 250, 147 214
             C137 168, 125 132, 120 102 Z"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeDasharray="2 3"
          fill="none"
          opacity="0.75"
        />

        {/* --- 5. Engraved Civic Emblem / Classical Filigree --- */}
        {/* Classical decorative scrollwork curves inside the nib */}
        <path
          d="M85 305 C95 285, 110 290, 120 300 C130 290, 145 285, 155 305"
          stroke="#681822"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M92 320 C102 305, 112 310, 120 318 C128 310, 138 305, 148 320"
          stroke="#323232"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* "AWAAZ" minimal microscopic engraving on the nib body */}
        <text
          x="120"
          y="350"
          textAnchor="middle"
          fill="#141414"
          fontFamily="system-ui, sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="4"
          opacity="0.7"
        >
          AWAAZ
        </text>

        {/* Size marking "M" for Medium Nib */}
        <text
          x="120"
          y="380"
          textAnchor="middle"
          fill="#681822"
          fontFamily="serif"
          fontSize="14"
          fontWeight="bold"
          fontStyle="italic"
        >
          M
        </text>

        {/* Fine cross hatch engraving on base */}
        <line x1="88" y1="418" x2="152" y2="418" stroke="#323232" strokeWidth="1" opacity="0.6" />

        {/* --- 6. Breather Hole & Central Slit (The True Nib Soul) --- */}
        {/* Circular Breather Hole at (120, 200) */}
        <circle cx="120" cy="200" r="10" fill="#141414" stroke="#D8D6D2" strokeWidth="1.5" />
        <circle cx="120" cy="200" r="6" fill="#F7F6F3" opacity="0.15" />

        {/* Heart/Keyhole notch detail connecting to slit */}
        <path
          d="M117 192 C115 186, 120 183, 120 183 C120 183, 125 186, 123 192 Z"
          fill="#141414"
        />

        {/* Central Slit from Breather Hole (y=190) to Tip (y=30) */}
        <line
          x1="120"
          y1="190"
          x2="120"
          y2="30"
          stroke="#141414"
          strokeWidth="2"
          strokeLinecap="square"
        />

        {/* Slit inner depth highlight */}
        <line
          x1="121.2"
          y1="190"
          x2="121.2"
          y2="30"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          opacity="0.8"
        />

        {/* --- 7. Iridium Tip Weld & Polish (Point) --- */}
        <ellipse cx="120" cy="29" rx="3.5" ry="4" fill="#EAE8E4" stroke="#141414" strokeWidth="1" />
        {/* Tip specular spark reflection */}
        <circle cx="119" cy="27" r="1" fill="#FFFFFF" />
      </svg>
    </div>
  );
};
