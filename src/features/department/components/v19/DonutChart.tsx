import React, { useState } from 'react';

export type DonutDatePeriod = 'today' | 'yesterday' | 'month' | 'year';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  title?: string;
  segments: DonutSegment[];
  period: DonutDatePeriod;
  onPeriodChange: (period: DonutDatePeriod) => void;
  onSegmentClick?: (segmentId: string) => void;
  centerLabel?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title = 'Complaint Distribution',
  segments,
  period,
  onPeriodChange,
  onSegmentClick,
  centerLabel = 'Total Cases',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // SVG circular dimensions
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Precompute offsets immutably
  const segmentsWithOffset = React.useMemo(() => {
    return segments.map((segment, index) => {
      const priorSum = segments.slice(0, index).reduce((sum, s) => sum + s.value, 0);
      const priorFraction = total > 0 ? priorSum / total : 0;
      const fraction = total > 0 ? segment.value / total : 0;
      return {
        ...segment,
        fraction,
        strokeDasharray: `${fraction * circumference} ${circumference}`,
        strokeDashoffset: -(priorFraction * circumference),
      };
    });
  }, [segments, total, circumference]);

  return (
    <div className="v19-glass-card v19-donut-panel">
      <div className="v19-panel-top">
        <span className="v19-panel-title">{title}</span>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '9999px', border: '1px solid var(--v19-glass-border)' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              className={`v19-nav-tab ${period === btn.id ? 'is-active' : ''}`}
              style={{ padding: '4px 12px', fontSize: '11.5px', background: period === btn.id ? 'var(--v19-lime)' : 'transparent', color: period === btn.id ? '#0E121A' : 'var(--v19-text-secondary)' }}
              onClick={() => onPeriodChange(btn.id as DonutDatePeriod)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="v19-donut-body">
        {/* SVG Donut */}
        <div className="v19-donut-svg-wrap">
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {total === 0 ? (
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={strokeWidth}
              />
            ) : (
              segmentsWithOffset.map((segment) => {
                const isHovered = hoveredId === segment.id;

                return (
                  <circle
                    key={segment.id}
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    style={{
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: 'pointer',
                      filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredId(segment.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSegmentClick && onSegmentClick(segment.id)}
                  />
                );
              })
            )}
          </svg>

          {/* Center Info */}
          <div className="v19-donut-center-info">
            <div className="v19-donut-center-total">{total}</div>
            <div className="v19-donut-center-label">{centerLabel}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="v19-donut-legend">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="v19-legend-item"
              style={{
                background: hoveredId === segment.id ? 'var(--v19-glass-subtle)' : 'transparent',
              }}
              onMouseEnter={() => setHoveredId(segment.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSegmentClick && onSegmentClick(segment.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="v19-legend-dot" style={{ background: segment.color }} />
                <span>{segment.label}</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--v19-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {segment.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
