import React, { useEffect, useRef, useId } from 'react';
import { useStackedScroll } from './context';

export interface StackedScrollSectionProps {
  id?: string;
  depth?: number;
  as?: 'div' | 'section' | 'article' | 'main';
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
  recedeOnScroll?: boolean;
  hasIncomingShadow?: boolean;
  stickyMode?: 'top' | 'bottom' | 'top-desktop' | 'none';
  trackHeight?: string;
  minHeight?: string;
  ariaLabel?: string;
}

export const StackedScrollSection: React.FC<StackedScrollSectionProps> = ({
  id,
  depth = 10,
  as: Component = 'section',
  className = '',
  innerClassName = '',
  children,
  recedeOnScroll = true,
  hasIncomingShadow = depth > 10,
  stickyMode = 'none',
  trackHeight,
  minHeight,
  ariaLabel,
}) => {
  const outerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { registerSection, unregisterSection, prefersReducedMotion, isMobile } = useStackedScroll();

  const generatedId = useId();
  const sectionId = id || generatedId;

  useEffect(() => {
    if (outerRef.current && innerRef.current) {
      registerSection({
        id: sectionId,
        depth,
        outerEl: outerRef.current,
        innerEl: innerRef.current,
        recedeOnScroll,
      });
    }

    return () => {
      unregisterSection(sectionId);
    };
  }, [sectionId, depth, recedeOnScroll, registerSection, unregisterSection]);

  // Physical top shadow on incoming sections that overlap previous sheets
  const shadowClass =
    hasIncomingShadow && !prefersReducedMotion
      ? 'stacked-incoming-shadow'
      : '';

  const usesViewportTrack = stickyMode === 'top' || stickyMode === 'bottom' || (stickyMode === 'top-desktop' && !isMobile);
  const effectiveMinHeight = usesViewportTrack ? '100svh' : minHeight || undefined;
  const trackSpacer = usesViewportTrack && trackHeight ? (
    <div
      className="stacked-scroll-track-spacer pointer-events-none motion-reduce:hidden"
      style={{ height: `calc(${trackHeight} - 100svh)` }}
      aria-hidden="true"
    />
  ) : null;

  if (usesViewportTrack && (stickyMode === 'top' || stickyMode === 'top-desktop')) {
    return (
      <>
        <Component
          id={id}
          ref={outerRef as any}
          aria-label={ariaLabel}
          style={{
            zIndex: depth,
            minHeight: effectiveMinHeight,
          }}
          className={`stacked-scroll-section sticky top-0 w-full overflow-visible ${shadowClass} ${className}`}
        >
          <div
            ref={innerRef}
            style={{
              transformOrigin: '50% 25%',
              willChange: prefersReducedMotion ? 'auto' : 'transform, filter',
            }}
            className={`stacked-scroll-inner w-full ${innerClassName}`}
          >
            {children}
          </div>
        </Component>
        {trackSpacer}
      </>
    );
  }

  if (usesViewportTrack && stickyMode === 'bottom') {
    return (
      <>
        <Component
          id={id}
          ref={outerRef as any}
          aria-label={ariaLabel}
          style={{
            zIndex: depth,
            minHeight: effectiveMinHeight,
          }}
          className={`stacked-scroll-section sticky bottom-0 w-full overflow-visible ${shadowClass} ${className}`}
        >
          <div
            ref={innerRef}
            style={{
              transformOrigin: '50% 75%',
              willChange: prefersReducedMotion ? 'auto' : 'transform, filter',
            }}
            className={`stacked-scroll-inner w-full ${innerClassName}`}
          >
            {children}
          </div>
        </Component>
        {trackSpacer}
      </>
    );
  }

  return (
    <Component
      id={id}
      ref={outerRef as any}
      aria-label={ariaLabel}
      style={{
        zIndex: depth,
        minHeight: effectiveMinHeight,
      }}
      className={`stacked-scroll-section relative w-full ${shadowClass} ${className}`}
    >
      <div
        ref={innerRef}
        style={{
          transformOrigin: '50% 25%',
          willChange: prefersReducedMotion ? 'auto' : 'transform, filter',
        }}
        className={`stacked-scroll-inner w-full h-full ${innerClassName}`}
      >
        {children}
      </div>
    </Component>
  );
};
