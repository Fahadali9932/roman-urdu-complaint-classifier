import React, { useState } from 'react';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface V20InteractiveDonutProps {
  segments: DonutSegment[];
  periodLabel: string;
  totalCases: number;
}

/**
 * V20 Interactive Donut Chart
 * Improvements:
 * - Dedicated square container (.v20-donut-ring-box) strictly centers the metric inside the ring
 *   independent of legend height.
 * - Flat stroke caps (strokeLinecap="butt") prevent messy overlapping endcap geometry.
 * - Selected segment ID tracking avoids stale object reference bugs.
 * - High-contrast accessible legend with keyboard interactivity.
 */
export const V20InteractiveDonut: React.FC<V20InteractiveDonutProps> = ({
  segments,
  periodLabel,
  totalCases,
}) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // SVG dimensions
  const size = 320;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate total sum of segment values
  const sum = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  // Find currently selected/hovered segment
  const activeSegment = segments.find((s) => s.id === selectedSegmentId) || null;

  // Display value and label at the exact geometric center of the donut
  const displayValue = activeSegment ? activeSegment.value : totalCases;
  const displayLabel = activeSegment ? activeSegment.label : `${periodLabel.toUpperCase()} CASES`;

  // Clean gap between slices in pixels along circumference
  const gapPx = segments.length > 1 ? 5 : 0;
  let accumulatedAngle = 0;

  const toggleHighlight = (segId: string) => {
    setSelectedSegmentId((prev) => (prev === segId ? null : segId));
  };

  return (
    <div className="v20-donut-svg-wrapper donut" data-testid="v20-donut-chart">
      {/* Dedicated strictly-square container to center metric precisely within the ring */}
      <div
        className="v20-donut-ring-box"
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible', display: 'block' }}
          role="img"
          aria-label="Complaint distribution donut chart"
        >
          <defs>
            <filter id="v20-donut-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Render separated slices with clean non-overlapping butt caps */}
          {segments.map((segment, idx) => {
            const percentage = segment.value / sum;
            const sliceLength = Math.max(0, percentage * circumference - gapPx);
            const dashArray = `${sliceLength} ${circumference - sliceLength}`;
            const currentOffset = -accumulatedAngle;
            accumulatedAngle += percentage * circumference;

            const isSelected = selectedSegmentId === segment.id;

            return (
              <circle
                key={segment.id}
                data-slice={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={currentOffset}
                strokeLinecap="butt"
                filter="url(#v20-donut-glow)"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
                  opacity: selectedSegmentId ? (isSelected ? 1 : 0.28) : 0.95,
                }}
                onMouseEnter={() => setSelectedSegmentId(segment.id)}
                onMouseLeave={() => setSelectedSegmentId(null)}
                onClick={() => toggleHighlight(segment.id)}
              />
            );
          })}
        </svg>

        {/* Central Metric strictly centered inside the square ring box */}
        <div className="v20-donut-center-metric donut-center">
          <strong
            id="chart-total"
            className="v20-donut-center-number"
            data-testid="v20-donut-center-total"
          >
            {displayValue}
          </strong>
          <span
            id="chart-label"
            className="v20-donut-center-label"
            data-testid="v20-donut-center-label"
          >
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Donut Legend positioned below the square chart ring */}
      <div className="v20-donut-legend-grid legend">
        {segments.map((segment, idx) => {
          const isSelected = selectedSegmentId === segment.id;
          return (
            <button
              key={segment.id}
              type="button"
              data-legend={idx}
              data-value={segment.value}
              aria-pressed={isSelected}
              className={`v20-legend-item ${isSelected ? 'is-active' : ''}`}
              style={{
                cursor: 'pointer',
                opacity: selectedSegmentId ? (isSelected ? 1 : 0.45) : 0.9,
                transition: 'opacity 200ms ease',
                background: 'transparent',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px',
                borderRadius: '8px',
              }}
              onMouseEnter={() => setSelectedSegmentId(segment.id)}
              onMouseLeave={() => setSelectedSegmentId(null)}
              onClick={() => toggleHighlight(segment.id)}
            >
              <span
                className="v20-legend-dot"
                style={{
                  backgroundColor: segment.color,
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  flexShrink: 0,
                  boxShadow: isSelected ? `0 0 10px ${segment.color}` : 'none',
                }}
              />
              <span className="v20-legend-label" style={{ fontSize: '13px', color: 'var(--v20-text-secondary)', fontWeight: 500 }}>
                {segment.label}
              </span>
              <strong className="v20-legend-val" style={{ marginLeft: 'auto', fontSize: '13.5px', color: 'var(--v20-text-primary)', fontFamily: 'var(--v20-font-number)' }}>
                {segment.value}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
};
