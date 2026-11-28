import React from 'react';
import { AwaazLogo } from './AwaazLogo';

interface CivicEmblemProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Official Civic Emblem for Awaaz-e-Awam.
 * Renders the approved deep maroon (#761D30) rounded square with white Urdu letter آ.
 */
export const CivicEmblem: React.FC<CivicEmblemProps> = ({ className = '', size = 'md' }) => {
  const pixelMap = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <AwaazLogo size={pixelMap[size]} />
    </div>
  );
};
