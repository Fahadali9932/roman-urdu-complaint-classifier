import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { PenTool, Compass } from 'lucide-react';

export const RegistrationArtwork: React.FC = () => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-[22px] overflow-hidden bg-gradient-to-br from-[#300A0F] via-[#4A1017] to-[#1A0507] flex flex-col justify-end p-6 sm:p-7 select-none">
      {/* Background Layer: Atmospheric Organic Curves & Ambient Glows */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        viewBox="0 0 600 700"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="glowTopRight" cx="80%" cy="15%" r="60%">
            <stop offset="0%" stopColor="#8A232F" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#5E141C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2A070A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="glowCenter" cx="40%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#681822" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#3F0C12" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1E0507" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8E2A36" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#681822" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3D0B10" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B33E4D" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#681822" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1A0406" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FAF6F0" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#FFCCD2" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#681822" stopOpacity="0" />
          </linearGradient>

          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="35" />
          </filter>
        </defs>

        {/* Deep ambient illumination fields */}
        <rect width="600" height="700" fill="url(#glowTopRight)" />
        <circle cx="280" cy="320" r="260" fill="url(#glowCenter)" filter="url(#softBlur)" />

        {/* Organic Layer 1: Background broad swelling contour */}
        <path
          d="M-50,180 C120,80 340,110 520,240 C620,310 680,440 650,600 L650,750 L-50,750 Z"
          fill="url(#waveGrad1)"
          opacity="0.8"
        />

        {/* Organic Layer 2: Intersecting fluid contour with soft highlight edge */}
        <path
          d="M-40,320 C140,240 320,290 460,420 C540,500 580,620 540,750 L-40,750 Z"
          fill="url(#waveGrad2)"
          opacity="0.9"
        />

        {/* Organic Layer 3: Sweeping foreground crest */}
        <path
          d="M-60,450 C80,380 240,400 380,510 C460,570 510,660 520,750 L-60,750 Z"
          fill="#2A070B"
          opacity="0.75"
        />

        {/* Luminous crest highlights following bezier curves */}
        <path
          d="M-50,180 C120,80 340,110 520,240 C620,310 680,440 650,600"
          stroke="url(#highlightGrad)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.65"
        />
        <path
          d="M-40,320 C140,240 320,290 460,420 C540,500 580,620 540,750"
          stroke="url(#highlightGrad)"
          strokeWidth="1"
          fill="none"
          opacity="0.45"
        />

        {/* Subtle atmospheric vignette */}
        <rect width="600" height="700" fill="#000000" opacity="0.15" />
      </svg>

      {/* Subtle brand tag in upper-corner */}
      <div className="absolute top-5 start-6 z-10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E89BA4] animate-pulse" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-white/70 font-semibold">
          Awaaz-e-Awam • Civic Network
        </span>
      </div>

      {/* Lower Information Overlay (Frosted Surface from Reference 2/1) */}
      <div className="relative z-10 w-full rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-5 sm:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] text-start space-y-3">
        {/* Two Topic Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/10 text-white text-[11px] font-medium font-ui">
            <PenTool className="w-3 h-3 text-[#FFCCD2]" />
            <span>{t('authChipWrite') || (isRTL ? 'شکایت درج کریں' : 'Write a complaint')}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/10 text-white text-[11px] font-medium font-ui">
            <Compass className="w-3 h-3 text-[#FFCCD2]" />
            <span>{t('authChipTrack') || (isRTL ? 'پیش رفت دیکھیں' : 'Track progress')}</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1 pt-0.5">
          <h2 className="font-display font-bold text-base sm:text-lg text-white tracking-tight leading-snug">
            {t('authArtworkHeading') ||
              (isRTL
                ? 'عوامی مسائل کی شکایت کا آسان اور شفاف طریقہ۔'
                : 'A simpler way to report public-service issues.')}
          </h2>
          <p className="text-xs text-white/85 font-ui leading-relaxed">
            {t('authArtworkSubtitle') ||
              (isRTL
                ? 'اپنی شکایت عام فہم زبان میں لکھیں اور ایک ہی جگہ اس کی پیش رفت دیکھیں۔'
                : 'Write your complaint in everyday language and follow its progress in one place.')}
          </p>
        </div>
      </div>
    </div>
  );
};
