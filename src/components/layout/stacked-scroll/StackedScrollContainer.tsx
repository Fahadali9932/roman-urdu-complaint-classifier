import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StackedScrollContext, SectionRegistration } from './context';

interface StackedScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'main';
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export const StackedScrollContainer: React.FC<StackedScrollContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const sectionsRef = useRef<SectionRegistration[]>([]);
  const rafId = useRef<number | null>(null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    let mq: MediaQueryList | null = null;
    if (typeof window.matchMedia === 'function') {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', handleMotion);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mq) mq.removeEventListener('change', () => {});
    };
  }, []);

  const registerSection = useCallback((reg: SectionRegistration) => {
    sectionsRef.current = [...sectionsRef.current.filter((s) => s.id !== reg.id), reg].sort(
      (a, b) => a.depth - b.depth
    );
  }, []);

  const unregisterSection = useCallback((id: string) => {
    sectionsRef.current = sectionsRef.current.filter((s) => s.id !== id);
  }, []);

  // Scrub and apply physical 3D transforms continuously based on scroll position
  const updateTransforms = useCallback(() => {
    if (prefersReducedMotion) {
      sectionsRef.current.forEach((s) => {
        if (s.innerEl) {
          s.innerEl.style.transform = 'none';
          s.innerEl.style.filter = 'none';
        }
      });
      return;
    }

    const sections = sectionsRef.current;
    const windowH = window.innerHeight;
    const isNarrow = isMobile;
    const isMid = isTablet;

    for (let i = 0; i < sections.length - 1; i++) {
      const current = sections[i];
      const next = sections[i + 1];

      if (!current.innerEl || !next.outerEl || !current.recedeOnScroll) continue;

      const nextRect = next.outerEl.getBoundingClientRect();

      // How far has the incoming section moved into the viewport?
      // When nextRect.top >= windowH: next section is completely below screen -> t = 0
      // When nextRect.top <= 0: next section completely covers or reaches top -> t = 1
      const rawProgress = (windowH - nextRect.top) / windowH;
      const t = clamp01(rawProgress);

      if (t <= 0) {
        current.innerEl.style.transform = 'scale(1) translate3d(0, 0, 0)';
        current.innerEl.style.filter = 'none';
      } else {
        // Calculate physics parameters based on screen tier
        let scale: number;
        let translateY: number;
        let translateZ: number;
        let rotateX: number;
        let brightness: number;

        if (isNarrow) {
          // Mobile: restrained 3D motion, no rotation, gentle scale down to 0.988
          scale = 1.0 - 0.012 * t;
          translateY = 4 * t;
          translateZ = 0;
          rotateX = 0;
          brightness = 1.0 - 0.04 * t;
          current.innerEl.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        } else if (isMid) {
          // Tablet: moderate perspective, scale down to 0.982
          scale = 1.0 - 0.018 * t;
          translateY = 8 * t;
          translateZ = -15 * t;
          rotateX = 0.4 * t;
          brightness = 1.0 - 0.06 * t;
          current.innerEl.style.transform = `perspective(1400px) translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        } else {
          // Desktop: full premium cinematic stacked 3D layering (scale down to 0.975, perspective, 0.8deg tilt, depth)
          scale = 1.0 - 0.025 * t;
          translateY = 12 * t;
          translateZ = -28 * t;
          rotateX = 0.8 * t;
          brightness = 1.0 - 0.08 * t;
          current.innerEl.style.transform = `perspective(1400px) translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        }
      }
    }
  }, [isMobile, isTablet, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          updateTransforms();
          rafId.current = null;
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial pass on mount
    updateTransforms();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [updateTransforms]);

  return (
    <StackedScrollContext.Provider
      value={{
        registerSection,
        unregisterSection,
        isMobile,
        isTablet,
        prefersReducedMotion,
        isRTL,
      }}
    >
      <Component
        ref={containerRef as any}
        className={`stacked-scroll-container relative w-full overflow-x-clip ${className}`}
        style={{
          perspective: prefersReducedMotion ? 'none' : '1400px',
          perspectiveOrigin: '50% 25%',
        }}
      >
        {children}
      </Component>
    </StackedScrollContext.Provider>
  );
};
