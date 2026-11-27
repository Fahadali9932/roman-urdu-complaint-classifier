import React, { useEffect, useRef } from 'react';

export interface V20CursorSpotlightProps {
  themeMode?: 'dark' | 'light';
  departmentCode?: string;
}

/**
 * V20 Atmospheric Cursor Spotlight Glow Effect
 * Reference: https://namethatui.com/web/hover-effects?part=spotlight-glow
 *
 * Characteristics:
 * - Soft radial spotlight that follows the user's pointer smoothly.
 * - Diameter: ~460px circle with natural radial falloff.
 * - Restrained peak opacity: 8-10% in dark mode, subtle neutral in light mode.
 * - Pure browser-native performance: updates CSS custom properties (--spotlight-x, --spotlight-y)
 *   via requestAnimationFrame without triggering React component re-renders.
 * - Disabled on touch-only devices (@media (hover: none) and (pointer: coarse))
 *   and respects user accessibility preferences (prefers-reduced-motion: reduce).
 */
export const V20CursorSpotlight: React.FC<V20CursorSpotlightProps> = ({
  themeMode = 'dark',
  departmentCode = 'kmc',
}) => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);
  const mousePos = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const isMoving = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Accessibility check: respects reduced motion preference
    const prefersReducedMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Hardware check: disable on touch-only coarse pointer devices
    const isTouchOnly =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
        : false;

    if (prefersReducedMotion || isTouchOnly) return;

    const handlePointerMove = (e: PointerEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isMoving.current) {
        isMoving.current = true;
        rafId.current = window.requestAnimationFrame(() => {
          if (spotlightRef.current) {
            spotlightRef.current.style.setProperty('--spotlight-x', `${mousePos.current.x}px`);
            spotlightRef.current.style.setProperty('--spotlight-y', `${mousePos.current.y}px`);
          }
          isMoving.current = false;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={spotlightRef}
      className={`v20-cursor-spotlight ${themeMode === 'light' ? 'light-mode' : 'dark-mode'}`}
      data-testid="v20-cursor-spotlight"
      data-dept={departmentCode.toLowerCase()}
      aria-hidden="true"
    />
  );
};
