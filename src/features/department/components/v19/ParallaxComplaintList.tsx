import React, { useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';

export interface ParallaxComplaintItem {
  id: string;
  referenceNumber: string;
  heading: string;
  publicLocation: string;
  priority: 'critical' | 'urgent' | 'high' | 'normal' | 'medium' | 'routine';
  status: string;
  submittedAt: string;
}

export interface ParallaxComplaintListProps {
  items: ParallaxComplaintItem[];
  onSelectItem: (item: ParallaxComplaintItem) => void;
  selectedId?: string | null;
  emptyMessage?: string;
}

/**
 * Re-engineered High-Performance Complaint List
 * Architecture:
 * - Stable outer wrapper nodes maintain layout geometry (zero layout thrashing).
 * - Inner visual surfaces receive smooth hardware-accelerated transforms.
 * - Single RAF scroll scheduler reads window.scrollY ONCE per frame (zero getBoundingClientRect loops).
 * - Bounded depth and scale: cards gently recede (scale 1 -> 0.97, translateY capped at 16px)
 *   strictly preventing card collisions, overlapping text, and obscured headings.
 * - Deterministic stacking order (earlier cards receive lower z-index so next cards glide over smoothly).
 * - Full reduced-motion and mobile fallback.
 */
export const ParallaxComplaintList: React.FC<ParallaxComplaintListProps> = ({
  items,
  onSelectItem,
  selectedId,
  emptyMessage = 'No actionable complaints in this view.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardOffsetsRef = useRef<number[]>([]);
  const surfaceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number>(0);
  const isTickingRef = useRef(false);

  // Measure and cache card layout offsets once on mount/resize
  const cacheLayoutGeometry = useCallback(() => {
    if (!containerRef.current) return;
    const wrappers = containerRef.current.querySelectorAll<HTMLElement>('.v20-card-wrapper');
    const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;
    cardOffsetsRef.current = Array.from(wrappers).map((w) => {
      return w.offsetTop + containerTop;
    });
  }, []);

  useEffect(() => {
    cacheLayoutGeometry();

    const handleResize = () => {
      cacheLayoutGeometry();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cacheLayoutGeometry, items.length]);

  // High-performance scroll animation loop
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      // Clear any transforms for reduced-motion users
      surfaceRefs.current.forEach((el) => {
        if (el) el.style.transform = '';
      });
      return;
    }

    const stickyCeiling = 140; // Clearance under 120px top notch

    const onScroll = () => {
      if (isTickingRef.current) return;
      isTickingRef.current = true;

      rafIdRef.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const offsets = cardOffsetsRef.current;

        for (let i = 0; i < offsets.length; i++) {
          const surface = surfaceRefs.current[i];
          if (!surface) continue;

          const cardAbsoluteTop = offsets[i];
          const viewportTop = cardAbsoluteTop - currentScrollY;

          // Only calculate for visible cards
          if (viewportTop > windowHeight + 100 || viewportTop < -300) {
            continue;
          }

          if (viewportTop < stickyCeiling) {
            // Card has scrolled past the top sticky ceiling: apply subtle bounded depth
            const distancePast = stickyCeiling - viewportTop;
            const progress = Math.min(distancePast / 260, 1.0);

            // Bounded scale: 1.0 down to 0.97 max
            const scale = 1 - 0.03 * progress;
            // Bounded translate: 0 to 14px max
            const translateY = 14 * progress;
            // Subtle depth: 0 to -20px max
            const translateZ = -20 * progress;
            // Slight opacity drop (never unreadable)
            const opacity = 1 - 0.12 * progress;

            surface.style.transform = `perspective(800px) scale(${scale.toFixed(4)}) translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px)`;
            surface.style.opacity = opacity.toFixed(3);
          } else {
            // Reset resting position
            surface.style.transform = '';
            surface.style.opacity = '1';
          }
        }

        isTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      isTickingRef.current = false;
    };
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="v19-glass-card v20-empty-card" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--v20-text-muted)' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>{emptyMessage}</p>
      </div>
    );
  }

  const priorityLabelMap: Record<string, string> = {
    critical: 'Critical',
    urgent: 'Urgent',
    high: 'High',
    normal: 'Normal',
    medium: 'Medium',
    routine: 'Routine',
  };

  return (
    <div className="v19-parallax-viewport v20-parallax-stack-container" ref={containerRef}>
      {items.map((item, idx) => {
        const isSelected = selectedId === item.id;
        const priorityKey = item.priority.toLowerCase();
        const displayPriority = priorityLabelMap[priorityKey] || item.priority;

        return (
          <div
            key={item.id}
            className="v20-card-wrapper"
            style={{
              position: 'relative',
              zIndex: idx + 1,
              minHeight: '180px',
              marginBottom: '20px',
            }}
          >
            <div
              ref={(el) => {
                surfaceRefs.current[idx] = el;
              }}
              className={`v19-glass-card v19-parallax-card v20-horizontal-complaint-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectItem(item);
                }
              }}
              aria-label={`Complaint ${item.referenceNumber}: ${item.heading}`}
              style={{
                willChange: 'transform, opacity',
                transformOrigin: 'top center',
              }}
            >
              {/* Top Row: Reference + Date on Left, Full Priority Badge on Right */}
              <div className="v20-card-top-row">
                <div className="v20-card-meta">
                  <span className="v20-ref-num">
                    #{item.referenceNumber}
                  </span>
                  <span className="v20-card-date">
                    · {item.submittedAt}
                  </span>
                </div>

                <div className={`v20-priority-badge ${priorityKey}`}>
                  {displayPriority}
                </div>
              </div>

              {/* Middle Row: Prominent Title */}
              <div className="v20-card-title-row">
                <h4 className="v20-card-title">
                  {item.heading}
                </h4>
              </div>

              {/* Bottom Row: Location with Pin on Left, Diagonal Action Arrow on Right */}
              <div className="v20-card-bottom-row">
                <div className="v20-card-location">
                  <MapPin size={15} className="v20-pin-icon" />
                  <span title={item.publicLocation}>{item.publicLocation}</span>
                </div>

                <div className="v20-card-action-trigger" aria-hidden="true">
                  <span className="v20-open-arrow">↗</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
