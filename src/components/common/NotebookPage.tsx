import React from 'react';

interface NotebookPageProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  showMargin?: boolean;
}

export const NotebookPage: React.FC<NotebookPageProps> = ({
  children,
  className = '',
  maxWidth = 'max-w-4xl',
  showMargin = true,
}) => {
  return (
    <div className={`relative mx-auto w-full ${maxWidth} transition-all ${className}`}>
      {/* 1. Realistic Torn Spiral-Notebook Top Edge */}
      <div className="w-full h-11 sm:h-12 overflow-hidden select-none block" aria-hidden="true">
        <svg
          className="w-full h-full block"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* 64px dual-pitch organic spiral tear pattern (never stretches or distorts) */}
            <pattern
              id="spiral-tear-pattern"
              width="64"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              {/* Crisp white paper shape with natural torn top edge and punched spiral wire slits */}
              <path
                d="
                  M 0,16.5 
                  L 2,15 L 4.5,17 L 8,14.5 L 11.5,16.2 
                  L 13.5,21.5 
                  A 4.5,4.5 0 1 0 18.5,21.5 
                  L 19.8,15.8 
                  L 23.5,14 L 27,16.8 L 30.5,14.2 L 34,16
                  L 37,14.5 L 40.5,17 L 43.5,15.2
                  L 45.5,21.8
                  A 4.5,4.5 0 1 0 50.5,21.8
                  L 51.8,16.2
                  L 55,14 L 58.5,16.5 L 61.5,14.5 L 64,16.5
                  L 64,48 L 0,48 Z"
                fill="#FFFFFF"
              />

              {/* Punched circular hole rims showing background cut-through with subtle tactile depth */}
              <circle
                cx="16"
                cy="25"
                r="4.5"
                fill="none"
                stroke="rgba(0,0,0,0.14)"
                strokeWidth="0.8"
              />
              <circle
                cx="48"
                cy="25"
                r="4.5"
                fill="none"
                stroke="rgba(0,0,0,0.14)"
                strokeWidth="0.8"
              />
              {/* Paper fiber highlights on torn top */}
              <path
                d="M 0,16.5 L 12,16.5 M 20,16 L 44,16.5 M 52,16 L 64,16.5"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#spiral-tear-pattern)" />
        </svg>
      </div>

      {/* 2. Main White Notebook Page Body */}
      <div className="relative bg-white text-[#182224] rounded-b-xs shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65),0_0_1px_rgba(255,255,255,0.08)] border-b border-[#ECECEC] overflow-hidden">
        {/* Fine Pale-Blue Horizontal Writing Lines */}
        <div className="absolute inset-0 pointer-events-none notebook-ruled-lines" />

        {/* Thin Muted-Red Vertical Margin Line (Logical placement for LTR & RTL) */}
        {showMargin && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#E26D6D]/80 pointer-events-none z-10 notebook-margin-line"
            aria-hidden="true"
          />
        )}

        {/* Content positioned naturally within the writing margin */}
        <div className="relative z-10 ps-14 sm:ps-26 pe-5 sm:pe-12 py-8 sm:py-12">
          {children}
        </div>
      </div>
    </div>
  );
};

