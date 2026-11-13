import React from 'react';

interface SculpturalCompositionProps {
  className?: string;
}

/**
 * SculpturalComposition
 * High-fidelity representation of Figma frames 35:1289 - 35:1294:
 * - Sculpture / suspended plinth (500x242)
 * - Sculpture / bronze rear volume (330x356)
 * - Sculpture / deep jade volume (352x356)
 * - Sculpture / porcelain face (304x304)
 *   - Sculpture / recessed center (180x180)
 *     - Civic monogram "a."
 */
export const SculpturalComposition: React.FC<SculpturalCompositionProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`relative w-full max-w-[540px] aspect-[540/400] mx-auto select-none pointer-events-none ${className}`}
      aria-label="Awaaz-e-Awam civic sculptural emblem"
      role="img"
    >
      <svg
        viewBox="0 0 540 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
      >
        <defs>
          {/* Suspended Plinth Gradients */}
          <linearGradient id="plinth-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E2E31" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#142326" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0B1618" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="plinth-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2A484E" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0B1618" stopOpacity="0" />
          </radialGradient>

          {/* Bronze Rear Volume Gradients */}
          <linearGradient id="bronze-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B38953" />
            <stop offset="25%" stopColor="#8C6841" />
            <stop offset="65%" stopColor="#634526" />
            <stop offset="100%" stopColor="#4A3219" />
          </linearGradient>
          <linearGradient id="bronze-rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2BE87" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3E2A15" stopOpacity="0.4" />
          </linearGradient>

          {/* Deep Jade Volume Gradients */}
          <linearGradient id="jade-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1C5E53" />
            <stop offset="35%" stopColor="#13473E" />
            <stop offset="70%" stopColor="#0E332D" />
            <stop offset="100%" stopColor="#081E1A" />
          </linearGradient>
          <linearGradient id="jade-rim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2D8576" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#081E1A" stopOpacity="0.3" />
          </linearGradient>

          {/* Porcelain Face Gradients */}
          <linearGradient id="porcelain-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FAF8F5" />
            <stop offset="85%" stopColor="#EDE8E1" />
            <stop offset="100%" stopColor="#DDD7CD" />
          </linearGradient>
          <linearGradient id="porcelain-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#B8B0A2" stopOpacity="0.5" />
          </linearGradient>

          {/* Recessed Center Inner Shading */}
          <radialGradient id="recess-depth" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#E7E2D8" />
            <stop offset="70%" stopColor="#D9D3C7" />
            <stop offset="100%" stopColor="#C4BCAD" />
          </radialGradient>

          {/* Drop Shadows */}
          <filter id="sculpture-shadow-lg" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.4" />
          </filter>
          <filter id="sculpture-shadow-md" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="-6" dy="12" stdDeviation="14" floodColor="#000000" floodOpacity="0.3" />
          </filter>
          <filter id="recess-inner-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="2" dy="5" />
            <feGaussianBlur stdDeviation="4" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="#0F1E21" floodOpacity="0.28" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* --- 1. SUSPENDED PLINTH (Base / Pedestal: 500x242 at x=90, y=458) --- */}
        <ellipse cx="270" cy="330" rx="230" ry="60" fill="url(#plinth-glow)" />
        <rect
          x="40"
          y="260"
          width="460"
          height="95"
          rx="24"
          fill="url(#plinth-gradient)"
          stroke="#2C4A52"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          filter="url(#sculpture-shadow-lg)"
        />
        {/* Subtle plinth upper facet reflection */}
        <path
          d="M 64 261 Q 270 274 476 261"
          stroke="#5B8791"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />

        {/* --- 2. BRONZE REAR VOLUME (330x356 at x=185, y=324) --- */}
        <rect
          x="195"
          y="50"
          width="265"
          height="270"
          rx="32"
          fill="url(#bronze-body)"
          stroke="url(#bronze-rim)"
          strokeWidth="1.5"
          filter="url(#sculpture-shadow-md)"
        />
        {/* Bronze volume specular sheen */}
        <path
          d="M 215 70 Q 320 85 435 68"
          stroke="#FFE1B3"
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />

        {/* --- 3. DEEP JADE VOLUME (352x356 at x=106, y=352) --- */}
        <rect
          x="115"
          y="75"
          width="260"
          height="260"
          rx="32"
          fill="url(#jade-body)"
          stroke="url(#jade-rim)"
          strokeWidth="1.5"
          filter="url(#sculpture-shadow-md)"
        />
        {/* Jade volume diagonal luster */}
        <path
          d="M 135 95 Q 240 108 350 92"
          stroke="#5DE3CA"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* --- 4. PORCELAIN FACE (304x304 at x=116, y=335) --- */}
        <rect
          x="140"
          y="60"
          width="235"
          height="235"
          rx="32"
          fill="url(#porcelain-body)"
          stroke="url(#porcelain-rim)"
          strokeWidth="1.8"
          filter="url(#sculpture-shadow-lg)"
        />
        {/* Porcelain crisp top edge light */}
        <path
          d="M 160 62 L 355 62"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* --- 5. RECESSED CENTER (180x180 at x=62, y=62 inside porcelain face) --- */}
        <rect
          x="188"
          y="108"
          width="139"
          height="139"
          rx="24"
          fill="url(#recess-depth)"
          stroke="#C8C0B2"
          strokeWidth="1"
          filter="url(#recess-inner-shadow)"
        />

        {/* --- 6. CIVIC MONOGRAM "a." (x=46, y=27 inside recess) --- */}
        <text
          x="257"
          y="200"
          textAnchor="middle"
          fill="#0F1E21"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '84px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          a.
        </text>
      </svg>
    </div>
  );
};
