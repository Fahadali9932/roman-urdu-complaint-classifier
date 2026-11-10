import React, { useEffect, useRef, useState } from 'react';
import { InfoSectionContent } from '../types';

interface CinematicInfoSectionProps {
  section: InfoSectionContent;
  isRTL: boolean;
  prefersReducedMotion: boolean;
}

export const CinematicInfoSection: React.FC<CinematicInfoSectionProps> = ({
  section,
  isRTL,
  prefersReducedMotion,
}) => {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(
    () => prefersReducedMotion || typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (isVisible) return;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') return;

    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    const el = elementRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [isVisible, prefersReducedMotion]);

  return (
    <section
      ref={elementRef}
      id={section.id}
      tabIndex={-1}
      className={`scroll-mt-28 space-y-3.5 text-start outline-none transition-all duration-700 ease-out ${
        prefersReducedMotion || isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Clean Editorial Section Heading (No unnecessary decorative underline) */}
      <h2 className="font-display font-bold text-xl sm:text-2xl text-white uppercase tracking-tight leading-snug mb-3">
        {section.title}
      </h2>

      {/* Three-Level Team & Lead Developer Credit */}
      {section.leadCredit && (
        <div className="pt-1 pb-1 space-y-2">
          {/* Level 1: Team introduction */}
          {section.leadCredit.teamIntro && (
            <p className="font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase text-[#D1D0CD] opacity-85">
              {section.leadCredit.teamIntro}
            </p>
          )}

          {/* Level 2: Prominent Fahad Ali name */}
          <div className="flex items-center gap-2.5">
            <span
              className="w-2 h-2 rounded-full bg-[#681822] shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight uppercase">
              {section.leadCredit.name}
            </h3>
          </div>

          {/* Level 3: Smaller role and team acknowledgment */}
          <div className={`space-y-0.5 ${isRTL ? 'pe-4.5' : 'ps-4.5'}`}>
            <p className="font-mono text-xs sm:text-sm font-semibold tracking-wider uppercase text-white">
              {section.leadCredit.role}
            </p>
            {section.leadCredit.teamAcknowledgment && (
              <p className="font-ui text-xs sm:text-sm text-[#A8A5A0]">
                {section.leadCredit.teamAcknowledgment}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Concise Paragraphs */}
      <div
        className={`space-y-3 font-ui text-[15px] sm:text-base text-[#D1D0CD] ${
          isRTL ? 'leading-[1.9] sm:leading-[2.0]' : 'leading-relaxed'
        }`}
      >
        {section.paragraphs.map((p, idx) => (
          <p key={idx} className="leading-relaxed">
            {p}
          </p>
        ))}
      </div>

      {/* Optional Bullet Points */}
      {section.bulletPoints && section.bulletPoints.length > 0 && (
        <ul className="space-y-2 ps-3 sm:ps-4 my-3 text-start">
          {section.bulletPoints.map((item, idx) => (
            <li
              key={idx}
              className={`flex items-start gap-2.5 font-ui text-[14px] sm:text-[15px] text-[#D1D0CD] ${
                isRTL ? 'leading-[1.85]' : 'leading-relaxed'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#E57373] shrink-0 mt-2"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
