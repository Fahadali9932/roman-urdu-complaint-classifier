import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { LocalizedInfoDocument } from '../types';
import { CinematicInfoSection } from './CinematicInfoSection';
import { CinematicInfoFooter } from './CinematicInfoFooter';
import mazarDesktop from '../../../assets/mazar-e-quaid-monochrome.jpg';
import mazarMobile from '../../../assets/mazar-e-quaid-mobile.jpg';
import { ShieldCheck, ArrowLeft, ArrowRight, FileText, ChevronDown, ListFilter } from 'lucide-react';

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

  const [activeSectionId, setActiveSectionId] = useState<string>(doc.sections[0]?.id || '');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Update browser document title
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

  // Scroll to hash on mount or restore top scroll position
  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [doc.title]);

  // Track scroll position for hero title transition
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || window.pageYOffset || 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active section observer for multi-section documents (Privacy & Terms)
  const isLongDocument = doc.sections.length > 3;
  useEffect(() => {
    if (!isLongDocument) return;

    const handleScrollTracking = () => {
      const sectionElements = doc.sections
        .map((s) => document.getElementById(s.id))
        .filter((el): el is HTMLElement => el !== null);

      if (sectionElements.length === 0) return;

      const triggerY = 220;
      let currentActiveId = sectionElements[0].id;

      for (const el of sectionElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerY) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }
      setActiveSectionId(currentActiveId);
    };

    window.addEventListener('scroll', handleScrollTracking, { passive: true });
    handleScrollTracking();
    return () => window.removeEventListener('scroll', handleScrollTracking);
  }, [doc.sections, isLongDocument]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'instant' : 'smooth' });
      window.history.pushState(null, '', `#${id}`);
      setActiveSectionId(id);
      setMobileTocOpen(false);
    }
  };

  // Scroll-driven hero title kinematics
  // As user scrolls from 0 to 450px:
  // Title shifts upward (translateY: 0 to -60px) and fades gracefully (opacity: 1 to 0.15)
  const titleShift = prefersReducedMotion ? 0 : Math.min(60, scrollY * 0.18);
  const titleOpacity = prefersReducedMotion ? 1 : Math.max(0.12, 1 - scrollY / 420);
  const titleScale = prefersReducedMotion ? 1 : Math.max(0.94, 1 - (scrollY / 420) * 0.06);

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

        {/* Multi-Stop Atmospheric Charcoal Gradients (Enhances contrast & focal depth) */}
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
          STAGE A & B: CINEMATIC OPENING HERO TITLE
          Centered in usable viewport with scroll-driven movement
          ======================================================== */}
      <section
        className="relative z-10 w-full min-h-[75vh] sm:min-h-[82vh] flex flex-col justify-center items-center text-center px-4 sm:px-8 lg:px-12 pt-28 sm:pt-32 pb-12 sm:pb-16"
        aria-labelledby="cinematic-page-title"
      >
        <div
          style={{
            transform: `translateY(-${titleShift}px) scale(${titleScale})`,
            opacity: titleOpacity,
            willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
          }}
          className="max-w-4xl mx-auto space-y-5 transition-transform ease-out duration-75"
        >
          {/* Eyebrow and metadata */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono tracking-widest uppercase">
            <span className="font-bold text-[#E57373]">{doc.eyebrow}</span>
            {doc.effectiveDate && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="text-[#8C8885]">{doc.effectiveDate}</span>
              </>
            )}
          </div>

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

          {/* Refined Subtitle */}
          <p className="font-ui text-base sm:text-lg md:text-xl text-[#D1D0CD] max-w-2xl mx-auto leading-relaxed">
            {doc.subtitle}
          </p>

          {/* Academic Transparency Box */}
          {doc.academicNotice && (
            <div className="max-w-2xl mx-auto p-3.5 sm:p-4 rounded-xl bg-[#1A1A1A]/85 border border-white/10 shadow-lg flex items-start gap-3 text-start mt-6">
              <ShieldCheck className="w-5 h-5 text-[#E57373] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-ui text-xs sm:text-[13px] text-[#A8A5A0] leading-relaxed">
                {doc.academicNotice}
              </p>
            </div>
          )}
        </div>

        {/* Scroll Indicator */}
        <div
          className={`mt-10 sm:mt-14 transition-opacity duration-300 ${
            scrollY > 120 ? 'opacity-0 pointer-events-none' : 'opacity-70'
          }`}
          aria-hidden="true"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-[#8C8885] uppercase">
            <span>{ur ? 'مزید پڑھنے کے لیے نیچے دیکھیں' : 'SCROLL TO EXPLORE'}</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          </span>
        </div>
      </section>

      {/* ========================================================
          STAGE C: PROGRESSIVE CONTENT SECTIONS
          Two-column grid for long documents (TOC + Article)
          Single focused column for About & Contact
          ======================================================== */}
      <main className="relative z-10 w-full max-w-[1240px] mx-auto px-4 sm:px-8 lg:px-12 pb-24 sm:pb-32">
        {isLongDocument ? (
          <div>
            {/* Mobile Collapsible TOC Disclosure (Compact) */}
            <div className="lg:hidden mb-8">
              <button
                type="button"
                onClick={() => setMobileTocOpen(!mobileTocOpen)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-xs font-mono uppercase tracking-wider shadow-md focus-visible:outline-2 focus-visible:outline-white"
                aria-expanded={mobileTocOpen}
                aria-label="Toggle document table of contents"
              >
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-[#E57373]" />
                  <span>
                    {doc.tableOfContentsLabel || (ur ? 'فہرست مضامین' : 'ON THIS PAGE')} ({doc.sections.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#8C8885] transition-transform duration-200 ${
                    mobileTocOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileTocOpen && (
                <nav
                  aria-label="Mobile table of contents"
                  className="mt-2 p-3 rounded-xl bg-[#1A1A1A] border border-white/10 shadow-xl space-y-1 text-start"
                >
                  {doc.sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={(e) => scrollToSection(e, section.id)}
                      className={`flex items-baseline gap-2 px-2.5 py-2 rounded-lg text-xs font-ui transition-colors ${
                        activeSectionId === section.id
                          ? 'bg-[#681822] text-white font-medium'
                          : 'text-[#D1D0CD] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {section.number && (
                        <span className="font-mono text-[11px] opacity-75 shrink-0">
                          {section.number}.
                        </span>
                      )}
                      <span className="truncate">{section.title}</span>
                    </a>
                  ))}
                </nav>
              )}
            </div>

            {/* Desktop Two-Column Layout */}
            <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:gap-16 items-start">
              {/* Sticky Table of Contents (Desktop) */}
              <aside
                aria-label={doc.tableOfContentsLabel || 'Table of Contents'}
                className="hidden lg:block sticky top-28 select-none text-start"
              >
                <div className="space-y-3">
                  <div className="pb-2 border-b border-white/10">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#E57373] uppercase">
                      {doc.tableOfContentsLabel || (ur ? 'فہرست مضامین' : 'ON THIS PAGE')}
                    </span>
                  </div>

                  <nav className="space-y-1">
                    {doc.sections.map((section) => {
                      const isActive = activeSectionId === section.id;
                      return (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          onClick={(e) => scrollToSection(e, section.id)}
                          className={`group relative flex items-baseline gap-2 py-1.5 px-2 rounded-md text-xs font-ui transition-colors focus-visible:outline-2 focus-visible:outline-white ${
                            isActive
                              ? 'text-white font-medium bg-white/5'
                              : 'text-[#8C8885] hover:text-[#D1D0CD] hover:bg-white/5 font-normal'
                          }`}
                        >
                          {isActive && (
                            <span
                              className={`absolute top-1.5 bottom-1.5 w-0.5 bg-[#E57373] rounded-full ${
                                isRTL ? 'right-0' : 'left-0'
                              }`}
                              aria-hidden="true"
                            />
                          )}
                          {section.number && (
                            <span
                              className={`font-mono text-[11px] shrink-0 ${
                                isActive ? 'text-[#E57373] font-bold' : 'text-[#8C8885]'
                              }`}
                            >
                              {section.number}
                            </span>
                          )}
                          <span className="leading-snug">{section.title}</span>
                        </a>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              {/* Main Reading Column (~760px) */}
              <article className="max-w-[760px] w-full space-y-14">
                {doc.sections.map((section) => (
                  <CinematicInfoSection
                    key={section.id}
                    section={section}
                    isRTL={isRTL}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                ))}

                {/* Document Navigation Links */}
                <div className="pt-10 mt-14 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            </div>
          </div>
        ) : (
          /* Single Column Focused Layout (for About & Contact) */
          <div className="max-w-[760px] mx-auto space-y-16">
            <article className="space-y-14">
              {doc.sections.map((section) => (
                <CinematicInfoSection
                  key={section.id}
                  section={section}
                  isRTL={isRTL}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}

              {/* Document Navigation Links */}
              <div className="pt-10 mt-14 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          </div>
        )}
      </main>

      {/* ========================================================
          STAGE D: COMPACT CLOSING NAVIGATION FOOTER
          (Avoids duplicate monument scene while preserving links)
          ======================================================== */}
      <CinematicInfoFooter />
    </div>
  );
};
