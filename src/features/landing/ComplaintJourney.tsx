import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ComplaintJourneyProps {
  id?: string;
}

export const ComplaintJourney: React.FC<ComplaintJourneyProps> = ({ id = 'steps' }) => {
  const { t, language, isRTL } = useLanguage();
  const containerRef = useRef<HTMLElement>(null);
  const rafId = useRef<number | null>(null);

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Detect mobile/tablet viewport (< 1024px)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  // Desktop normalized scroll progress: 0.0 to 1.0 (smoothed via RAF lerp)
  const [progress, setProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  // Mobile scroll progress: 0.0 to 1.0
  const [mobileProgress, setMobileProgress] = useState(0);

  // Window dimensions for dynamic navbar-aware optical centering
  const [windowHeight, setWindowHeight] = useState(() => {
    if (typeof window === 'undefined') return 900;
    return window.innerHeight;
  });

  // Subscribe to prefers-reduced-motion, viewport resize, and window dimensions
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mqMotion.addEventListener('change', handleMotion);

    const mqMobile = window.matchMedia('(max-width: 1023px)');
    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqMobile.addEventListener('change', handleMobile);

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      mqMotion.removeEventListener('change', handleMotion);
      mqMobile.removeEventListener('change', handleMobile);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Continuous Scroll-Driven Progress Controller with RAF Scrub Damping
  const handleScroll = useCallback(() => {
    if (prefersReducedMotion) return;
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const vh = window.innerHeight;
    const totalScrollable = container.offsetHeight - vh;

    if (totalScrollable <= 0) {
      targetProgressRef.current = 1;
      currentProgressRef.current = 1;
      setProgress(1);
      setMobileProgress(1);
      return;
    }

    const currentScroll = -rect.top;
    const rawProgress = currentScroll / totalScrollable;
    const clamped = Math.max(0, Math.min(1, rawProgress));

    if (isMobile) {
      const mobDistance = vh + container.offsetHeight * 0.5;
      const currentMob = vh - rect.top;
      const mobRaw = mobDistance > 0 ? currentMob / mobDistance : 1;
      setMobileProgress(Math.max(0, Math.min(1, mobRaw)));
    } else {
      targetProgressRef.current = clamped;

      if (rafId.current === null) {
        const updateMotion = () => {
          const target = targetProgressRef.current;
          const current = currentProgressRef.current;
          const diff = target - current;

          if (Math.abs(diff) <= 0.0002) {
            currentProgressRef.current = target;
            setProgress(target);
            rafId.current = null;
            return;
          }

          const next = current + diff * 0.18;
          currentProgressRef.current = next;
          setProgress(next);
          rafId.current = requestAnimationFrame(updateMotion);
        };

        rafId.current = requestAnimationFrame(updateMotion);
      }
    }
  }, [prefersReducedMotion, isMobile]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalScrollable = containerRef.current.offsetHeight - vh;
      if (totalScrollable > 0) {
        const initialClamped = Math.max(0, Math.min(1, -rect.top / totalScrollable));
        targetProgressRef.current = initialClamped;
        currentProgressRef.current = initialClamped;
        setProgress(initialClamped);
      }
    }
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [handleScroll, prefersReducedMotion]);

  // Essential Stage Content (strictly minimal, no numbering, no badges, no fake data)
  const stepsData = [
    {
      key: 'write',
      title: t('processStepWriteTitle') || (language === 'ur' ? 'لکھیں' : 'Write'),
      desc: t('processStepWriteDesc') || (language === 'ur' ? 'اپنا مسئلہ بیان کریں۔' : 'Describe the issue.'),
    },
    {
      key: 'review',
      title: t('processStepReviewTitle') || (language === 'ur' ? 'جائزہ لیں' : 'Review'),
      desc: t('processStepReviewDesc') || (language === 'ur' ? 'تفصیلات کی تصدیق کریں۔' : 'Check the details.'),
    },
    {
      key: 'route',
      title: t('processStepRouteTitle') || (language === 'ur' ? 'تفویض' : 'Route'),
      desc: t('processStepRouteDesc') || (language === 'ur' ? 'متعلقہ محکمے کی نشاندہی۔' : 'Identify the right department.'),
    },
    {
      key: 'track',
      title: t('processStepTrackTitle') || (language === 'ur' ? 'ٹریک کریں' : 'Track'),
      desc: t('processStepTrackDesc') || (language === 'ur' ? 'پیش رفت پر نظر رکھیں۔' : 'Follow the progress.'),
    },
  ];

  // Ken Perlin quintic smootherstep ease (C^2 continuous)
  const smoother = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return c * c * c * (c * (c * 6 - 15) + 10);
  };
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // =========================================================================
  // OBJECTIVE 4: IMMERSIVE FULL-SCREEN HEADING & OPTICAL TRANSFORMATION
  // Initial state: Heading appears enormous (occupying 75-90% usable width),
  // optically centered in the usable viewport below top navigation.
  // Cards & arrows are completely hidden.
  // As user scrolls: Heading smoothly shrinks (1.0 -> 0.52) and glides upward.
  // =========================================================================
  const navBottom = 72;
  const usableHeight = windowHeight - navBottom;
  const usableMidpoint = navBottom + usableHeight / 2;

  const stickyTop = 72;
  const stickyHeight = windowHeight - stickyTop;
  const compHeight = 110 + 36 + 180;
  const opticalLift = Math.round(windowHeight * 0.02);
  const compTopInSticky = Math.max(16, (stickyHeight - compHeight) / 2 - opticalLift);
  const settledHeadingCenterY = stickyTop + compTopInSticky + 55;

  const desktopHeadingCenterY = Math.max(70, usableMidpoint - settledHeadingCenterY + 16);

  // Transformation phase: p: 0.04 -> 0.28
  const tHeading = smoother(clamp01((progress - 0.04) / 0.24));
  const desktopHeadingScale = prefersReducedMotion ? 0.52 : 1.0 - tHeading * (1.0 - 0.52);
  const desktopHeadingY = prefersReducedMotion ? 0 : desktopHeadingCenterY * (1 - tHeading);

  // =========================================================================
  // OBJECTIVE 5: REFINED TYPOGRAPHIC PROCESS STATIONS & COORDINATED TIMELINE
  // Stage 1 (p: 0.26 -> 0.38): WRITE enters at center
  // Stage 2 (p: 0.40 -> 0.56): WRITE shifts left, Arrow 1 draws, REVIEW enters
  // Stage 3 (p: 0.58 -> 0.74): Stations shift left, Arrow 2 draws, ROUTE enters
  // Stage 4 (p: 0.76 -> 0.92): Stations shift left, Arrow 3 draws, TRACK enters
  // Stage 5 (p: 0.92 -> 1.00): Settled horizontal composition held before exit
  // =========================================================================

  // Stage 1: WRITE Entrance at Center
  const tEnterWrite = smoother(clamp01((progress - 0.26) / 0.12));
  const card1Opacity = prefersReducedMotion ? 1 : tEnterWrite;
  const card1Scale = prefersReducedMotion ? 1 : 0.95 + 0.05 * tEnterWrite;

  // Stage 2: WRITE shifts 0 -> -145px
  const tShiftD = smoother(clamp01((progress - 0.40) / 0.12));
  // Arrow 1 draws
  const tDrawArrow1 = smoother(clamp01((progress - 0.43) / 0.10));
  const arrow1Draw = prefersReducedMotion ? 1 : tDrawArrow1;
  // REVIEW enters at +145px
  const tEnterReview = smoother(clamp01((progress - 0.46) / 0.10));
  const card2Opacity = prefersReducedMotion ? 1 : tEnterReview;
  const card2Scale = prefersReducedMotion ? 1 : 0.95 + 0.05 * tEnterReview;

  // Stage 3: Stations shift left by 145px
  const tShiftE = smoother(clamp01((progress - 0.58) / 0.12));
  // Arrow 2 draws
  const tDrawArrow2 = smoother(clamp01((progress - 0.61) / 0.10));
  const arrow2Draw = prefersReducedMotion ? 1 : tDrawArrow2;
  // ROUTE enters at +290px
  const tEnterRoute = smoother(clamp01((progress - 0.64) / 0.10));
  const card3Opacity = prefersReducedMotion ? 1 : tEnterRoute;
  const card3Scale = prefersReducedMotion ? 1 : 0.95 + 0.05 * tEnterRoute;

  // Stage 4: Stations shift left by 145px
  const tShiftF = smoother(clamp01((progress - 0.76) / 0.12));
  // Arrow 3 draws
  const tDrawArrow3 = smoother(clamp01((progress - 0.79) / 0.10));
  const arrow3Draw = prefersReducedMotion ? 1 : tDrawArrow3;
  // TRACK enters at +435px
  const tEnterTrack = smoother(clamp01((progress - 0.82) / 0.10));
  const card4Opacity = prefersReducedMotion ? 1 : tEnterTrack;
  const card4Scale = prefersReducedMotion ? 1 : 0.95 + 0.05 * tEnterTrack;

  // Card Center X Coordinates (290px pitch between stations)
  const dir = isRTL ? -1 : 1;
  const pitch = 145;
  const c1X_raw = 0 - pitch * tShiftD - pitch * tShiftE - pitch * tShiftF;
  const c2X_raw = pitch - pitch * tShiftE - pitch * tShiftF;
  const c3X_raw = pitch * 2 - pitch * tShiftF;
  const c4X_raw = pitch * 3;

  const card1X = prefersReducedMotion ? -pitch * 3 * dir : c1X_raw * dir;
  const card2X = prefersReducedMotion ? -pitch * dir : c2X_raw * dir;
  const card3X = prefersReducedMotion ? pitch * dir : c3X_raw * dir;
  const card4X = prefersReducedMotion ? pitch * 3 * dir : c4X_raw * dir;

  // Vector Arrow Connectors (Centrally positioned between stations)
  const arrow1X = (card1X + card2X) / 2;
  const arrow2X = (card2X + card3X) / 2;
  const arrow3X = (card3X + card4X) / 2;

  // Mobile Heading Motion
  const mobileHeadingCenterY = Math.max(90, Math.min(200, (windowHeight - 180) / 2));
  const tMobileHeadUp = smoother(clamp01(mobileProgress / 0.20));
  const mobileHeadingScale = prefersReducedMotion ? 0.8 : 1.0 - tMobileHeadUp * (1.0 - 0.8);
  const mobileHeadingY = prefersReducedMotion ? 0 : mobileHeadingCenterY * (1 - tMobileHeadUp);

  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#E5E3E0] bg-[#F7F6F3] text-[#141414] scroll-mt-20 sm:scroll-mt-24 select-none"
      style={{
        minHeight: prefersReducedMotion || isMobile ? 'auto' : '360vh',
      }}
      aria-label={t('processHeading') || 'How It Works'}
    >
      {/* ========================================================
          DESKTOP FULL-SCREEN PINNED STAGE (>= 1024px)
          Dominant opening heading shrinks upward, space opens,
          and refined typographic stations emerge with vector arrows
          ======================================================== */}
      <div
        className={`hidden lg:flex w-full flex-col justify-center items-center px-4 sm:px-10 lg:px-16 xl:px-20 overflow-hidden ${
          prefersReducedMotion
            ? 'relative py-20 sm:py-28'
            : 'sticky top-16 sm:top-20 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)]'
        }`}
      >
        <div
          className="w-full max-w-7xl mx-auto flex flex-col items-center"
          style={{
            transform: prefersReducedMotion ? 'none' : `translate3d(0, -${opticalLift}px, 0)`,
          }}
        >
          {/* Dominant Section Heading: Occupies ~80% width initially, smoothly transforms */}
          <div
            className="w-full text-center will-change-transform z-20 pointer-events-none"
            style={{
              transform: `translate3d(0, ${desktopHeadingY}px, 0) scale(${desktopHeadingScale})`,
              transformOrigin: 'center center',
            }}
          >
            <h2 className="font-display text-[84px] sm:text-[112px] lg:text-[136px] xl:text-[160px] text-[#141414] uppercase tracking-tight leading-none whitespace-normal lg:whitespace-nowrap">
              {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
            </h2>
          </div>

          {/* Central Typographic Stations Stage */}
          <div
            className="relative w-full max-w-6xl mx-auto flex items-center justify-center min-h-[170px] xl:min-h-[180px] will-change-transform mt-8 xl:mt-10"
            style={{ perspective: '1200px' }}
          >
            {/* ---------------- STATION 1: WRITE ---------------- */}
            <div
              className="absolute w-[220px] xl:w-[240px] min-h-[150px] p-5 xl:p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0]/80 shadow-none flex flex-col justify-between transition-all will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${card1X}px), -50%, 0) scale(${card1Scale})`,
                opacity: card1Opacity,
                zIndex: 10,
                pointerEvents: card1Opacity > 0.5 ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.7rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[0].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-2.5 leading-relaxed font-normal">
                  {stepsData[0].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 1: WRITE -> REVIEW ---------------- */}
            <div
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-5"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${arrow1X}px), -50%, 0)`,
                opacity: prefersReducedMotion ? 1 : (arrow1Draw > 0 ? 1 : 0),
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  d={
                    isRTL
                      ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                      : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                  }
                  stroke="#0B1421"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 95,
                    strokeDashoffset: (1 - arrow1Draw) * 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 2: REVIEW ---------------- */}
            <div
              className="absolute w-[220px] xl:w-[240px] min-h-[150px] p-5 xl:p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0]/80 shadow-none flex flex-col justify-between transition-all will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${card2X}px), -50%, 0) scale(${card2Scale})`,
                opacity: card2Opacity,
                zIndex: 10,
                pointerEvents: card2Opacity > 0.5 ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.7rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[1].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-2.5 leading-relaxed font-normal">
                  {stepsData[1].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 2: REVIEW -> ROUTE ---------------- */}
            <div
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-5"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${arrow2X}px), -50%, 0)`,
                opacity: prefersReducedMotion ? 1 : (arrow2Draw > 0 ? 1 : 0),
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  d={
                    isRTL
                      ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                      : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                  }
                  stroke="#0B1421"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 95,
                    strokeDashoffset: (1 - arrow2Draw) * 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 3: ROUTE ---------------- */}
            <div
              className="absolute w-[220px] xl:w-[240px] min-h-[150px] p-5 xl:p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0]/80 shadow-none flex flex-col justify-between transition-all will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${card3X}px), -50%, 0) scale(${card3Scale})`,
                opacity: card3Opacity,
                zIndex: 10,
                pointerEvents: card3Opacity > 0.5 ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.7rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[2].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-2.5 leading-relaxed font-normal">
                  {stepsData[2].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 3: ROUTE -> TRACK ---------------- */}
            <div
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-5"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${arrow3X}px), -50%, 0)`,
                opacity: prefersReducedMotion ? 1 : (arrow3Draw > 0 ? 1 : 0),
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  d={
                    isRTL
                      ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                      : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                  }
                  stroke="#0B1421"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 95,
                    strokeDashoffset: (1 - arrow3Draw) * 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 4: TRACK ---------------- */}
            <div
              className="absolute w-[220px] xl:w-[240px] min-h-[150px] p-5 xl:p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0]/80 shadow-none flex flex-col justify-between transition-all will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate3d(calc(-50% + ${card4X}px), -50%, 0) scale(${card4Scale})`,
                opacity: card4Opacity,
                zIndex: 10,
                pointerEvents: card4Opacity > 0.5 ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.7rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[3].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-2.5 leading-relaxed font-normal">
                  {stepsData[3].desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MOBILE / TABLET PURPOSE-BUILT VERTICAL PROGRESSION (< 1024px)
          ======================================================== */}
      <div className="lg:hidden py-16 sm:py-24 px-4 sm:px-8 w-full max-w-md mx-auto">
        <div
          className="mb-10 sm:mb-14 text-center will-change-transform"
          style={{
            transform: `translate3d(0, ${mobileHeadingY}px, 0) scale(${mobileHeadingScale})`,
            transformOrigin: 'center center',
          }}
        >
          <h2 className="font-display text-4xl sm:text-5xl text-[#141414] uppercase tracking-tight">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        <div className="flex flex-col items-center w-full">
          {stepsData.map((stg, index) => {
            const threshold = 0.12 + index * 0.16;
            const arrowThreshold = threshold + 0.08;
            const isCardVisible = prefersReducedMotion || mobileProgress >= threshold;
            const isArrowDrawn = prefersReducedMotion || mobileProgress >= arrowThreshold;

            return (
              <React.Fragment key={stg.key}>
                <div
                  className={`w-full p-5 sm:p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0]/80 shadow-none transition-all duration-500 ease-out text-start ${
                    isCardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <div className="w-6 h-0.5 bg-[#681822] mb-2.5" />
                  <h3 className="font-display text-xl sm:text-2xl text-[#141414] tracking-tight uppercase leading-none">
                    {stg.title}
                  </h3>
                  <p className="font-ui text-xs sm:text-sm text-[#323232] mt-2 leading-relaxed font-normal">
                    {stg.desc}
                  </p>
                </div>

                {index < stepsData.length - 1 && (
                  <div className="py-2.5 sm:py-3 flex items-center justify-center" aria-hidden="true">
                    <svg viewBox="0 0 24 56" className="w-5 sm:w-6 h-9 sm:h-11 overflow-visible" fill="none">
                      <path
                        d="M 12 2 L 12 46 M 4 34 L 12 46 L 20 34"
                        stroke="#0B1421"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: 90,
                          strokeDashoffset: isArrowDrawn ? 0 : 90,
                          transition: prefersReducedMotion
                            ? 'none'
                            : 'stroke-dashoffset 450ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ComplaintJourney;
