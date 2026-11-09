import React from 'react';

interface CivicEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Civic Emblem for Awaaz-e-Awam (Monochrome Civic Editorial).
 * Combines an open speech node and a civic shield.
 */
export const CivicEmblem: React.FC<CivicEmblemProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-[#141414] text-white shadow-sm ring-1 ring-[#E5E3E0] ${sizeMap[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3/5 h-3/5 text-[#FFFFFF]"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
        <path d="M9 14c1.2 1 4.8 1 6 0" stroke="#681822" strokeWidth="2" />
      </svg>
    </div>
  );
};
