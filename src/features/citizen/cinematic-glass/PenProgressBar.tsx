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
      className="w-full relative py-4 sm:py-6 select-none"
      role="progressbar"
      aria-label={ur ? 'شکایت فارم کی پیش رفت' : 'Complaint progress'}
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={ur ? `${clampedProgress} فیصد مکمل` : `${clampedProgress}% completed`}
    >
      {/* Target Geometry: Width ~680-740px where space allows */}
      <div className="relative w-full max-w-[740px] mx-auto px-5 sm:px-6">
        {/* Endpoints & Trajectory Header */}
        <div className="flex items-center justify-between text-xs font-mono text-white/60 mb-3.5 px-1">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/50 ring-2 ring-white/20" />
            <span className="font-medium tracking-wide">{ur ? 'آغاز' : 'Start'}</span>
          </span>
          <span className="text-white/45 text-[11px] tracking-widest uppercase font-semibold">
            {ur ? 'قلمی پیش رفت' : 'Ink Trajectory'}
          </span>
          <span className="flex items-center gap-2 font-semibold text-white/90">
            <span className="tracking-wide">{isComplete ? (ur ? 'مکمل' : 'Ready') : '100%'}</span>
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-[#FFCCD2] shadow-[0_0_10px_#FFCCD2] ring-2 ring-[#FFCCD2]/50'
                  : 'bg-white/40 ring-2 ring-white/15'
              }`}
            />
          </span>
        </div>

        {/* Thick, Fully Rounded Main Horizontal Track (12-14px) */}
        <div className="relative h-3.5 sm:h-[14px] w-full bg-black/45 rounded-full backdrop-blur-md overflow-visible border border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.65),0_6px_18px_rgba(0,0,0,0.4)]">
          {/* Active Substantial Ink Trail Fill with Rounded Ends */}
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-[#681822] via-[#8A232E] to-[#E89BA4] shadow-[0_0_18px_rgba(232,155,164,0.55)] overflow-hidden"
            style={{
              [isRTL ? 'right' : 'left']: 0,
              width: `${clampedProgress}%`,
            }}
          >
            {/* Top-edge specular highlight inside the ink trail */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/40 rounded-full" />
          </div>

          {/* Milestone Checkpoints Along Track (Proportionate 22px discs) */}
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
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  isPassed
                    ? 'bg-[#681822] text-white border-2 border-white ring-2 ring-[#681822]/60 shadow-[0_0_10px_rgba(104,24,34,0.7)]'
                    : isCurrent
                      ? 'bg-white text-[#141414] border-2 border-[#681822] ring-2 ring-white/70 shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                      : 'bg-[#18181b] border-2 border-white/30 text-white/40 hover:border-white/50'
                }`}
                style={{
                  [isRTL ? 'right' : 'left']: `${st.percent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {st.ready ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
            );
          })}

          {/* VISUALLY PROMINENT FOUNTAIN PEN (32-38px) & TOOLTIP BUBBLE */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 ease-out"
            style={{
              [isRTL ? 'right' : 'left']: `${clampedProgress}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Custom High-Fidelity Fountain Pen Illustration */}
            <div
              className={`relative -top-5 sm:-top-6 transition-transform duration-300 origin-bottom ${
                isComplete ? 'scale-110' : 'scale-100'
              } ${isRTL ? '-scale-x-100 -rotate-12' : 'rotate-12'}`}
            >
              <svg
                viewBox="0 0 36 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[32px] h-[44px] sm:w-[36px] sm:h-[50px] overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] filter"
              >
                <defs>
                  {/* Metallic gradient for nib body */}
                  <linearGradient id="pen-metal-grad" x1="0" y1="0" x2="36" y2="50" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="25%" stopColor="#F0EEEB" />
                    <stop offset="50%" stopColor="#C4C1BC" />
                    <stop offset="75%" stopColor="#ECEAE6" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                  {/* Collar grip gradient */}
                  <linearGradient id="pen-grip-grad" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#181818" />
                    <stop offset="50%" stopColor="#383838" />
                    <stop offset="100%" stopColor="#141414" />
                  </linearGradient>
                </defs>

                {/* Pen Grip Section / Collar (Top) */}
                <rect x="9" y="2" width="18" height="6" rx="2" fill="url(#pen-grip-grad)" stroke="#FFFFFF" strokeWidth="1" />
                <line x1="9" y1="5" x2="27" y2="5" stroke="#E89BA4" strokeWidth="1.2" />

                {/* Main Nib Blade Silhouette tapering to tip at bottom (18, 48) */}
                <path
                  d="M10 8 L26 8 L29 20 L23 34 L18 48 L13 34 L7 20 Z"
                  fill="url(#pen-metal-grad)"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />

                {/* Nib Inlaid Blood Maroon Emblem */}
                <path
                  d="M18 20 L22 30 L18 40 L14 30 Z"
                  fill="#681822"
                  stroke="#8A232E"
                  strokeWidth="0.8"
                />

                {/* Breather Hole and Ink Slit */}
                <circle cx="18" cy="22" r="2" fill="#FFFFFF" />
                <line x1="18" y1="22" x2="18" y2="48" stroke="#FFFFFF" strokeWidth="1.2" />
              </svg>

              {/* Glowing Ink Dot at Tip (Non-continuous pulse) */}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FFCCD2] shadow-[0_0_8px_#FFCCD2]" />
            </div>

            {/* Speech Bubble Tooltip Indicator */}
            <div
              className={`absolute top-6 flex flex-col items-center transition-transform duration-300 ${
                isRTL
                  ? clampedProgress > 80
                    ? '-translate-x-[20%]'
                    : clampedProgress < 20
                    ? '-translate-x-[80%]'
                    : '-translate-x-1/2'
                  : clampedProgress > 80
                  ? '-translate-x-[80%]'
                  : clampedProgress < 20
                  ? '-translate-x-[20%]'
                  : '-translate-x-1/2'
              }`}
            >
              {/* Upward Triangle Pointer */}
              <div
                className={`w-0 h-0 border-x-[5px] border-x-transparent border-b-[5px] border-b-white/95 ${
                  isRTL
                    ? clampedProgress > 80
                      ? 'me-6'
                      : clampedProgress < 20
                      ? 'ms-6'
                      : ''
                    : clampedProgress > 80
                    ? 'ms-6'
                    : clampedProgress < 20
                    ? 'me-6'
                    : ''
                }`}
              />
              {/* Tooltip Pill */}
              <div className="px-3 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_6px_16px_rgba(0,0,0,0.4)] flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#681822]" />
                <span className="text-[11px] font-mono font-bold text-[#141414]">
                  {isComplete ? (ur ? 'تیار ۱۰۰٪' : '100% Ready') : `${clampedProgress}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Labels Below Track */}
        <div className="relative w-full mt-7 flex justify-between text-xs font-ui text-white/75">
          <span className="text-start">
            <span className="block text-[10px] font-mono uppercase text-white/45">01</span>
            <span className={currentStage === 1 ? 'text-white font-semibold' : ''}>
              {stages[0].label}
            </span>
          </span>
          <span className="text-center">
            <span className="block text-[10px] font-mono uppercase text-white/45">02</span>
            <span className={currentStage === 2 ? 'text-white font-semibold' : ''}>
              {stages[1].label}
            </span>
          </span>
          <span className="text-end">
            <span className="block text-[10px] font-mono uppercase text-white/45">03</span>
            <span className={currentStage === 3 ? 'text-white font-semibold' : ''}>
              {stages[2].label}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
