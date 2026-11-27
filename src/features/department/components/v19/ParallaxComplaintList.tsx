import React, { useEffect, useRef } from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';

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
 * NameThatUI-inspired Parallax Complaint List
 * Reference: Minimal Sales Analytics & Reference 1 Stacking Cards
 * Features:
 * - Large horizontal transparent glass cards (~180-220px height, 28-32px radius)
 * - Full priority label badge top-right ("Urgent", "High", "Normal", "Critical")
 * - Reference number top-left, prominent heading, location subtitle with pin
 * - Scroll-linked sticky card stacking & 3D depth transform: scale(1 - 0.045*p) translateZ(-34*p px)
 * - Diagonal arrow lower-right
 */
export const ParallaxComplaintList: React.FC<ParallaxComplaintListProps> = ({
  items,
  onSelectItem,
  selectedId,
  emptyMessage = 'No actionable complaints in this view.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for reduced motion safely
    const prefersReducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const cards = container.querySelectorAll<HTMLElement>('.v19-parallax-card');
          const windowHeight = window.innerHeight;

          cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            // Stacking factor p when card reaches upper viewport threshold
            const stickyThreshold = 140 + index * 12;
            const distancePastThreshold = Math.max(0, stickyThreshold - rect.top);
            const p = Math.min(distancePastThreshold / 300, 3.5);

            if (p > 0.02) {
              const scale = Math.max(0.86, 1 - 0.045 * p);
              const translateZ = -34 * p;
              const translateY = distancePastThreshold * 0.15;
              card.style.transform = `perspective(1000px) scale(${scale.toFixed(3)}) translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px)`;
            } else {
              // Subtle breathing depth when scrolling through center
              const centerDistance = rect.top + rect.height / 2 - windowHeight / 2;
              const factor = ((index % 3) - 1) * 0.02;
              const translateY = centerDistance * factor;
              card.style.transform = `perspective(1000px) translate3d(0, ${translateY.toFixed(1)}px, 0)`;
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [items]);

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
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const priorityKey = item.priority.toLowerCase();
        const displayPriority = priorityLabelMap[priorityKey] || item.priority;

        return (
          <div
            key={item.id}
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

              {/* Priority badge top-right with full text */}
              <div className={`v20-priority-badge v19-priority-square ${priorityKey}`} title={`Priority: ${displayPriority}`}>
                <span>{displayPriority}</span>
              </div>
            </div>

            {/* Middle: Prominent Heading */}
            <h4 className="v20-card-title">
              {item.heading}
            </h4>

            {/* Bottom Row: Location Info on Left, Status Pill & Arrow on Right */}
            <div className="v20-card-bottom-row">
              <div className="v20-card-location">
                <MapPin size={14} className="v20-pin-icon" />
                <span title={item.publicLocation}>{item.publicLocation}</span>
              </div>

              <div className="v20-card-actions-hint">
                <span className="v20-status-capsule">
                  {item.status}
                </span>
                <span className="v20-arrow-circle">
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
