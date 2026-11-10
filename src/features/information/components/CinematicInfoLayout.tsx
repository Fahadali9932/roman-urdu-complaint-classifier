import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { LocalizedInfoDocument } from '../types';
import { CinematicInfoSection } from './CinematicInfoSection';
import { CinematicInfoFooter } from './CinematicInfoFooter';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';

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
      className="relative w-full min-h-screen bg-[#141414] text-[#F7F6F3] overflow-x-clip selection:bg-[#681822] selection:text-white"
    >
      {/* ========================================================
          BACKGROUND LAYER: Grayscale Mazar-e-Quaid Architecture
          Atmospheric Charcoal Multi-Stop Gradients
          ======================================================== */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <picture>
          <source media="(max-width: 768px)" srcSet={mazarMobile} />
          <img
            src={mazarDesktop}
            alt=""
            className="w-full h-full object-cover object-[center_18%] sm:object-[center_22%] opacity-35 sm:opacity-45 select-none pointer-events-none"
            loading="eager"
            decoding="async"
          />
        </picture>

        {/* Multi-Stop Atmospheric Charcoal Gradients (High contrast readability) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 85% 75% at 50% 32%, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0.65) 55%, #141414 92%, #141414 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(20,20,20,0.85) 0%, rgba(20,20,20,0.25) 24%, rgba(20,20,20,0.65) 60%, #141414 88%, #141414 100%)',
          }}
        />
      </div>

      {/* ========================================================
          OPENING HERO: Large Bold Title + Concise Intro Sentence
          Centered, minimal, no warning cards or extra metadata
          ======================================================== */}
      <section
        className="relative z-10 w-full min-h-[46vh] sm:min-h-[52vh] flex flex-col justify-center items-center text-center px-4 sm:px-8 lg:px-12 pt-28 sm:pt-32 pb-8 sm:pb-12"
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
          {/* Main Title in Heavy Display Font */}
          <h1
            id="cinematic-page-title"
            tabIndex={-1}
            className={`font-display font-black tracking-tight text-white uppercase outline-none select-none ${
              ur
                ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight'
                : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]'
            }`}
          >
            {doc.title}
          </h1>

          {/* Refined, Human Subtitle */}
          {doc.subtitle && (
            <p className="font-ui text-base sm:text-lg md:text-xl text-[#D1D0CD] max-w-2xl mx-auto leading-relaxed">
              {doc.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* ========================================================
          CONTENT AREA: Concise Editorial Sections (~760px column)
          Clean headings, comfortable line lengths, natural pacing
          ======================================================== */}
      <main className="relative z-10 w-full max-w-[760px] mx-auto px-4 sm:px-8 lg:px-12 pb-20 sm:pb-28">
        <article className="space-y-12 sm:space-y-14">
          {doc.sections.map((section) => (
            <CinematicInfoSection
              key={section.id}
              section={section}
              isRTL={isRTL}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}

          {/* Bottom Document Navigation Links */}
          <div className="pt-8 sm:pt-10 mt-12 sm:mt-14 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-white hover:text-[#E57373] transition-colors focus-visible:outline-2 focus-visible:outline-white"
            >
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{doc.returnHomeLabel}</span>
            </Link>

            {doc.otherDocumentPath && doc.otherDocumentTitle && (
              <Link
                to={doc.otherDocumentPath}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#E57373] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white"
              >
                <FileText className="w-4 h-4" />
                <span>{doc.otherDocumentTitle}</span>
              </Link>
            )}
          </div>
        </article>
      </main>

      {/* ========================================================
          COMPACT CLOSING NAVIGATION FOOTER
          (Avoids duplicate monument scene while preserving links)
          ======================================================== */}
      <CinematicInfoFooter />
    </div>
  );
};
