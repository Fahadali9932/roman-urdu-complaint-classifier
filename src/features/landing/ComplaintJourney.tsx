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

  // Desktop normalized scroll progress: 0.0 to 1.0
  const [progress, setProgress] = useState(0);

  // Mobile scroll progress: 0.0 to 1.0
  const [mobileProgress, setMobileProgress] = useState(0);

  // Window height for dynamic vertical centering
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

  // Continuous Scroll-Driven Progress Controller (Desktop & Mobile)
  const handleScroll = useCallback(() => {
    if (prefersReducedMotion) return;
    if (!containerRef.current) return;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const totalScrollable = container.offsetHeight - vh;

      if (totalScrollable <= 0) {
        setProgress(1);
        setMobileProgress(1);
        return;
      }

      const currentScroll = -rect.top;
      const rawProgress = currentScroll / totalScrollable;
      const clamped = Math.max(0, Math.min(1, rawProgress));

      if (isMobile) {
        // Mobile progress over its scroll distance
        const mobScrollable = container.offsetHeight - vh * 0.7;
        const mobRaw = mobScrollable > 0 ? currentScroll / mobScrollable : 1;
        setMobileProgress(Math.max(0, Math.min(1, mobRaw)));
      } else {
        setProgress(clamped);
      }
    });
  }, [prefersReducedMotion, isMobile]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, prefersReducedMotion]);

  // Essential Card Content (strictly no numbering, no badges, no extra copy)
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

  // Helper smoothstep ease
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // =========================================================================
  // HEADING CENTERING & UPWARD MOTION MATHEMATICS
  // Initial (p < 0.06): Heading centered horizontally and vertically
  // Transition (p: 0.06 -> 0.20): Heading translates smoothly upward to top
  // Settled (p >= 0.20): Heading rests cleanly at top, safely below navbar
  // =========================================================================

  // Dynamic vertical offset to place heading at visual center of usable viewport
  // Viewport height minus navbar height (~112px), half is ~340px - top margin (~40px)
  const desktopHeadingCenterY = Math.max(180, Math.min(270, (windowHeight - 240) / 2));
  const tHeadingUp = smooth(clamp01((progress - 0.06) / 0.14));
  const desktopHeadingY = prefersReducedMotion ? 0 : desktopHeadingCenterY * (1 - tHeadingUp);

  // =========================================================================
  // CARD & ARROW CHOREOGRAPHY (Begins only after heading has moved upward)
  // Stage C: WRITE enters center (p: 0.20 -> 0.36)
  // Stage D: WRITE moves left -> Arrow 1 draws -> REVIEW enters (p: 0.36 -> 0.56)
  // Stage E: Cards shift left -> Arrow 2 draws -> ROUTE enters (p: 0.56 -> 0.76)
  // Stage F: Cards shift left -> Arrow 3 draws -> TRACK enters (p: 0.76 -> 0.94)
  // Stage G: Final 4-card arrangement holds, then naturally releases (p >= 0.94)
  // =========================================================================

  // Step 1: WRITE Entrance at center (0.20 -> 0.35)
  const tEnterWrite = clamp01((progress - 0.20) / 0.15);
  const card1Opacity = prefersReducedMotion ? 1 : smooth(tEnterWrite);
  const card1EnterY = prefersReducedMotion ? 0 : (1 - smooth(tEnterWrite)) * 28;
  const card1EnterScale = prefersReducedMotion ? 1 : 0.94 + smooth(tEnterWrite) * 0.06;

  // Step 2: WRITE moves to left, REVIEW enters (0.36 -> 0.55)
  const tShift2 = smooth(clamp01((progress - 0.36) / 0.15));
  const tDrawArrow1 = smooth(clamp01((progress - 0.39) / 0.13));
  const tEnterReview = smooth(clamp01((progress - 0.42) / 0.13));

  // Step 3: Shift to 3-card layout, ROUTE enters (0.56 -> 0.75)
  const tShift3 = smooth(clamp01((progress - 0.56) / 0.15));
  const tDrawArrow2 = smooth(clamp01((progress - 0.59) / 0.13));
  const tEnterRoute = smooth(clamp01((progress - 0.62) / 0.13));

  // Step 4: Shift to final 4-card layout, TRACK enters (0.76 -> 0.93)
  const tShift4 = smooth(clamp01((progress - 0.76) / 0.14));
  const tDrawArrow3 = smooth(clamp01((progress - 0.79) / 0.12));
  const tEnterTrack = smooth(clamp01((progress - 0.82) / 0.12));

  // Horizontal Coordinates (in pixels from center)
  // Card 1 (WRITE) X position: 0 -> -145 -> -290 -> -435
  const c1X_raw =
    -145 * tShift2 * (1 - tShift3) +
    -290 * tShift3 * (1 - tShift4) +
    -435 * tShift4;
  const card1X = prefersReducedMotion ? (isRTL ? 435 : -435) : (isRTL ? -c1X_raw : c1X_raw);

  // Card 2 (REVIEW) X position: enters at +145, then moves +145 -> 0 -> -145
  const c2X_raw =
    145 * (1 - tShift3) -
    145 * tShift4;
  const card2X = prefersReducedMotion ? (isRTL ? 145 : -145) : (isRTL ? -c2X_raw : c2X_raw);
  const card2Opacity = prefersReducedMotion ? 1 : tEnterReview;
  const card2Y = prefersReducedMotion ? 0 : (1 - tEnterReview) * 22;
  const card2Scale = prefersReducedMotion ? 1 : 0.94 + tEnterReview * 0.06;

  // Card 3 (ROUTE) X position: enters at +290, then moves +290 -> +145
  const c3X_raw = 290 * (1 - tShift4) + 145 * tShift4;
  const card3X = prefersReducedMotion ? (isRTL ? -145 : 145) : (isRTL ? -c3X_raw : c3X_raw);
  const card3Opacity = prefersReducedMotion ? 1 : tEnterRoute;
  const card3Y = prefersReducedMotion ? 0 : (1 - tEnterRoute) * 22;
  const card3Scale = prefersReducedMotion ? 1 : 0.94 + tEnterRoute * 0.06;

  // Card 4 (TRACK) X position: enters at +435
  const c4X_raw = 435;
  const card4X = prefersReducedMotion ? (isRTL ? -435 : 435) : (isRTL ? -c4X_raw : c4X_raw);
  const card4Opacity = prefersReducedMotion ? 1 : tEnterTrack;
  const card4Y = prefersReducedMotion ? 0 : (1 - tEnterTrack) * 22;
  const card4Scale = prefersReducedMotion ? 1 : 0.94 + tEnterTrack * 0.06;

  // Arrow Connectors (Dynamically bound to card midpoints)
  const arrow1X = (card1X + card2X) / 2;
  const arrow1Draw = prefersReducedMotion ? 1 : tDrawArrow1;

  const arrow2X = (card2X + card3X) / 2;
  const arrow2Draw = prefersReducedMotion ? 1 : tDrawArrow2;

  const arrow3X = (card3X + card4X) / 2;
  const arrow3Draw = prefersReducedMotion ? 1 : tDrawArrow3;

  // =========================================================================
  // MOBILE HEADING CENTERING & UPWARD MOTION
  // =========================================================================
  const mobileHeadingCenterY = Math.max(120, Math.min(220, (windowHeight - 200) / 2));
  const tMobileHeadUp = smooth(clamp01(mobileProgress / 0.18));
  const mobileHeadingY = prefersReducedMotion ? 0 : mobileHeadingCenterY * (1 - tMobileHeadUp);

  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#34394A]/15 bg-[#E9EBED] scroll-mt-28 sm:scroll-mt-32 select-none"
      style={{
        // Desktop: ~260vh bounded scroll scene for controlled pacing
        // Mobile: natural proportional height allowing smooth progression
        minHeight: prefersReducedMotion ? 'auto' : isMobile ? '160vh' : '260vh',
      }}
      aria-label={t('processHeading') || 'How It Works'}
    >
      {/* ========================================================
          DESKTOP FULL-SCREEN PINNED STAGE (>= 1024px)
          Occupies full viewport, centered heading moves upward,
          cards animate in sequence, completely releasing into footer
          ======================================================== */}
      <div
        className={`hidden lg:flex w-full flex-col justify-between px-4 sm:px-10 lg:px-16 xl:px-20 py-8 xl:py-10 overflow-hidden ${
          prefersReducedMotion
            ? 'relative py-24 sm:py-32'
            : 'sticky top-24 sm:top-28 h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7.5rem)]'
        }`}
      >
        {/* Prominent, authoritative section heading */}
        {/* Centered initially, smoothly moves upward as user scrolls */}
        <div
          className="max-w-6xl mx-auto w-full text-center pt-2 will-change-transform"
          style={{
            transform: `translate3d(0, ${desktopHeadingY}px, 0)`,
            transition: prefersReducedMotion ? 'none' : 'transform 100ms linear',
          }}
        >
          <h2 className="font-display text-4xl sm:text-5xl xl:text-6xl text-[#0B1421] uppercase tracking-tight">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        {/* Central 3D Choreography Stage */}
        <div
          className="relative w-full max-w-6xl mx-auto flex-1 flex items-center justify-center my-auto"
          style={{ perspective: '1200px', minHeight: '320px' }}
        >
          {/* ---------------- CARD 1: WRITE ---------------- */}
          <div
            className="absolute w-[220px] xl:w-[240px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card1X}px, ${card1EnterY}px, 0) scale(${card1EnterScale})`,
              opacity: card1Opacity,
              minHeight: '160px',
              zIndex: 10,
              pointerEvents: card1Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[0].title}
              </h3>
              <p className="font-ui text-sm text-[#535965] mt-2 leading-relaxed">
                {stepsData[0].desc}
              </p>
            </div>
          </div>

          {/* ---------------- ARROW 1: WRITE -> REVIEW ---------------- */}
          <div
            className="absolute flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${arrow1X}px, 0, 0)`,
              opacity: card2Opacity > 0.05 ? 1 : arrow1Draw,
              zIndex: 5,
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 64 24" className="w-11 xl:w-14 h-6 overflow-visible" fill="none">
              <path
                d={
                  isRTL
                    ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                    : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                }
                stroke="#0B1421"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 95,
                  strokeDashoffset: (1 - arrow1Draw) * 95,
                }}
              />
            </svg>
          </div>

          {/* ---------------- CARD 2: REVIEW ---------------- */}
          <div
            className="absolute w-[220px] xl:w-[240px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card2X}px, ${card2Y}px, 0) scale(${card2Scale})`,
              opacity: card2Opacity,
              minHeight: '160px',
              zIndex: 10,
              pointerEvents: card2Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[1].title}
              </h3>
              <p className="font-ui text-sm text-[#535965] mt-2 leading-relaxed">
                {stepsData[1].desc}
              </p>
            </div>
          </div>

          {/* ---------------- ARROW 2: REVIEW -> ROUTE ---------------- */}
          <div
            className="absolute flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${arrow2X}px, 0, 0)`,
              opacity: card3Opacity > 0.05 ? 1 : arrow2Draw,
              zIndex: 5,
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 64 24" className="w-11 xl:w-14 h-6 overflow-visible" fill="none">
              <path
                d={
                  isRTL
                    ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                    : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                }
                stroke="#0B1421"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 95,
                  strokeDashoffset: (1 - arrow2Draw) * 95,
                }}
              />
            </svg>
          </div>

          {/* ---------------- CARD 3: ROUTE ---------------- */}
          <div
            className="absolute w-[220px] xl:w-[240px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card3X}px, ${card3Y}px, 0) scale(${card3Scale})`,
              opacity: card3Opacity,
              minHeight: '160px',
              zIndex: 10,
              pointerEvents: card3Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[2].title}
              </h3>
              <p className="font-ui text-sm text-[#535965] mt-2 leading-relaxed">
                {stepsData[2].desc}
              </p>
            </div>
          </div>

          {/* ---------------- ARROW 3: ROUTE -> TRACK ---------------- */}
          <div
            className="absolute flex items-center justify-center pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${arrow3X}px, 0, 0)`,
              opacity: card4Opacity > 0.05 ? 1 : arrow3Draw,
              zIndex: 5,
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 64 24" className="w-11 xl:w-14 h-6 overflow-visible" fill="none">
              <path
                d={
                  isRTL
                    ? 'M 62 12 L 10 12 M 22 4 L 10 12 L 22 20'
                    : 'M 2 12 L 54 12 M 42 4 L 54 12 L 42 20'
                }
                stroke="#0B1421"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 95,
                  strokeDashoffset: (1 - arrow3Draw) * 95,
                }}
              />
            </svg>
          </div>

          {/* ---------------- CARD 4: TRACK ---------------- */}
          <div
            className="absolute w-[220px] xl:w-[240px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card4X}px, ${card4Y}px, 0) scale(${card4Scale})`,
              opacity: card4Opacity,
              minHeight: '160px',
              zIndex: 10,
              pointerEvents: card4Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[3].title}
              </h3>
              <p className="font-ui text-sm text-[#535965] mt-2 leading-relaxed">
                {stepsData[3].desc}
              </p>
            </div>
          </div>
        </div>

        {/* Clean, zero-clutter bottom spacing - No decorative captions */}
        <div className="w-full h-2" />
      </div>

      {/* ========================================================
          MOBILE / TABLET PURPOSE-BUILT VERTICAL PROGRESSION (< 1024px)
          Centered heading moves upward, cards appear in sequence
          ======================================================== */}
      <div className="lg:hidden py-16 sm:py-24 px-4 sm:px-8 w-full max-w-md mx-auto">
        {/* Mobile Heading: Centered initially, smoothly moves upward as user scrolls */}
        <div
          className="mb-10 sm:mb-14 text-center will-change-transform"
          style={{
            transform: `translate3d(0, ${mobileHeadingY}px, 0)`,
            transition: prefersReducedMotion ? 'none' : 'transform 100ms linear',
          }}
        >
          <h2 className="font-display text-3xl sm:text-4xl text-[#0B1421] uppercase tracking-tight">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        {/* Vertical Stack with Downward Vector Arrows */}
        <div className="flex flex-col items-center w-full">
          {stepsData.map((stg, index) => {
            // Progressive reveal on mobile scroll
            const threshold = 0.18 + index * 0.20;
            const arrowThreshold = threshold + 0.10;
            const isCardVisible = prefersReducedMotion || mobileProgress >= threshold;
            const isArrowDrawn = prefersReducedMotion || mobileProgress >= arrowThreshold;

            return (
              <React.Fragment key={stg.key}>
                {/* Minimal Card */}
                <div
                  className={`w-full p-6 sm:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-sm transition-all duration-500 ease-out text-start ${
                    isCardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <h3 className="font-display text-2xl sm:text-3xl text-[#0B1421] tracking-tight uppercase">
                    {stg.title}
                  </h3>
                  <p className="font-ui text-sm sm:text-base text-[#535965] mt-2 leading-relaxed">
                    {stg.desc}
                  </p>
                </div>

                {/* Downward Vector Arrow */}
                {index < stepsData.length - 1 && (
                  <div className="py-3 sm:py-4 flex items-center justify-center" aria-hidden="true">
                    <svg viewBox="0 0 24 56" className="w-5 sm:w-6 h-10 sm:h-12 overflow-visible" fill="none">
                      <path
                        d="M 12 2 L 12 46 M 4 34 L 12 46 L 20 34"
                        stroke="#0B1421"
                        strokeWidth="5"
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
