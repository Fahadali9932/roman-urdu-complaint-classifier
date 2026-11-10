import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import { LocalizedLegalDocument } from '../types';
import { LegalTableOfContents } from './LegalTableOfContents';
import { ArrowLeft, ArrowRight, ShieldCheck, FileText } from 'lucide-react';

interface LegalPageLayoutProps {
  content: {
    en: LocalizedLegalDocument;
    ur: LocalizedLegalDocument;
  };
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ content }) => {
  const { language, isRTL } = useLanguage();
  const doc = content[language] || content.en;

  useEffect(() => {
    // Scroll to top on document load or hash anchor if present
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [doc.title]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full bg-[#F7F6F3] min-h-[calc(100vh-140px)] text-start selection:bg-[#681822] selection:text-white"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16">

        {/* ========================================================
            DOCUMENT HEADER (EDITORIAL OPENING AREA)
            ======================================================== */}
        <header className="max-w-[760px] lg:ms-[280px] mb-10 sm:mb-14 pb-8 border-b border-[#E5E3E0] space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#681822] uppercase">
              {doc.eyebrow}
            </span>
            <span className="h-1 w-1 rounded-full bg-[#681822]" />
            <span className="text-[11px] font-mono text-[#6B6864]">
              {doc.effectiveDate}
            </span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-[#141414] uppercase tracking-tight leading-[1.05]">
            {doc.title}
          </h1>

          <p className="text-base sm:text-lg text-[#323232] font-ui leading-relaxed">
            {doc.subtitle}
          </p>

          {/* Academic Prototype Transparency Notice */}
          <div className="p-4 rounded-xl bg-white border border-[#E5E3E0] flex items-start gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#681822] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs sm:text-[13px] text-[#323232] font-ui leading-relaxed">
              {doc.academicNotice}
            </p>
          </div>
        </header>

        {/* ========================================================
            TWO-COLUMN EDITORIAL GRID: TOC (LEFT) + ARTICLE (RIGHT)
            ======================================================== */}
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 xl:gap-16 items-start">

          {/* Sticky Table of Contents (Desktop) & Collapsible (Mobile) */}
          <LegalTableOfContents
            sections={doc.sections}
            label={doc.tableOfContentsLabel}
            isRTL={isRTL}
          />

          {/* Main Reading Document Column (~760px optimal line length) */}
          <article className="max-w-[760px] w-full space-y-12">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                tabIndex={-1}
                className="scroll-mt-28 space-y-4 text-start outline-none"
              >
                {/* Section Title with Monospace Number */}
                <div className="flex items-baseline gap-3 pb-2 border-b border-[#E5E3E0]">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#681822] shrink-0">
                    {section.number}.
                  </span>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-[#141414] uppercase tracking-tight leading-snug">
                    {section.title}
                  </h2>
                </div>

                {/* Section Paragraphs */}
                <div className={`space-y-3 font-ui text-[14.5px] sm:text-base text-[#323232] ${
                  isRTL ? 'leading-[1.9] sm:leading-[2.0]' : 'leading-relaxed'
                }`}>
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>

                {/* Optional Bullet Points */}
                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="space-y-2 ps-4 my-3 text-start">
                    {section.bulletPoints.map((item, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-2.5 font-ui text-[14px] sm:text-[15px] text-[#323232] ${
                          isRTL ? 'leading-[1.85]' : 'leading-relaxed'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#681822] shrink-0 mt-2" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Optional Callout Box */}
                {section.callout && (
                  <div className={`p-4 sm:p-5 rounded-xl bg-white border border-[#E5E3E0] shadow-sm space-y-1 my-4 ${
                    isRTL ? 'border-r-4 border-r-[#681822]' : 'border-l-4 border-l-[#681822]'
                  }`}>
                    <span className="block font-mono text-xs font-bold uppercase tracking-wider text-[#141414]">
                      {section.callout.title}
                    </span>
                    <p className={`text-xs sm:text-[13px] text-[#4A4744] font-ui ${
                      isRTL ? 'leading-relaxed' : 'leading-normal'
                    }`}>
                      {section.callout.text}
                    </p>
                  </div>
                )}
              </section>
            ))}

            {/* ========================================================
                DOCUMENT FOOTER NAVIGATION & RETURN LINKS
                ======================================================== */}
            <div className="pt-10 mt-12 border-t border-[#E5E3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#141414] hover:text-[#681822] transition-colors"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{doc.returnHomeLabel}</span>
              </Link>

              <Link
                to={doc.otherDocumentPath}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#681822] hover:text-[#141414] transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{doc.otherDocumentTitle}</span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
