import React, { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  accentBorderColor?: string;
  glowColor?: string;
  withSpecularHighlight?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  accentBorderColor,
  glowColor,
  withSpecularHighlight = true,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] bg-[#121820]/80 backdrop-blur-2xl border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)] ${
        withSpecularHighlight ? 'border-t-white/20' : ''
      } ${className}`}
      style={{
        boxShadow: glowColor
          ? `0 24px 64px -12px rgba(0,0,0,0.65), 0 0 40px -10px ${glowColor}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)`
          : '0 24px 64px -12px rgba(0,0,0,0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        borderColor: accentBorderColor ? `${accentBorderColor}33` : undefined,
      }}
    >
      {/* Specular sheen gradient along top edge */}
      {withSpecularHighlight && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};
