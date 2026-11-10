import React, { useState, useEffect } from 'react';
import { LegalSectionContent } from '../types';
import { ChevronDown, ChevronUp, ListFilter } from 'lucide-react';

interface LegalTableOfContentsProps {
  sections: LegalSectionContent[];
  label: string;
  isRTL?: boolean;
}

export const LegalTableOfContents: React.FC<LegalTableOfContentsProps> = ({
  sections,
  label,
  isRTL = false,
}) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -65% 0px',
        threshold: 0,
      }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
      setMobileExpanded(false);
      target.focus({ preventScroll: true });
    }
  };

  return (
    <>
      {/* ========================================================
          MOBILE / TABLET COMPACT COLLAPSIBLE DISCLOSURE (< 1024px)
          ======================================================== */}
      <div className="lg:hidden w-full mb-8">
        <div className="rounded-xl border border-[#E5E3E0] bg-white overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="w-full flex items-center justify-between p-4 text-start font-ui font-medium text-sm text-[#141414] hover:bg-[#FAF9F7] transition-colors cursor-pointer"
            aria-expanded={mobileExpanded}
            aria-controls="mobile-toc-list"
          >
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-[#681822] shrink-0" aria-hidden="true" />
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-[#141414]">
                {label}
              </span>
              <span className="text-xs text-[#6B6864]">
                ({sections.length})
              </span>
            </div>
            {mobileExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#6B6864]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6B6864]" />
            )}
          </button>

          {mobileExpanded && (
            <nav
              id="mobile-toc-list"
              aria-label={label}
              className="px-4 pb-4 pt-1 border-t border-[#E5E3E0] bg-[#FAF9F7] space-y-1"
            >
              {sections.map((sec) => {
                const isActive = activeId === sec.id;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={(e) => handleLinkClick(e, sec.id)}
                    className={`block py-2 px-3 rounded-lg text-xs font-ui transition-colors text-start ${
                      isActive
                        ? 'bg-[#141414] text-white font-semibold'
                        : 'text-[#323232] hover:bg-[#E5E3E0]/40'
                    }`}
                  >
                    <span className="font-mono opacity-70 me-2">{sec.number}.</span>
                    <span>{sec.title}</span>
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* ========================================================
          DESKTOP STICKY RESTRAINED TABLE OF CONTENTS (>= 1024px)
          ======================================================== */}
      <aside
        className="hidden lg:block w-full sticky top-28 self-start z-10"
        aria-label={label}
      >
        <div className="pe-4 text-start">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E5E3E0]">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#681822]">
              {label}
            </span>
          </div>

          <nav className="space-y-1">
            {sections.map((sec) => {
              const isActive = activeId === sec.id;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => handleLinkClick(e, sec.id)}
                  className={`group flex items-baseline gap-2 py-1.5 text-xs transition-all duration-150 text-start ${
                    isRTL
                      ? isActive
                        ? 'border-r-2 border-[#681822] pr-2.5 font-semibold text-[#141414]'
                        : 'border-r-2 border-transparent pr-2.5 text-[#6B6864] hover:text-[#141414] hover:border-[#E5E3E0]'
                      : isActive
                        ? 'border-l-2 border-[#681822] pl-2.5 font-semibold text-[#141414]'
                        : 'border-l-2 border-transparent pl-2.5 text-[#6B6864] hover:text-[#141414] hover:border-[#E5E3E0]'
                  }`}
                >
                  <span
                    className={`font-mono text-[10.5px] shrink-0 ${
                      isActive ? 'text-[#681822]' : 'text-[#8E8E8E]'
                    }`}
                  >
                    {sec.number}
                  </span>
                  <span className="font-ui leading-snug line-clamp-2">
                    {sec.title}
                  </span>
                </a>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
