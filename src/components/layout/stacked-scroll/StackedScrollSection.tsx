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
  stickyMode?: 'top' | 'bottom' | 'none';
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

  const stickyClass =
    stickyMode === 'top'
      ? 'sticky top-0 motion-reduce:static'
      : stickyMode === 'bottom'
        ? 'sticky bottom-0 motion-reduce:static'
        : 'relative';

  // Physical top shadow on incoming sections that overlap previous sheets
  const shadowClass =
    hasIncomingShadow && !prefersReducedMotion
      ? isMobile
        ? 'shadow-[0_-16px_38px_-8px_rgba(18,18,20,0.28),0_-4px_14px_-3px_rgba(18,18,20,0.15)]'
        : 'shadow-[0_-28px_65px_-10px_rgba(18,18,20,0.32),0_-8px_22px_-5px_rgba(18,18,20,0.18)]'
      : '';

  return (
    <Component
      id={id}
      ref={outerRef as any}
      aria-label={ariaLabel}
      style={{
        zIndex: depth,
        minHeight: minHeight || undefined,
      }}
      className={`stacked-scroll-section ${stickyClass} w-full ${shadowClass} ${className}`}
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
