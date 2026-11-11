import React, { useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Check } from 'lucide-react';

export interface PenProgressBarProps {
  progress: number; // 0 to 100
  currentStage: 1 | 2 | 3;
  onSelectStage?: (stage: 1 | 2 | 3) => void;
  stage1Ready?: boolean;
  stage2Ready?: boolean;
  stage3Ready?: boolean;
}

export const PenProgressBar: React.FC<PenProgressBarProps> = ({
  progress,
  currentStage,
  onSelectStage,
  stage1Ready = false,
  stage2Ready = false,
  stage3Ready = false,
}) => {
  const { isRTL, language } = useLanguage();
  const ur = language === 'ur';

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isComplete = clampedProgress === 100;

  // Stages metadata
  const stages = useMemo(
    () => [
      { id: 1 as const, label: ur ? 'تفصیلات' : 'Details', percent: 33, ready: stage1Ready },
      { id: 2 as const, label: ur ? 'مقام' : 'Location', percent: 66, ready: stage2Ready },
      { id: 3 as const, label: ur ? 'شکایت' : 'Complaint', percent: 100, ready: stage3Ready },
    ],
    [ur, stage1Ready, stage2Ready, stage3Ready]
  );

  return (
    <div
      className="w-full relative py-4 sm:py-5 select-none"
      role="progressbar"
      aria-label={ur ? 'شکایت فارم کی پیش رفت' : 'Complaint progress'}
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={ur ? `${clampedProgress} فیصد مکمل` : `${clampedProgress}% completed`}
    >
      {/* Track Container */}
      <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-8">
        {/* Distance / Progress Endpoints (Reference 1 Inspiration) */}
        <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-3 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span>{ur ? 'آغاز' : 'Start'}</span>
          </span>
          <span className="text-white/40 text-[10px] tracking-wider uppercase">
            {ur ? 'قلمی پیش رفت' : 'Ink Trajectory'}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-white/80">
            <span>{isComplete ? (ur ? 'مکمل' : 'Ready') : '100%'}</span>
            <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-[#FFCCD2] shadow-[0_0_8px_#FFCCD2]' : 'bg-white/40'}`} />
          </span>
        </div>

        {/* Main Horizontal Track */}
        <div className="relative h-2 w-full bg-white/10 rounded-full backdrop-blur-md overflow-visible border border-white/10">
          {/* Active Ink Trail Fill */}
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#681822] via-[#8A232E] to-[#E89BA4] shadow-[0_0_12px_rgba(232,155,164,0.4)]"
            style={{
              [isRTL ? 'right' : 'left']: 0,
              width: `${clampedProgress}%`,
            }}
          />

          {/* Milestone Checkpoints along track */}
          {stages.map((st) => {
            const isPassed = clampedProgress >= st.percent || st.ready;
            const isCurrent = currentStage === st.id;

            return (
              <button
                type="button"
                key={st.id}
                onClick={() => onSelectStage && onSelectStage(st.id)}
                disabled={!onSelectStage || (!isPassed && currentStage < st.id)}
                title={st.label}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  isPassed
                    ? 'bg-[#681822] text-white border-2 border-white ring-2 ring-[#681822]/50'
                    : isCurrent
                      ? 'bg-white text-[#141414] border-2 border-[#681822] ring-2 ring-white/50'
                      : 'bg-[#222] border-2 border-white/30 text-white/40'
                }`}
                style={{
                  [isRTL ? 'right' : 'left']: `${st.percent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {st.ready ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
            );
          })}

          {/* MOVING FOUNTAIN PEN NIB & TOOLTIP BUBBLE (Signature Feature) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 ease-out"
            style={{
              [isRTL ? 'right' : 'left']: `${clampedProgress}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* The Custom Pen Illustration */}
            <div
              className={`relative -top-4 transition-transform duration-300 ${
                isComplete ? 'scale-115 animate-pulse' : 'scale-100'
              } ${isRTL ? '-scale-x-100 -rotate-12' : 'rotate-12'}`}
            >
              <svg
                viewBox="0 0 28 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-9 overflow-visible filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
              >
                {/* Metallic Nib Blade */}
                <path
                  d="M14 2 L23 16 L20 28 L14 38 L8 28 L5 16 Z"
                  fill="url(#pen-grad-body)"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
                {/* Nib Inlay Blood Maroon Detail */}
                <path
                  d="M14 16 L18 24 L14 32 L10 24 Z"
                  fill="#681822"
                  opacity="0.9"
                />
                {/* Breather Hole & Ink Slit */}
                <circle cx="14" cy="18" r="1.5" fill="#FFFFFF" />
                <line x1="14" y1="18" x2="14" y2="38" stroke="#FFFFFF" strokeWidth="1" />
                {/* Pen Collar Section */}
                <rect x="7" y="10" width="14" height="3" rx="1" fill="#141414" stroke="#FFFFFF" strokeWidth="0.8" />
                {/* Metallic Gradients */}
                <defs>
                  <linearGradient id="pen-grad-body" x1="5" y1="2" x2="23" y2="38" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="35%" stopColor="#ECEAE6" />
                    <stop offset="65%" stopColor="#B4B2AE" />
                    <stop offset="100%" stopColor="#FAF6F0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Ink Sparkle at Tip */}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FFCCD2] shadow-[0_0_6px_#FFCCD2] animate-ping" />
            </div>

            {/* Tooltip Bubble (Reference 1 Style) */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
              {/* Upward Triangle Pointer */}
              <div className="w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-white/95" />
              {/* Tooltip Pill */}
              <div className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#681822]" />
                <span className="text-[10.5px] font-mono font-bold text-[#141414]">
                  {isComplete ? (ur ? 'تیار ۱۰۰٪' : '100% Ready') : `${clampedProgress}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Labels below track */}
        <div className="relative w-full mt-6 flex justify-between text-[11px] font-ui text-white/70">
          <span className="text-start">
            <span className="block text-[9px] font-mono uppercase text-white/40">01</span>
            <span className={currentStage === 1 ? 'text-white font-semibold' : ''}>
              {stages[0].label}
            </span>
          </span>
          <span className="text-center">
            <span className="block text-[9px] font-mono uppercase text-white/40">02</span>
            <span className={currentStage === 2 ? 'text-white font-semibold' : ''}>
              {stages[1].label}
            </span>
          </span>
          <span className="text-end">
            <span className="block text-[9px] font-mono uppercase text-white/40">03</span>
            <span className={currentStage === 3 ? 'text-white font-semibold' : ''}>
              {stages[2].label}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
