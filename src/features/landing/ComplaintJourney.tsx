import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ComplaintJourneyProps {
  id?: string;
}

export const ComplaintJourney: React.FC<ComplaintJourneyProps> = ({ id = 'steps' }) => {
  const { t, language, isRTL } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Animation step: 0 to 7
  // 1: Card 1 visible
  // 2: Arrow 1 drawn
  // 3: Card 2 visible
  // 4: Arrow 2 drawn
  // 5: Card 3 visible
  // 6: Arrow 3 drawn
  // 7: Card 4 visible (All complete)
  const [activeStep, setActiveStep] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 7;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 7 : 0;
  });

  // Subscribe to prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setActiveStep(7);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // IntersectionObserver to trigger the sequential reveal
  useEffect(() => {
    if (prefersReducedMotion || activeStep >= 7) return;
    const el = sectionRef.current;
    if (!el) return;

    let timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Staggered sequence: Card 1 -> Arrow 1 -> Card 2 -> Arrow 2 -> Card 3 -> Arrow 3 -> Card 4
          const schedule = [
            { step: 1, delay: 50 },    // Write Card
            { step: 2, delay: 380 },   // Arrow 1
            { step: 3, delay: 780 },   // Review Card
            { step: 4, delay: 1100 },  // Arrow 2
            { step: 5, delay: 1500 },  // Route Card
            { step: 6, delay: 1820 },  // Arrow 3
            { step: 7, delay: 2220 },  // Track Card
          ];

          timers = schedule.map(({ step, delay }) =>
            setTimeout(() => {
              setActiveStep((prev) => Math.max(prev, step));
            }, delay)
          );

          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(el);

    // Safety fallback: if citizen scrolls fast, ensure all cards are revealed
    const handleScroll = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.4) {
        setActiveStep(7);
        window.removeEventListener('scroll', handleScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      timers.forEach((tId) => clearTimeout(tId));
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prefersReducedMotion, activeStep]);

  // Process cards data
  const steps = [
    {
      key: 'write',
      title: t('processStepWriteTitle') || (language === 'ur' ? 'لکھیں' : 'Write'),
      desc: t('processStepWriteDesc') || (language === 'ur' ? 'اپنا مسئلہ بیان کریں۔' : 'Describe the issue.'),
      cardStepThreshold: 1,
      arrowStepThreshold: 2,
    },
    {
      key: 'review',
      title: t('processStepReviewTitle') || (language === 'ur' ? 'جائزہ لیں' : 'Review'),
      desc: t('processStepReviewDesc') || (language === 'ur' ? 'تفصیلات کی تصدیق کریں۔' : 'Check the details.'),
      cardStepThreshold: 3,
      arrowStepThreshold: 4,
    },
    {
      key: 'route',
      title: t('processStepRouteTitle') || (language === 'ur' ? 'تفویض' : 'Route'),
      desc: t('processStepRouteDesc') || (language === 'ur' ? 'متعلقہ محکمے کی نشاندہی۔' : 'Identify the right department.'),
      cardStepThreshold: 5,
      arrowStepThreshold: 6,
    },
    {
      key: 'track',
      title: t('processStepTrackTitle') || (language === 'ur' ? 'ٹریک کریں' : 'Track'),
      desc: t('processStepTrackDesc') || (language === 'ur' ? 'پیش رفت پر نظر رکھیں۔' : 'Follow the progress.'),
      cardStepThreshold: 7,
      arrowStepThreshold: null,
    },
  ];

  return (
    <section
      id={id}
      ref={sectionRef}
      className="py-20 sm:py-28 lg:py-32 px-4 sm:px-10 lg:px-16 xl:px-20 border-t border-[#34394A]/15 bg-[#E9EBED] relative scroll-mt-28 sm:scroll-mt-32 text-start"
      aria-label={t('processHeading') || 'How It Works'}
    >
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Clean, authoritative section heading */}
        <div className="mb-14 sm:mb-20">
          <h2 className="font-display text-3xl sm:text-5xl text-[#0B1421] uppercase tracking-tight">
            {t('processHeading') || (language === 'ur' ? 'طریقہ کار' : 'How It Works')}
          </h2>
        </div>

        {/* ========================================================
            DESKTOP HORIZONTAL PROCESS FLOW (>= 1024px)
            Four minimal cards connected by thick horizontal vector arrows
            ======================================================== */}
        <div className="hidden lg:flex items-center justify-between gap-3 xl:gap-4 w-full">
          {steps.map((stg, index) => {
            const isCardVisible = prefersReducedMotion || activeStep >= stg.cardStepThreshold;
            const isArrowDrawn = stg.arrowStepThreshold
              ? prefersReducedMotion || activeStep >= stg.arrowStepThreshold
              : false;

            return (
              <React.Fragment key={stg.key}>
                {/* Minimal Process Card */}
                <div
                  className={`flex-1 min-w-[200px] max-w-[240px] p-6 xl:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-sm hover:border-[#0B1421]/30 hover:shadow-md transition-all duration-500 ease-out flex flex-col justify-between ${
                    isCardVisible
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                  style={{ minHeight: '160px' }}
                >
                  <div>
                    <h3 className="font-display text-2xl xl:text-3xl text-[#0B1421] tracking-tight uppercase">
                      {stg.title}
                    </h3>
                    <p className="font-ui text-sm text-[#535965] mt-2.5 leading-relaxed">
                      {stg.desc}
                    </p>
                  </div>
                </div>

                {/* Thick Vector Arrow Connector */}
                {index < steps.length - 1 && (
                  <div className="shrink-0 flex items-center justify-center px-1 xl:px-2" aria-hidden="true">
                    <svg
                      viewBox="0 0 64 24"
                      className="w-10 xl:w-14 h-6 overflow-visible"
                      fill="none"
                    >
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
                          strokeDashoffset: isArrowDrawn ? 0 : 95,
                          transition: prefersReducedMotion
                            ? 'none'
                            : 'stroke-dashoffset 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ========================================================
            MOBILE / TABLET VERTICAL PROCESS FLOW (< 1024px)
            Four minimal cards connected by thick downward vector arrows
            ======================================================== */}
        <div className="lg:hidden flex flex-col items-center w-full max-w-md mx-auto">
          {steps.map((stg, index) => {
            const isCardVisible = prefersReducedMotion || activeStep >= stg.cardStepThreshold;
            const isArrowDrawn = stg.arrowStepThreshold
              ? prefersReducedMotion || activeStep >= stg.arrowStepThreshold
              : false;

            return (
              <React.Fragment key={stg.key}>
                {/* Minimal Process Card */}
                <div
                  className={`w-full p-6 sm:p-7 rounded-2xl bg-white border border-[#34394A]/15 shadow-sm transition-all duration-500 ease-out text-start ${
                    isCardVisible
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <h3 className="font-display text-2xl sm:text-3xl text-[#0B1421] tracking-tight uppercase">
                    {stg.title}
                  </h3>
                  <p className="font-ui text-sm sm:text-base text-[#535965] mt-2 leading-relaxed">
                    {stg.desc}
                  </p>
                </div>

                {/* Thick Downward Vector Arrow Connector */}
                {index < steps.length - 1 && (
                  <div className="py-2.5 sm:py-3.5 flex items-center justify-center" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 56"
                      className="w-5 sm:w-6 h-10 sm:h-12 overflow-visible"
                      fill="none"
                    >
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
