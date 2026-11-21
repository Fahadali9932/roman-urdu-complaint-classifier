import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ComplaintJourneyProps {
  id?: string;
  /** Total height of the scroll runway in viewport units on desktop. Default: 260 */
  scrollTrackVh?: number;
}

// Ken Perlin quintic smootherstep ease (C^2 continuous: 0 velocity & acceleration at boundaries)
const smoother = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const ComplaintJourney: React.FC<ComplaintJourneyProps> = ({
  id = 'steps',
  scrollTrackVh = 260,
}) => {
  const { t, language, isRTL } = useLanguage();
  const containerRef = useRef<HTMLElement>(null);

  // Direct DOM element refs for 60fps transform scrub without React re-render storms
  const headingRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);
  const arrow1Ref = useRef<HTMLDivElement>(null);
  const arrow2Ref = useRef<HTMLDivElement>(null);
  const arrow3Ref = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const path3Ref = useRef<SVGPathElement>(null);

  // Cached layout metrics to avoid reading layout during scroll
  const layoutMetricsRef = useRef({
    containerTop: 0,
    containerHeight: 0,
    vh: 900,
    scrollableDistance: 1,
  });

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
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

  // Recalculate and cache layout geometry accurately
  const measureLayout = useCallback(() => {
    if (!containerRef.current) return;
    const vh = window.innerHeight;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const containerTop = rect.top + scrollY;
    const containerHeight = containerRef.current.offsetHeight;
    const scrollableDistance = Math.max(1, containerHeight - vh);

    layoutMetricsRef.current = {
      containerTop,
      containerHeight,
      vh,
      scrollableDistance,
    };
  }, []);

  // Subscribe to media queries and viewport resize
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mqMotion.addEventListener('change', handleMotion);

    const mqMobile = window.matchMedia('(max-width: 1023px)');
    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqMobile.addEventListener('change', handleMobile);

    const handleResize = () => {
      measureLayout();
    };
    window.addEventListener('resize', handleResize, { passive: true });
    measureLayout();

    return () => {
      mqMotion.removeEventListener('change', handleMotion);
      mqMobile.removeEventListener('change', handleMobile);
      window.removeEventListener('resize', handleResize);
    };
  }, [measureLayout]);

  // Apply motion frame directly to DOM nodes with zero React re-render overhead
  const applyMotionFrame = useCallback(
    (p: number) => {
      if (prefersReducedMotion) return;

      const dir = isRTL ? -1 : 1;
      const pitch = 155; // spacing unit (310px center-to-center)

      // =========================================================================
      // BACKGROUND LAYER: FULL-SCREEN MONUMENTAL "HOW IT WORKS" TYPOGRAPHY
      // Initial (p <= 0.08): 1.0 opacity, scale 1.0, dominates usable canvas
      // Scrolling (p > 0.08): Subdues smoothly to ~0.15 opacity, retains scale ~0.98
      // Does NOT shrink into a tiny title; remains monumental editorial background
      // =========================================================================
      const tHeadingRecede = smoother(clamp01((p - 0.06) / 0.16));
      const hScale = 1.0 - 0.03 * tHeadingRecede; // 1.0 -> 0.97 (retains monumental scale)
      const hOpacity = 1.0 - 0.85 * tHeadingRecede; // 1.0 -> 0.15
      const hY = 0; // perfectly centered, no arbitrary displacement

      if (headingRef.current) {
        headingRef.current.style.transform = `translate3d(0, ${hY}px, 0) scale(${hScale})`;
        headingRef.current.style.opacity = `${hOpacity}`;
      }

      // =========================================================================
      // FOREGROUND LAYER: CARDS & CONNECTORS CHOREOGRAPHY OVER THE HEADING
      // Harmonized intervals with perfectly matched entrance & translation pacing
      // =========================================================================

      // Stage 1: WRITE Entrance at Center (p: 0.08 -> 0.20)
      const tEnterWrite = smoother(clamp01((p - 0.08) / 0.12));
      const c1Opacity = tEnterWrite;
      const c1Scale = 0.92 + 0.08 * tEnterWrite;

      // Stage 2: WRITE shifts left, Arrow 1 draws, REVIEW enters (p: 0.20 -> 0.36)
      const tShift1 = smoother(clamp01((p - 0.20) / 0.16));
      const tDraw1 = smoother(clamp01((p - 0.21) / 0.14));
      const tEnterReview = smoother(clamp01((p - 0.22) / 0.14));
      const c2Opacity = tEnterReview;
      const c2Scale = 0.92 + 0.08 * tEnterReview;

      // Stage 3: Stations shift left, Arrow 2 draws, ROUTE enters (p: 0.36 -> 0.52)
      const tShift2 = smoother(clamp01((p - 0.36) / 0.16));
      const tDraw2 = smoother(clamp01((p - 0.37) / 0.14));
      const tEnterRoute = smoother(clamp01((p - 0.38) / 0.14));
      const c3Opacity = tEnterRoute;
      const c3Scale = 0.92 + 0.08 * tEnterRoute;

      // Stage 4: Stations shift left, Arrow 3 draws, TRACK enters (p: 0.52 -> 0.68)
      const tShift3 = smoother(clamp01((p - 0.52) / 0.16));
      const tDraw3 = smoother(clamp01((p - 0.53) / 0.14));
      const tEnterTrack = smoother(clamp01((p - 0.54) / 0.14));
      const c4Opacity = tEnterTrack;
      const c4Scale = 0.92 + 0.08 * tEnterTrack;

      // Card X coordinates
      const c1X_raw = 0 - pitch * tShift1 - pitch * tShift2 - pitch * tShift3;
      const c2X_raw = pitch - pitch * tShift2 - pitch * tShift3;
      const c3X_raw = pitch * 2 - pitch * tShift3;
      const c4X_raw = pitch * 3;

      const c1X = c1X_raw * dir;
      const c2X = c2X_raw * dir;
      const c3X = c3X_raw * dir;
      const c4X = c4X_raw * dir;

      // Arrow connectors centered between stations
      const a1X = (c1X + c2X) / 2;
      const a2X = (c2X + c3X) / 2;
      const a3X = (c3X + c4X) / 2;

      // Apply transforms and opacities directly
      if (card1Ref.current) {
        card1Ref.current.style.transform = `translate3d(calc(-50% + ${c1X}px), -50%, 0) scale(${c1Scale})`;
        card1Ref.current.style.opacity = `${c1Opacity}`;
        card1Ref.current.style.pointerEvents = c1Opacity > 0.5 ? 'auto' : 'none';
      }

      if (card2Ref.current) {
        card2Ref.current.style.transform = `translate3d(calc(-50% + ${c2X}px), -50%, 0) scale(${c2Scale})`;
        card2Ref.current.style.opacity = `${c2Opacity}`;
        card2Ref.current.style.pointerEvents = c2Opacity > 0.5 ? 'auto' : 'none';
      }

      if (card3Ref.current) {
        card3Ref.current.style.transform = `translate3d(calc(-50% + ${c3X}px), -50%, 0) scale(${c3Scale})`;
        card3Ref.current.style.opacity = `${c3Opacity}`;
        card3Ref.current.style.pointerEvents = c3Opacity > 0.5 ? 'auto' : 'none';
      }

      if (card4Ref.current) {
        card4Ref.current.style.transform = `translate3d(calc(-50% + ${c4X}px), -50%, 0) scale(${c4Scale})`;
        card4Ref.current.style.opacity = `${c4Opacity}`;
        card4Ref.current.style.pointerEvents = c4Opacity > 0.5 ? 'auto' : 'none';
      }

      if (arrow1Ref.current) {
        arrow1Ref.current.style.transform = `translate3d(calc(-50% + ${a1X}px), -50%, 0)`;
        arrow1Ref.current.style.opacity = tDraw1 > 0 ? '1' : '0';
      }
      if (path1Ref.current) {
        path1Ref.current.style.strokeDashoffset = `${(1 - tDraw1) * 95}`;
      }

      if (arrow2Ref.current) {
        arrow2Ref.current.style.transform = `translate3d(calc(-50% + ${a2X}px), -50%, 0)`;
        arrow2Ref.current.style.opacity = tDraw2 > 0 ? '1' : '0';
      }
      if (path2Ref.current) {
        path2Ref.current.style.strokeDashoffset = `${(1 - tDraw2) * 95}`;
      }

      if (arrow3Ref.current) {
        arrow3Ref.current.style.transform = `translate3d(calc(-50% + ${a3X}px), -50%, 0)`;
        arrow3Ref.current.style.opacity = tDraw3 > 0 ? '1' : '0';
      }
      if (path3Ref.current) {
        path3Ref.current.style.strokeDashoffset = `${(1 - tDraw3) * 95}`;
      }
    },
    [isRTL, prefersReducedMotion]
  );

  // Authoritative RAF scroll listener with buttery smooth damping
  const handleScroll = useCallback(() => {
    // Mobile has its own native sticky cards. Do not run the desktop RAF
    // damping loop or even attach its scroll handler on touch-sized screens.
    if (prefersReducedMotion || isMobile) return;

    const scrollY = window.scrollY;
    const { containerTop, scrollableDistance } = layoutMetricsRef.current;

    if (!isMobile) {
      const currentScroll = scrollY - containerTop;
      // Complete the card sequence shortly before the next physical sheet
      // arrives, retaining a compact runway for the stacked transition.
      const animDistance = Math.max(1, scrollableDistance * 0.88);
      const rawProgress = currentScroll / animDistance;
      const clamped = Math.max(0, Math.min(1, rawProgress));
      targetProgressRef.current = clamped;

      if (rafId.current === null) {
        const updateMotion = () => {
          const target = targetProgressRef.current;
          const current = currentProgressRef.current;
          const diff = target - current;

          if (Math.abs(diff) <= 0.0008) {
            currentProgressRef.current = target;
            applyMotionFrame(target);
            rafId.current = null;
            return;
          }

          // Responsive tracking: 0.40 eliminates scroll lag and prevents excessive post-scroll drift
          const next = current + diff * 0.40;
          currentProgressRef.current = next;
          applyMotionFrame(next);
          rafId.current = requestAnimationFrame(updateMotion);
        };

        rafId.current = requestAnimationFrame(updateMotion);
      }
    }
  }, [applyMotionFrame, isMobile, prefersReducedMotion]);

  useEffect(() => {
    measureLayout();

    if (prefersReducedMotion || isMobile) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial position evaluation
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [handleScroll, isMobile, measureLayout, prefersReducedMotion]);

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

  return (
    <section
      id={id}
      ref={containerRef}
      className="relative w-full border-t border-[#E5E3E0] bg-[#F7F6F3] text-[#141414] scroll-mt-20 sm:scroll-mt-24 select-none"
      style={{
        minHeight: prefersReducedMotion || isMobile ? 'auto' : `${scrollTrackVh}vh`,
      }}
      aria-label={t('processHeading') || 'How It Works'}
    >
      {/* ========================================================
          DESKTOP FULL-SCREEN STAGE (>= 1024px)
          Monumental Background Heading with Foreground Stations
          Layered directly OVER the massive typography
          ======================================================== */}
      <div
        className={`hidden lg:flex w-full flex-col justify-center items-center px-4 sm:px-10 lg:px-16 xl:px-20 overflow-hidden ${
          prefersReducedMotion ? 'relative py-24 sm:py-32' : 'sticky top-0 h-screen'
        }`}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center">

          {/* ----------------------------------------------------
              LAYER 0 (BACKGROUND): FULL-SCREEN MONUMENTAL TYPOGRAPHY
              Two deliberate stacked lines: "HOW IT" / "WORKS"
              Dominates usable canvas horizontally & vertically
              Without covering navbar and without clipping
              ---------------------------------------------------- */}
          {prefersReducedMotion ? (
            <div className="mb-14 text-center">
              <h2 className="font-display text-5xl xl:text-6xl text-[#141414] uppercase tracking-tight leading-tight">
                {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
              </h2>
            </div>
          ) : (
            <div
              ref={headingRef}
              className="absolute inset-0 flex items-center justify-center text-center will-change-transform z-10 pointer-events-none px-4 sm:px-8 xl:px-12"
              style={{
                transformOrigin: 'center center',
                transform: 'translate3d(0, 0, 0) scale(1)',
                opacity: 1,
              }}
            >
              <h2
                className="font-display font-black text-[#141414] uppercase tracking-[-0.045em] leading-[0.82] select-none text-center w-full max-w-[1400px]"
                style={{
                  fontSize: 'clamp(140px, min(22vw, 34vh), 290px)',
                }}
              >
                {language === 'ur' ? (
                  <>
                    <span className="block">طریقہ</span>
                    <span className="block">کار</span>
                  </>
                ) : (
                  <>
                    <span className="block">HOW IT</span>
                    <span className="block">WORKS</span>
                  </>
                )}
              </h2>
            </div>
          )}

          {/* ----------------------------------------------------
              LAYER 1 (FOREGROUND): REFINED TYPOGRAPHIC PROCESS STATIONS
              Process stations enter and animate directly OVER the
              monumental background heading
              ---------------------------------------------------- */}
          <div
            className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-center min-h-[200px]"
            style={{ perspective: '1200px' }}
          >
            {/* ---------------- STATION 1: WRITE ---------------- */}
            <div
              ref={card1Ref}
              className="absolute w-[230px] xl:w-[250px] min-h-[160px] p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] shadow-sm flex flex-col justify-between will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${-155 * 3 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(-50%, -50%, 0) scale(0.92)',
                opacity: prefersReducedMotion ? 1 : 0,
                pointerEvents: prefersReducedMotion ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.75rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[0].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-3 leading-relaxed font-normal">
                  {stepsData[0].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 1: WRITE -> REVIEW ---------------- */}
            <div
              ref={arrow1Ref}
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-15"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${-155 * 2 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(-50%, -50%, 0)',
                opacity: prefersReducedMotion ? 1 : 0,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  ref={path1Ref}
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
                    strokeDashoffset: prefersReducedMotion ? 0 : 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 2: REVIEW ---------------- */}
            <div
              ref={card2Ref}
              className="absolute w-[230px] xl:w-[250px] min-h-[160px] p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] shadow-sm flex flex-col justify-between will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${-155 * 1 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(calc(-50% + 155px), -50%, 0) scale(0.92)',
                opacity: prefersReducedMotion ? 1 : 0,
                pointerEvents: prefersReducedMotion ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.75rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[1].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-3 leading-relaxed font-normal">
                  {stepsData[1].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 2: REVIEW -> ROUTE ---------------- */}
            <div
              ref={arrow2Ref}
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-15"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + 0px), -50%, 0)`
                  : 'translate3d(calc(-50% + 155px), -50%, 0)',
                opacity: prefersReducedMotion ? 1 : 0,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  ref={path2Ref}
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
                    strokeDashoffset: prefersReducedMotion ? 0 : 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 3: ROUTE ---------------- */}
            <div
              ref={card3Ref}
              className="absolute w-[230px] xl:w-[250px] min-h-[160px] p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] shadow-sm flex flex-col justify-between will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${155 * 1 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(calc(-50% + 310px), -50%, 0) scale(0.92)',
                opacity: prefersReducedMotion ? 1 : 0,
                pointerEvents: prefersReducedMotion ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.75rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[2].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-3 leading-relaxed font-normal">
                  {stepsData[2].desc}
                </p>
              </div>
            </div>

            {/* ---------------- ARROW 3: ROUTE -> TRACK ---------------- */}
            <div
              ref={arrow3Ref}
              className="absolute flex items-center justify-center pointer-events-none will-change-transform z-15"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${155 * 2 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(calc(-50% + 310px), -50%, 0)',
                opacity: prefersReducedMotion ? 1 : 0,
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 64 24" className="w-12 xl:w-14 h-6 overflow-visible" fill="none">
                <path
                  ref={path3Ref}
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
                    strokeDashoffset: prefersReducedMotion ? 0 : 95,
                  }}
                />
              </svg>
            </div>

            {/* ---------------- STATION 4: TRACK ---------------- */}
            <div
              ref={card4Ref}
              className="absolute w-[230px] xl:w-[250px] min-h-[160px] p-6 rounded-xl bg-[#FAF9F7] border border-[#E5E3E0] shadow-sm flex flex-col justify-between will-change-transform text-start"
              style={{
                left: '50%',
                top: '50%',
                transform: prefersReducedMotion
                  ? `translate3d(calc(-50% + ${155 * 3 * (isRTL ? -1 : 1)}px), -50%, 0)`
                  : 'translate3d(calc(-50% + 465px), -50%, 0) scale(0.92)',
                opacity: prefersReducedMotion ? 1 : 0,
                pointerEvents: prefersReducedMotion ? 'auto' : 'none',
              }}
            >
              <div>
                <div className="w-6 h-0.5 bg-[#681822] mb-3" />
                <h3 className="font-display text-2xl xl:text-[1.75rem] text-[#141414] tracking-tight uppercase leading-none">
                  {stepsData[3].title}
                </h3>
                <p className="font-ui text-xs xl:text-sm text-[#323232] mt-3 leading-relaxed font-normal">
                  {stepsData[3].desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile uses native overlapping sticky sheets: close spacing, no JS
          scroll hijacking, and a tiny optional CSS-only arrival motion. */}
      <div className="lg:hidden w-full px-3 pb-8 sm:px-6 sm:pb-12">
        <div className="flex items-center justify-center px-4 pb-8 pt-20 text-center sm:pb-12 sm:pt-24">
          <h2 className="font-display text-[clamp(2.5rem,10vw,4.4rem)] text-[#141414] uppercase tracking-tight leading-[0.95]">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>
        <div className="relative isolate">
          {stepsData.map((step, index) => (
            <article
              key={step.key}
              data-mobile-journey-stage={step.key}
              style={{ zIndex: index + 1 }}
              className={`mobile-journey-stage relative ${prefersReducedMotion ? 'mb-5' : 'min-h-[92svh] -mt-[18svh] first:mt-0 last:min-h-[78svh]'}`}
            >
              <div className={`mobile-journey-card ${prefersReducedMotion ? 'relative min-h-[280px]' : 'sticky top-[76px] h-[clamp(345px,65svh,555px)]'} flex w-full flex-col overflow-hidden rounded-[24px] border border-[#DCD5CF] bg-[#FAF9F7] p-6 shadow-[0_-12px_32px_rgba(24,13,14,0.12)] sm:p-9`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#681822]">
                    {language === 'ur' ? 'مرحلہ' : 'Step'} {String(index + 1).padStart(2, '0')}
                  </p>
                  <span className="text-xs font-semibold tabular-nums text-[#746A64]">{index + 1} / {stepsData.length}</span>
                </div>
                <div className="flex flex-1 flex-col justify-center py-7 sm:py-10">
                  <div className="mb-5 h-1 w-12 rounded-full bg-[#681822]" aria-hidden="true" />
                  <h3 className="font-display text-[clamp(2.8rem,12.5vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] text-[#1B1717]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-prose text-base font-medium leading-relaxed text-[#3A3230] sm:text-xl">{step.desc}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#DFD6D0] pt-4 text-xs font-semibold text-[#635953]">
                  <span>{index === stepsData.length - 1
                    ? (language === 'ur' ? 'اب شکایت درج کریں' : 'Ready to report an issue')
                    : `${language === 'ur' ? 'اگلا' : 'Next'}: ${stepsData[index + 1].title}`}</span>
                  {index !== stepsData.length - 1 && <ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComplaintJourney;
