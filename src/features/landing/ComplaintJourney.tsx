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
      // Natural scroll progress on mobile (< 1024px)
      const mobDistance = vh + container.offsetHeight * 0.5;
      const currentMob = vh - rect.top;
      const mobRaw = mobDistance > 0 ? currentMob / mobDistance : 1;
      setMobileProgress(Math.max(0, Math.min(1, mobRaw)));
    } else {
      targetProgressRef.current = clamped;

      // Start RAF interpolation loop if not already running
      if (rafId.current === null) {
        const updateMotion = () => {
          const target = targetProgressRef.current;
          const current = currentProgressRef.current;
          const diff = target - current;

          // If difference is imperceptible, snap to target and stop loop
          if (Math.abs(diff) <= 0.0002) {
            currentProgressRef.current = target;
            setProgress(target);
            rafId.current = null;
            return;
          }

          // Damping factor: 0.18 provides ~0.4s buttery smooth inertia without lag
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

    // Initial sync
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

  // Ken Perlin quintic smootherstep ease (C^2 continuous: zero velocity & zero acceleration at boundaries)
  const smoother = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return c * c * c * (c * (c * 6 - 15) + 10);
  };
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // =========================================================================
  // TASK 1, 2, 4: UNIFIED CENTRAL COMPOSITION & DYNAMIC CENTERING
  // Treat settled heading and 4-card sequence as ONE cohesive visual block.
  // The combined composition is centered vertically in the usable viewport
  // below the floating navbar, with a subtle optical lift (~20px).
  // Initial massive heading (138px) starts at optical center of usable canvas
  // and smoothly glides to its position within the composition as scrolling begins.
  // =========================================================================
  const navBottom = 80;
  const usableHeight = windowHeight - navBottom;
  const usableMidpoint = navBottom + usableHeight / 2;

  // The composition wrapper is vertically centered in the sticky container
  const stickyTop = 96;
  const stickyHeight = windowHeight - stickyTop;
  const compHeight = 138 + 44 + 190; // heading box (138) + margin (44) + card stage (190)
  const opticalLift = Math.round(windowHeight * 0.022); // subtle ~20px optical lift
  const compTopInSticky = Math.max(20, (stickyHeight - compHeight) / 2 - opticalLift);
  const settledHeadingCenterY = stickyTop + compTopInSticky + 69;

  // Exact downward translation needed for initial massive heading to align with usable canvas midpoint
  const desktopHeadingCenterY = Math.max(80, usableMidpoint - settledHeadingCenterY + 24);

  // Smooth, deliberate shrink & upward glide allocated over 22% of total journey (p: 0.03 -> 0.25)
  // Final scale 0.61 gives ~84px rendered font size on 1440px desktop (within 78-88px target)
  const tHeading = smoother(clamp01((progress - 0.03) / 0.22));
  const desktopHeadingScale = prefersReducedMotion ? 0.61 : 1.0 - tHeading * (1.0 - 0.61);
  const desktopHeadingY = prefersReducedMotion ? 0 : desktopHeadingCenterY * (1 - tHeading);

  // =========================================================================
  // TASK 3, 4, 5, 6, 7: SMOOTH & DELIBERATELY PACED LINEAR HORIZONTAL TRAIN
  // Stage A (p: 0.00 -> 0.03): Massive heading centered; user takes in the visual
  // Stage B (p: 0.03 -> 0.25): Heading smoothly shrinks (1.0 -> 0.48) & glides upward
  // Stage C (p: 0.24 -> 0.36): WRITE enters at stage center (0, 0)
  // Stage D (p: 0.38 -> 0.54): WRITE shifts to -150px, Arrow 1 draws, REVIEW enters at +150px
  // Stage E (p: 0.56 -> 0.72): Cards shift left by 150px, Arrow 2 draws, ROUTE enters at +300px
  // Stage F (p: 0.74 -> 0.90): Cards shift left by 150px, Arrow 3 draws, TRACK enters at +450px
  // Stage G (p: 0.90 -> 1.00): Completed 4-card sequence held before natural scroll release
  // =========================================================================

  // Stage C: WRITE Entrance at Center (0.24 -> 0.36)
  const tEnterWrite = smoother(clamp01((progress - 0.24) / 0.12));
  const card1Opacity = prefersReducedMotion ? 1 : tEnterWrite;
  const card1Scale = prefersReducedMotion ? 1 : 0.94 + 0.06 * tEnterWrite;

  // Stage D: WRITE shifts 0 -> -150px (0.38 -> 0.50)
  const tShiftD = smoother(clamp01((progress - 0.38) / 0.12));
  // Arrow 1 draws from WRITE right edge to REVIEW left edge (0.41 -> 0.51)
  const tDrawArrow1 = smoother(clamp01((progress - 0.41) / 0.10));
  const arrow1Draw = prefersReducedMotion ? 1 : tDrawArrow1;
  // REVIEW enters at +150px (0.44 -> 0.54)
  const tEnterReview = smoother(clamp01((progress - 0.44) / 0.10));
  const card2Opacity = prefersReducedMotion ? 1 : tEnterReview;
  const card2Scale = prefersReducedMotion ? 1 : 0.94 + 0.06 * tEnterReview;

  // Stage E: Cards shift left by 150px (0.56 -> 0.68)
  const tShiftE = smoother(clamp01((progress - 0.56) / 0.12));
  // Arrow 2 draws from REVIEW right edge to ROUTE left edge (0.59 -> 0.69)
  const tDrawArrow2 = smoother(clamp01((progress - 0.59) / 0.10));
  const arrow2Draw = prefersReducedMotion ? 1 : tDrawArrow2;
  // ROUTE enters at +300px (0.62 -> 0.72)
  const tEnterRoute = smoother(clamp01((progress - 0.62) / 0.10));
  const card3Opacity = prefersReducedMotion ? 1 : tEnterRoute;
  const card3Scale = prefersReducedMotion ? 1 : 0.94 + 0.06 * tEnterRoute;

  // Stage F: Cards shift left by 150px (0.74 -> 0.86)
  const tShiftF = smoother(clamp01((progress - 0.74) / 0.12));
  // Arrow 3 draws from ROUTE right edge to TRACK left edge (0.77 -> 0.87)
  const tDrawArrow3 = smoother(clamp01((progress - 0.77) / 0.10));
  const arrow3Draw = prefersReducedMotion ? 1 : tDrawArrow3;
  // TRACK enters at +450px (0.80 -> 0.90)
  const tEnterTrack = smoother(clamp01((progress - 0.80) / 0.10));
  const card4Opacity = prefersReducedMotion ? 1 : tEnterTrack;
  const card4Scale = prefersReducedMotion ? 1 : 0.94 + 0.06 * tEnterTrack;

  // Card Center X Coordinates (Analytical, continuous, locked to card pitch)
  const dir = isRTL ? -1 : 1;
  const c1X_raw = 0 - 150 * tShiftD - 150 * tShiftE - 150 * tShiftF;
  const c2X_raw = 150 - 150 * tShiftE - 150 * tShiftF;
  const c3X_raw = 300 - 150 * tShiftF;
  const c4X_raw = 450;

  const card1X = prefersReducedMotion ? -450 * dir : c1X_raw * dir;
  const card2X = prefersReducedMotion ? -150 * dir : c2X_raw * dir;
  const card3X = prefersReducedMotion ? 150 * dir : c3X_raw * dir;
  const card4X = prefersReducedMotion ? 450 * dir : c4X_raw * dir;

  // Vector Arrow Connectors (Dynamically locked to midpoints between consecutive cards)
  const arrow1X = (card1X + card2X) / 2;
  const arrow2X = (card2X + card3X) / 2;
  const arrow3X = (card3X + card4X) / 2;

  // =========================================================================
  // MOBILE HEADING CENTERING & UPWARD MOTION (< 1024px)
  // =========================================================================
  const mobileHeadingCenterY = Math.max(100, Math.min(220, (windowHeight - 200) / 2));
  const tMobileHeadUp = smoother(clamp01(mobileProgress / 0.20));
  const mobileHeadingScale = prefersReducedMotion ? 0.78 : 1.0 - tMobileHeadUp * (1.0 - 0.78);
  const mobileHeadingY = prefersReducedMotion ? 0 : mobileHeadingCenterY * (1 - tMobileHeadUp);

  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#34394A]/15 bg-[#E9EBED] scroll-mt-28 sm:scroll-mt-32 select-none"
      style={{
        // Desktop: ~380vh bounded scroll scene for fluid, deliberately paced cinematic motion
        // Mobile: natural height with smooth scroll progression and zero empty space
        minHeight: prefersReducedMotion || isMobile ? 'auto' : '380vh',
      }}
      aria-label={t('processHeading') || 'How It Works'}
    >
      {/* ========================================================
          DESKTOP FULL-SCREEN PINNED STAGE (>= 1024px)
          Occupies full viewport beneath navbar, massive heading
          shrinks & moves up, cards animate in linear horizontal train,
          releasing cleanly into footer/next section
          ======================================================== */}
      <div
        className={`hidden lg:flex w-full flex-col justify-center items-center px-4 sm:px-10 lg:px-16 xl:px-20 overflow-hidden ${
          prefersReducedMotion
            ? 'relative py-20 sm:py-28'
            : 'sticky top-20 sm:top-24 h-[calc(100vh-5rem)] sm:h-[calc(100vh-6rem)]'
        }`}
      >
        {/* Unified Composition Group — Centered in the usable viewport with subtle optical lift */}
        <div
          className="w-full max-w-6xl mx-auto flex flex-col items-center"
          style={{
            transform: prefersReducedMotion ? 'none' : `translate3d(0, -${opticalLift}px, 0)`,
          }}
        >
          {/* Prominent, authoritative section heading */}
          {/* Massive & centered in usable viewport; smoothly shrinks & glides upward on scroll */}
          <div
            className="max-w-7xl mx-auto w-full text-center will-change-transform z-20 pointer-events-none"
            style={{
              transform: `translate3d(0, ${desktopHeadingY}px, 0) scale(${desktopHeadingScale})`,
              transformOrigin: 'center center',
            }}
          >
            <h2 className="font-display text-[76px] sm:text-[104px] lg:text-[124px] xl:text-[138px] text-[#0B1421] uppercase tracking-tight leading-none whitespace-normal lg:whitespace-nowrap">
              {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
            </h2>
          </div>

          {/* Central Linear Horizontal Stage — Unified composition ~78px visual gap below settled heading */}
          <div
            className="relative w-full max-w-6xl mx-auto flex items-center justify-center min-h-[185px] xl:min-h-[195px] will-change-transform mt-10 xl:mt-11"
            style={{ perspective: '1200px' }}
          >
          {/* ---------------- CARD 1: WRITE ---------------- */}
          <div
            className="absolute w-[230px] xl:w-[250px] min-h-[165px] xl:min-h-[175px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
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
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[0].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
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
            className="absolute w-[230px] xl:w-[250px] min-h-[165px] xl:min-h-[175px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
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
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[1].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
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
            className="absolute w-[230px] xl:w-[250px] min-h-[165px] xl:min-h-[175px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
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
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[2].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
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
            className="absolute w-[230px] xl:w-[250px] min-h-[165px] xl:min-h-[175px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-md shadow-[#0B1421]/05 flex flex-col justify-between transition-shadow will-change-transform text-start"
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
              <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                {stepsData[3].title}
              </h3>
              <p className="font-ui text-sm xl:text-base text-[#535965] mt-2 leading-relaxed">
                {stepsData[3].desc}
              </p>
            </div>
          </div>
        </div>
      </div>
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
            const threshold = 0.12 + index * 0.16;
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