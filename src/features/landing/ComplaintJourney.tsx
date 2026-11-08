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
        // Natural scroll progress on mobile (< 1024px)
        // Starts as section enters viewport and completes smoothly as user scrolls through
        const mobDistance = vh + container.offsetHeight * 0.5;
        const currentMob = vh - rect.top;
        const mobRaw = mobDistance > 0 ? currentMob / mobDistance : 1;
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
  // OBJECTIVE 1 & 2: MASSIVE CENTERED HEADING & SMOOTH SHRINK / MOVE UPWARD
  // Initial (p < 0.05): Massive heading centered horizontally & vertically (scale: 1.0)
  // Transition (p: 0.05 -> 0.22): Heading smoothly shrinks (scale: 1.0 -> 0.36) and
  // translates upward (Y: desktopHeadingCenterY -> 0px) to settle below navbar
  // Settled (p >= 0.22): Sits neatly at top-center (effective ~50px), leaving full
  // stage below for circular card choreography
  // =========================================================================

  const desktopHeadingCenterY = Math.max(180, Math.min(270, (windowHeight - 240) / 2));
  const tHeading = smooth(clamp01((progress - 0.05) / 0.17));
  const desktopHeadingScale = prefersReducedMotion ? 0.36 : 1.0 - tHeading * (1.0 - 0.36);
  const desktopHeadingY = prefersReducedMotion ? 0 : desktopHeadingCenterY * (1 - tHeading);

  // =========================================================================
  // OBJECTIVE 3, 4, 5, 6: CIRCULAR SCROLL JOURNEY & CURVED ANIMATED ARROWS
  // Stage A & B (p: 0.00 -> 0.20): Heading dominant, cards hidden
  // Stage C (p: 0.20 -> 0.35): WRITE enters center (0, 0)
  // Stage D (p: 0.35 -> 0.54): WRITE moves to upper-left, Arrow 1 draws, REVIEW enters upper-right
  // Stage E (p: 0.55 -> 0.73): Arrow 2 draws down right arc, ROUTE enters lower-right
  // Stage F (p: 0.74 -> 0.92): Arrow 3 draws across bottom arc, TRACK enters lower-left
  // Stage G (p >= 0.92): Full circular composition holds, then naturally releases into next section
  // =========================================================================

  // Card 1: WRITE
  // Enters at center (0, 0) between 0.20 and 0.34
  const tEnterWrite = smooth(clamp01((progress - 0.20) / 0.14));
  const card1Opacity = prefersReducedMotion ? 1 : tEnterWrite;
  const card1EnterScale = prefersReducedMotion ? 1 : 0.90 + tEnterWrite * 0.10;

  // WRITE shifts from center (0, 0) to upper-left (-350, -135) between 0.35 and 0.49
  const tMoveWrite = smooth(clamp01((progress - 0.35) / 0.14));
  const targetWriteX = isRTL ? 350 : -350;
  const card1X = prefersReducedMotion ? targetWriteX : targetWriteX * tMoveWrite;
  const card1Y = prefersReducedMotion ? -135 : -135 * tMoveWrite;

  // Arrow 1: WRITE -> REVIEW (Top Arc) draws between 0.40 and 0.53
  const tDrawArrow1 = smooth(clamp01((progress - 0.40) / 0.13));
  const arrow1Draw = prefersReducedMotion ? 1 : tDrawArrow1;

  // Card 2: REVIEW
  // Enters at upper-right (+350, -135) between 0.44 and 0.55
  const tEnterReview = smooth(clamp01((progress - 0.44) / 0.11));
  const card2Opacity = prefersReducedMotion ? 1 : tEnterReview;
  const card2Scale = prefersReducedMotion ? 1 : 0.90 + tEnterReview * 0.10;
  const card2X = isRTL ? -350 : 350;
  const card2Y = -135;

  // Arrow 2: REVIEW -> ROUTE (Right Arc) draws between 0.57 and 0.70
  const tDrawArrow2 = smooth(clamp01((progress - 0.57) / 0.13));
  const arrow2Draw = prefersReducedMotion ? 1 : tDrawArrow2;

  // Card 3: ROUTE
  // Enters at lower-right (+350, +135) between 0.60 and 0.72
  const tEnterRoute = smooth(clamp01((progress - 0.60) / 0.12));
  const card3Opacity = prefersReducedMotion ? 1 : tEnterRoute;
  const card3Scale = prefersReducedMotion ? 1 : 0.90 + tEnterRoute * 0.10;
  const card3X = isRTL ? -350 : 350;
  const card3Y = 135;

  // Arrow 3: ROUTE -> TRACK (Bottom Arc) draws between 0.75 and 0.88
  const tDrawArrow3 = smooth(clamp01((progress - 0.75) / 0.13));
  const arrow3Draw = prefersReducedMotion ? 1 : tDrawArrow3;

  // Card 4: TRACK
  // Enters at lower-left (-350, +135) between 0.78 and 0.90
  const tEnterTrack = smooth(clamp01((progress - 0.78) / 0.12));
  const card4Opacity = prefersReducedMotion ? 1 : tEnterTrack;
  const card4Scale = prefersReducedMotion ? 1 : 0.90 + tEnterTrack * 0.10;
  const card4X = isRTL ? 350 : -350;
  const card4Y = 135;

  // =========================================================================
  // MOBILE HEADING CENTERING & UPWARD MOTION (< 1024px)
  // =========================================================================
  const mobileHeadingCenterY = Math.max(100, Math.min(220, (windowHeight - 200) / 2));
  const tMobileHeadUp = smooth(clamp01(mobileProgress / 0.18));
  const mobileHeadingScale = prefersReducedMotion ? 0.75 : 1.0 - tMobileHeadUp * (1.0 - 0.68);
  const mobileHeadingY = prefersReducedMotion ? 0 : mobileHeadingCenterY * (1 - tMobileHeadUp);

  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#34394A]/15 bg-[#E9EBED] scroll-mt-28 sm:scroll-mt-32 select-none"
      style={{
        // Desktop: ~260vh bounded scroll scene for controlled cinematic pacing
        // Mobile: natural height with smooth scroll progression and zero empty space
        minHeight: prefersReducedMotion || isMobile ? 'auto' : '260vh',
      }}
      aria-label={t('processHeading') || 'How It Works'}
    >
      {/* ========================================================
          DESKTOP FULL-SCREEN PINNED STAGE (>= 1024px)
          Occupies full viewport, massive heading shrinks & moves up,
          large cards animate into circular elliptical composition,
          releasing cleanly into footer/next section
          ======================================================== */}
      <div
        className={`hidden lg:flex w-full flex-col justify-between px-4 sm:px-10 lg:px-16 xl:px-20 py-6 xl:py-8 overflow-hidden ${
          prefersReducedMotion
            ? 'relative py-24 sm:py-32'
            : 'sticky top-20 sm:top-24 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)]'
        }`}
      >
        {/* Prominent, authoritative section heading */}
        {/* Massive & centered initially; smoothly shrinks & glides upward on scroll */}
        <div
          className="max-w-7xl mx-auto w-full text-center pt-2 will-change-transform z-20"
          style={{
            transform: `translate3d(0, ${desktopHeadingY}px, 0) scale(${desktopHeadingScale})`,
            transformOrigin: 'center center',
            transition: prefersReducedMotion ? 'none' : 'transform 100ms linear',
          }}
        >
          <h2 className="font-display text-[76px] sm:text-[104px] lg:text-[124px] xl:text-[138px] text-[#0B1421] uppercase tracking-tight leading-none whitespace-normal lg:whitespace-nowrap">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        {/* Central Circular / Elliptical Stage (Shared 1200x560 coordinate space) */}
        <div
          className="relative w-full max-w-6xl mx-auto flex-1 flex items-center justify-center my-auto"
          style={{ minHeight: '480px' }}
        >
          {/* ---------------- ARROW 1: WRITE -> REVIEW (Top Arc) ---------------- */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-5 overflow-visible"
            viewBox="0 0 1200 560"
            fill="none"
            aria-hidden="true"
            style={{ opacity: arrow1Draw > 0.02 ? 1 : 0 }}
          >
            <defs>
              <marker
                id="circular-arrowhead"
                markerWidth="12"
                markerHeight="12"
                refX="7"
                refY="6"
                orient="auto"
              >
                <path
                  d="M 1 2 L 8 6 L 1 10"
                  stroke="#0B1421"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </marker>
            </defs>
            <path
              d={
                isRTL
                  ? 'M 795 145 Q 600 80 405 145' // RTL: Top-Right to Top-Left
                  : 'M 405 145 Q 600 80 795 145' // LTR: Top-Left to Top-Right
              }
              stroke="#0B1421"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#circular-arrowhead)"
              style={{
                strokeDasharray: 440,
                strokeDashoffset: (1 - arrow1Draw) * 440,
              }}
            />
          </svg>

          {/* ---------------- ARROW 2: REVIEW -> ROUTE (Side Arc) ---------------- */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-5 overflow-visible"
            viewBox="0 0 1200 560"
            fill="none"
            aria-hidden="true"
            style={{ opacity: arrow2Draw > 0.02 ? 1 : 0 }}
          >
            <path
              d={
                isRTL
                  ? 'M 225 236 C 130 245, 130 315, 225 324' // RTL: Left side swoop down
                  : 'M 975 236 C 1070 245, 1070 315, 975 324' // LTR: Right side swoop down
              }
              stroke="#0B1421"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#circular-arrowhead)"
              style={{
                strokeDasharray: 240,
                strokeDashoffset: (1 - arrow2Draw) * 240,
              }}
            />
          </svg>

          {/* ---------------- ARROW 3: ROUTE -> TRACK (Bottom Arc) ---------------- */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-5 overflow-visible"
            viewBox="0 0 1200 560"
            fill="none"
            aria-hidden="true"
            style={{ opacity: arrow3Draw > 0.02 ? 1 : 0 }}
          >
            <path
              d={
                isRTL
                  ? 'M 405 415 Q 600 480 795 415' // RTL: Bottom-Left to Bottom-Right
                  : 'M 795 415 Q 600 480 405 415' // LTR: Bottom-Right to Bottom-Left
              }
              stroke="#0B1421"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#circular-arrowhead)"
              style={{
                strokeDasharray: 440,
                strokeDashoffset: (1 - arrow3Draw) * 440,
              }}
            />
          </svg>

          {/* ---------------- CARD 1: WRITE ---------------- */}
          <div
            className="absolute w-[280px] xl:w-[300px] min-h-[170px] xl:min-h-[185px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card1X}px, ${card1Y}px, 0) scale(${card1EnterScale})`,
              opacity: card1Opacity,
              zIndex: 10,
              pointerEvents: card1Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[0].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
                {stepsData[0].desc}
              </p>
            </div>
          </div>

          {/* ---------------- CARD 2: REVIEW ---------------- */}
          <div
            className="absolute w-[280px] xl:w-[300px] min-h-[170px] xl:min-h-[185px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card2X}px, ${card2Y}px, 0) scale(${card2Scale})`,
              opacity: card2Opacity,
              zIndex: 10,
              pointerEvents: card2Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[1].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
                {stepsData[1].desc}
              </p>
            </div>
          </div>

          {/* ---------------- CARD 3: ROUTE ---------------- */}
          <div
            className="absolute w-[280px] xl:w-[300px] min-h-[170px] xl:min-h-[185px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card3X}px, ${card3Y}px, 0) scale(${card3Scale})`,
              opacity: card3Opacity,
              zIndex: 10,
              pointerEvents: card3Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[2].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
                {stepsData[2].desc}
              </p>
            </div>
          </div>

          {/* ---------------- CARD 4: TRACK ---------------- */}
          <div
            className="absolute w-[280px] xl:w-[300px] min-h-[170px] xl:min-h-[185px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
            style={{
              transform: `translate3d(${card4X}px, ${card4Y}px, 0) scale(${card4Scale})`,
              opacity: card4Opacity,
              zIndex: 10,
              pointerEvents: card4Opacity > 0.5 ? 'auto' : 'none',
            }}
          >
            <div>
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[3].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
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
            transform: `translate3d(0, ${mobileHeadingY}px, 0) scale(${mobileHeadingScale})`,
            transformOrigin: 'center center',
            transition: prefersReducedMotion ? 'none' : 'transform 100ms linear',
          }}
        >
          <h2 className="font-display text-4xl sm:text-5xl text-[#0B1421] uppercase tracking-tight">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        {/* Vertical Stack with Downward Vector Arrows */}
        <div className="flex flex-col items-center w-full">
          {stepsData.map((stg, index) => {
            // Progressive reveal on natural mobile scroll
            const threshold = 0.15 + index * 0.15;
            const arrowThreshold = threshold + 0.08;
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