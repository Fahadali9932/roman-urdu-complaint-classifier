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
          // Once revealed, keep it visible
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
      className={`scroll-mt-28 space-y-4 text-start outline-none transition-all duration-700 ease-out ${
        prefersReducedMotion || isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Section Header with Monospace Number and Editorial H2 */}
      <div className="flex items-baseline gap-3 pb-2.5 border-b border-white/10">
        {section.number && (
          <span className="font-mono text-sm sm:text-base font-bold text-[#E57373] shrink-0">
            {section.number}.
          </span>
        )}
        <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl text-white uppercase tracking-tight leading-snug">
          {section.title}
        </h2>
      </div>

      {/* Paragraphs */}
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
        <ul className="space-y-2.5 ps-3 sm:ps-4 my-3 text-start">
          {section.bulletPoints.map((item, idx) => (
            <li
              key={idx}
              className={`flex items-start gap-3 font-ui text-[14px] sm:text-[15px] text-[#D1D0CD] ${
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

      {/* Optional Callout Box (Subtle dark charcoal with maroon border) */}
      {section.callout && (
        <div
          className={`p-4 sm:p-5 rounded-xl bg-[#1A1A1A]/85 border border-white/10 shadow-lg space-y-1 my-4 ${
            isRTL ? 'border-r-4 border-r-[#E57373]' : 'border-l-4 border-l-[#E57373]'
          }`}
        >
          <span className="block font-mono text-xs font-bold uppercase tracking-wider text-white">
            {section.callout.title}
          </span>
          <p
            className={`text-xs sm:text-[13.5px] text-[#A8A5A0] font-ui ${
              isRTL ? 'leading-relaxed' : 'leading-normal'
            }`}
          >
            {section.callout.text}
          </p>
        </div>
      )}
    </section>
  );
};
