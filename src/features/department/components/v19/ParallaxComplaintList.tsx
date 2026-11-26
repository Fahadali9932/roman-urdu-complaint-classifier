import React, { useEffect, useRef } from 'react';

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
 * Reference: https://namethatui.com/web/parallax
 * Features:
 * - Subtle scroll-linked multi-layer depth offset
 * - Transparent rounded glass containers
 * - Compact rounded-square priority indicators
 * - Graceful fallback when prefers-reduced-motion is enabled
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

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const cards = container.querySelectorAll<HTMLElement>('.v19-parallax-card');
          const windowHeight = window.innerHeight;

          cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            // Calculate distance from screen center
            const centerDistance = rect.top + rect.height / 2 - windowHeight / 2;
            // Alternating subtle parallax factor (between -0.03 and +0.03)
            const factor = ((index % 3) - 1) * 0.025;
            const translateY = centerDistance * factor;
            card.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
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
      <div className="v19-glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--v19-text-muted)' }}>
        <p style={{ margin: 0, fontSize: '14.5px', fontWeight: 500 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="v19-parallax-viewport" ref={containerRef}>
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const priorityClass = item.priority.toLowerCase();

        return (
          <div
            key={item.id}
            className={`v19-glass-card v19-parallax-card ${isSelected ? 'is-selected' : ''}`}
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
            {/* Left: Priority Square & Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
              <div className={`v19-priority-square ${priorityClass}`} title={`Priority: ${item.priority}`}>
                {item.priority[0]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v19-lime)', fontFamily: 'var(--v19-font-mono)' }}>
                    #{item.referenceNumber}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--v19-text-muted)' }}>
                    · {item.submittedAt}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: 'var(--v19-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.heading}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--v19-text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.publicLocation}
                </div>
              </div>
            </div>

            {/* Right: Status Pill & Action Hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, paddingLeft: '16px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--v19-text-secondary)',
                  border: '1px solid var(--v19-glass-border)',
                }}
              >
                {item.status}
              </span>

              <span style={{ fontSize: '16px', color: 'var(--v19-text-muted)' }}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
