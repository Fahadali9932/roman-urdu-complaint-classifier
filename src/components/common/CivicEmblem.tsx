import React from 'react';

interface CivicEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Original Civic Emblem for "Roman Urdu Complaint Classifier (Awaaz-e-Awam)".
 * Combines an open speech bubble, a civic shield, and balance nodes representing justice & communication.
 * Styled in the Sindh Civic Editorial palette (Civic Ink, Ajrak Indigo, Sandstone).
 * Does NOT copy or imitate official government seals.
 */
export const CivicEmblem: React.FC<CivicEmblemProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#101A28] via-[#263E59] to-[#1A0B0E] text-white shadow-sm ring-1 ring-[#D5B995]/30 ${sizeMap[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3/5 h-3/5 text-[#D5B995]"
      >
        {/* Civic Shield Outer */}
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        {/* Inner Voice / Speech wave symbol */}
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
        <path d="M9 14c1.2 1 4.8 1 6 0" />
      </svg>
    </div>
  );
};
