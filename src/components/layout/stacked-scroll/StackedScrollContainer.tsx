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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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
    let handleMotion: ((event: MediaQueryListEvent) => void) | null = null;
    if (typeof window.matchMedia === 'function') {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      handleMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', handleMotion);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mq && handleMotion) mq.removeEventListener('change', handleMotion);
    };
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
      // When nextRect.top <= (windowH - travelDistance): incoming section has fully entered -> t = 1
      const nextHeight = next.outerEl.offsetHeight || windowH;
      const travelDistance = Math.min(windowH, Math.max(180, nextHeight));
      const rawProgress = (windowH - nextRect.top) / travelDistance;
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
          // Keep the physical-depth cue on narrow screens without shrinking the readable canvas.
          scale = 1.0 - 0.022 * t;
          translateY = 6 * t;
          translateZ = -10 * t;
          rotateX = 0.25 * t;
          brightness = 1.0 - 0.06 * t;
          current.innerEl.style.transform = `perspective(900px) translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        } else if (isMid) {
          // Tablet: 2.5% scale reduction, 8% atmospheric dimming, moderate depth
          scale = 1.0 - 0.025 * t;
          translateY = 10 * t;
          translateZ = -18 * t;
          rotateX = 0.4 * t;
          brightness = 1.0 - 0.08 * t;
          current.innerEl.style.transform = `perspective(1400px) translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        } else {
          // Desktop: 3.0% scale reduction, 10% atmospheric dimming, perspective + 0.8deg tilt
          scale = 1.0 - 0.030 * t;
          translateY = 14 * t;
          translateZ = -32 * t;
          rotateX = 0.8 * t;
          brightness = 1.0 - 0.10 * t;
          current.innerEl.style.transform = `perspective(1400px) translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
          current.innerEl.style.filter = `brightness(${brightness})`;
        }
      }
    }
  }, [isMobile, isTablet, prefersReducedMotion]);

  const requestTransformUpdate = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      updateTransforms();
      rafId.current = null;
    });
  }, [updateTransforms]);

  const registerSection = useCallback((reg: SectionRegistration) => {
    sectionsRef.current = [...sectionsRef.current.filter((s) => s.id !== reg.id), reg].sort(
      (a, b) => a.depth - b.depth
    );
    resizeObserverRef.current?.observe(reg.outerEl);
    requestTransformUpdate();
  }, [requestTransformUpdate]);

  const unregisterSection = useCallback((id: string) => {
    const registration = sectionsRef.current.find((section) => section.id === id);
    if (registration) resizeObserverRef.current?.unobserve(registration.outerEl);
    sectionsRef.current = sectionsRef.current.filter((section) => section.id !== id);
    requestTransformUpdate();
  }, [requestTransformUpdate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => requestTransformUpdate();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(onScroll);
      if (containerRef.current) resizeObserverRef.current.observe(containerRef.current);
      sectionsRef.current.forEach((section) => resizeObserverRef.current?.observe(section.outerEl));
    }

    const visualViewport = window.visualViewport;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    visualViewport?.addEventListener('resize', onScroll, { passive: true });
    visualViewport?.addEventListener('scroll', onScroll, { passive: true });

    // Initial pass on mount
    updateTransforms();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      visualViewport?.removeEventListener('resize', onScroll);
      visualViewport?.removeEventListener('scroll', onScroll);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [requestTransformUpdate, updateTransforms]);

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
        className={`stacked-scroll-container relative w-full ${className}`}
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
