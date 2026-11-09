import React from 'react';

interface SindhGeometricRuleProps {
  className?: string;
  variant?: 'light' | 'dark' | 'accent';
}

/**
 * Restrained architectural geometric rule inspired by authentic Sindh Ajrak craftsmanship.
 * Uses pure SVG vector mathematics with stepped cross-and-lozenge symmetry and fine engraved rules.
 * Strictly non-touristy, highly crisp on 4K displays.
 */
export const SindhGeometricRule: React.FC<SindhGeometricRuleProps> = ({
  className = '',
  variant = 'light'
}) => {
  const strokeColor =
    variant === 'dark'
      ? '#D5B995'
      : variant === 'accent'
      ? '#88413F'
      : '#263E59';

  const opacity = variant === 'dark' ? 0.45 : 0.28;

  return (
    <div
      className={`w-full flex items-center justify-center overflow-hidden pointer-events-none select-none my-3 ${className}`}
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D5B995]/40 to-[#D5B995]/60" />

      {/* Central Ajrak-inspired geometric medallion */}
      <svg
        width="88"
        height="18"
        viewBox="0 0 88 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 mx-3"
        style={{ color: strokeColor, opacity }}
      >
        {/* Left stepping motif */}
        <path d="M4 9 L12 9 M8 5 L8 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <rect x="18" y="5" width="8" height="8" transform="rotate(45 22 9)" stroke="currentColor" strokeWidth="1" />
        
        {/* Center 8-point floret medallion */}
        <circle cx="44" cy="9" r="6" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <path d="M44 4 L44 14 M39 9 L49 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="40.5" y="5.5" width="7" height="7" transform="rotate(45 44 9)" stroke="currentColor" strokeWidth="0.9" />

        {/* Right stepping motif */}
        <rect x="62" y="5" width="8" height="8" transform="rotate(45 66 9)" stroke="currentColor" strokeWidth="1" />
        <path d="M76 9 L84 9 M80 5 L80 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>

      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D5B995]/40 to-[#D5B995]/60" />
    </div>
  );
};

