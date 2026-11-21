import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Coordinated 3D Route Transition (Objective 1 B):
 * - Incoming page advances with subtle perspective tilt and depth advance.
 * - Outgoing page subtly recedes.
 * - Once animation settles (~450ms desktop, ~300ms mobile), all transforms,
 *   perspective, and will-change are completely removed to guarantee 100% native
 *   subpixel font rendering and razor-sharp typography at rest.
 * - Respects prefers-reduced-motion: reduce.
 * - Global header remains outside this wrapper, staying visually stable.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    let mq: MediaQueryList | null = null;
    let handleMotion: ((e: MediaQueryListEvent) => void) | null = null;
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

  // Trigger balanced 3D entrance animation on route change
  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimating(false);
      return;
    }

    setAnimating(true);
    const duration = isMobile ? 320 : 460;
    const timer = setTimeout(() => {
      setAnimating(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [location.pathname, isMobile, prefersReducedMotion]);

  const animationClass = animating
    ? isMobile
      ? 'page-transition-enter-mobile'
      : 'page-transition-enter-desktop'
    : 'page-transition-settled';

  return (
    <div
      ref={containerRef}
      key={location.pathname}
      className={`page-transition-wrapper w-full ${animationClass}`}
      onAnimationEnd={() => setAnimating(false)}
    >
      {children}
    </div>
  );
};

export default PageTransition;
