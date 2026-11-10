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
      className={`scroll-mt-28 outline-none transition-all duration-700 ease-out ${
        prefersReducedMotion || isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
    >
      {/* 2-Column Responsive Editorial Grid (Heading Left | Content Right) */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] gap-6 md:gap-12 lg:gap-16 items-start">
        {/* Left Column: Sticky Section Heading with Baseline Alignment */}
        <div className="md:sticky md:top-28">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white uppercase tracking-tight leading-snug">
            {section.title}
          </h2>
        </div>

        {/* Right Column: Editorial Reading Measure (Max ~720px) */}
        <div className="max-w-[720px] space-y-4">
          {/* Three-Level Team & Lead Developer Credit (Clean, No Colored Dots) */}
          {section.leadCredit && (
            <div className="pb-3 space-y-2.5">
              {/* Level 1: Clean uppercase team context */}
              {section.leadCredit.teamIntro && (
                <p className="font-ui text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#A8A5A0]">
                  {section.leadCredit.teamIntro}
                </p>
              )}

              {/* Level 2: Prominent Lead Developer Display Heading */}
              <h3 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight uppercase leading-none">
                {section.leadCredit.name}
              </h3>

              {/* Level 3: Role and Team Acknowledgment */}
              <div className="space-y-1 pt-1">
                <p className="font-ui text-sm sm:text-base font-semibold tracking-wide uppercase text-white/90">
                  {section.leadCredit.role}
                </p>
                {section.leadCredit.teamAcknowledgment && (
                  <p className="font-ui text-sm sm:text-base text-[#A8A5A0]">
                    {section.leadCredit.teamAcknowledgment}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Editorial Paragraphs */}
          <div
            className={`space-y-4 font-ui text-[15px] sm:text-[16px] text-[#D1D0CD] ${
              isRTL ? 'leading-[1.9] sm:leading-[2.0]' : 'leading-[1.75]'
            }`}
          >
            {section.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Typographic Bullet Points (Clean em-dashes, no colored dots) */}
          {section.bulletPoints && section.bulletPoints.length > 0 && (
            <ul className="space-y-2.5 pt-1 text-start">
              {section.bulletPoints.map((item, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-3 font-ui text-[14px] sm:text-[15px] text-[#D1D0CD] ${
                    isRTL ? 'leading-[1.85]' : 'leading-[1.75]'
                  }`}
                >
                  <span
                    className="text-white/40 select-none shrink-0 font-light"
                    aria-hidden="true"
                  >
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
