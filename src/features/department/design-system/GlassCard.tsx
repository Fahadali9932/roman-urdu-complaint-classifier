import React, { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accentBorderColor?: string;
  glowColor?: string;
  withSpecularHighlight?: boolean;
  variant?: 'light' | 'dark';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  accentBorderColor,
  glowColor,
  withSpecularHighlight = true,
  variant = 'light',
}) => {
  const isLight = variant === 'light';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl backdrop-blur-2xl transition-all duration-300 ${
        isLight
          ? 'bg-white/80 border border-black/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.06),_0_1px_3px_rgba(0,0,0,0.05)]'
          : 'bg-[#121820]/80 border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)]'
      } ${withSpecularHighlight ? (isLight ? 'border-t-white' : 'border-t-white/20') : ''} ${className}`}
      style={{
        boxShadow: isLight
          ? glowColor
            ? `0 20px 50px rgba(0,0,0,0.06), 0 0 35px -5px ${glowColor}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)`
            : '0 20px 50px rgba(0,0,0,0.06), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)'
          : glowColor
          ? `0 24px 64px -12px rgba(0,0,0,0.65), 0 0 40px -10px ${glowColor}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)`
          : '0 24px 64px -12px rgba(0,0,0,0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        borderColor: accentBorderColor ? `${accentBorderColor}33` : undefined,
      }}
    >
      {/* Specular sheen gradient along top edge */}
      {withSpecularHighlight && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
            isLight ? 'via-white to-transparent' : 'via-white/25 to-transparent'
          }`}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};
