import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { LocalizedInfoDocument } from '../types';
import { CinematicInfoSection } from './CinematicInfoSection';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CinematicInfoLayoutProps {
  content: {
    en: LocalizedInfoDocument;
    ur: LocalizedInfoDocument;
  };
  documentTitle: string;
}

export const CinematicInfoLayout: React.FC<CinematicInfoLayoutProps> = ({
  content,
  documentTitle,
}) => {
  const { language, isRTL } = useLanguage();
  const doc = content[language] || content.en;
  const ur = language === 'ur';

  const [scrollY, setScrollY] = useState(0);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Synchronize browser document title
  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  // Reduced motion media query listener
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', updateMotion);
    return () => mediaQuery.removeEventListener('change', updateMotion);
  }, []);

  // Restore top scroll position or scroll to hash anchor on mount/change
  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'instant' : 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [doc.title, prefersReducedMotion]);

  // Track scroll position for hero title motion
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || window.pageYOffset || 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-driven hero title kinematics
  // Proportional travel: shifts upward smoothly and fades gracefully as user scrolls
  const titleShift = prefersReducedMotion ? 0 : Math.min(50, scrollY * 0.16);
  const titleOpacity = prefersReducedMotion ? 1 : Math.max(0.2, 1 - scrollY / 360);
  const titleScale = prefersReducedMotion ? 1 : Math.max(0.95, 1 - (scrollY / 360) * 0.05);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative w-full bg-[#141414] text-[#F7F6F3] overflow-x-clip selection:bg-[#681822] selection:text-white"
    >
      {/* ========================================================
          BACKGROUND LAYER: Architectural Atmosphere (Region A)
          Gracefully fades to serene #141414 before the reading zone
          ======================================================== */}
      <div
        className="absolute top-0 inset-x-0 h-[65vh] min-h-[480px] pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <picture>
          <source media="(max-width: 768px)" srcSet={mazarMobile} />
          <img
            src={mazarDesktop}
            alt=""
            className="w-full h-full object-cover object-[center_20%] sm:object-[center_24%] opacity-35 sm:opacity-40 select-none pointer-events-none"
            loading="eager"
            decoding="async"
          />
        </picture>

        {/* Soft Radial Vignette for Title Focus */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 35%, rgba(20,20,20,0.2) 0%, rgba(20,20,20,0.7) 60%, #141414 100%)',
          }}
        />

        {/* Vertical Fade to Quiet #141414 for Pure Reading Comfort */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(20,20,20,0.75) 0%, rgba(20,20,20,0.15) 25%, rgba(20,20,20,0.65) 65%, #141414 95%, #141414 100%)',
          }}
        />
      </div>

      {/* ========================================================
          REGION A — CINEMATIC INTRODUCTION
          Atmospheric architectural scene with prominent title
          ======================================================== */}
      <section
        className="relative z-10 w-full flex flex-col justify-center items-center text-center px-6 sm:px-10 lg:px-12 pt-32 sm:pt-36 pb-12 sm:pb-16"
        aria-labelledby="cinematic-page-title"
      >
        <div
          style={{
            transform: `translateY(-${titleShift}px) scale(${titleScale})`,
            opacity: titleOpacity,
            willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
          }}
          className="max-w-4xl mx-auto space-y-4 transition-transform ease-out duration-75"
        >
          {/* Main Title in Fluid Heavy Display Font */}
          <h1
            id="cinematic-page-title"
            tabIndex={-1}
            className={`font-display font-black tracking-tight text-white uppercase outline-none select-none ${
              ur
                ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight'
                : doc.title.length > 15
                  ? 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.98]'
                  : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]'
            }`}
          >
            {doc.title}
          </h1>

          {/* Refined, Human Subtitle */}
          {doc.subtitle && (
            <p className="font-ui text-base sm:text-lg md:text-xl text-[#D1D0CD] max-w-2xl mx-auto leading-relaxed font-normal">
              {doc.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* ========================================================
          REGION B — EDITORIAL CONTENT
          Professional responsive editorial grid (~1140px container)
          Quiet, controlled reading surface in pure #141414
          ======================================================== */}
      <div className="relative z-10 w-full max-w-[1140px] mx-auto px-6 sm:px-10 lg:px-12 pb-16 sm:pb-20">
        <article className="space-y-16 sm:space-y-20">
          {doc.sections.map((section) => (
            <CinematicInfoSection
              key={section.id}
              section={section}
              isRTL={isRTL}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}

          {/* Bottom Document Peer Navigation (Clean, minimal) */}
          {doc.otherDocumentPath && doc.otherDocumentTitle && (
            <div className="pt-8 sm:pt-10 border-t border-white/10 flex justify-end">
              <Link
                to={doc.otherDocumentPath}
                className="inline-flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-[#D1D0CD] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white"
              >
                <span>{doc.otherDocumentTitle}</span>
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Link>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};
