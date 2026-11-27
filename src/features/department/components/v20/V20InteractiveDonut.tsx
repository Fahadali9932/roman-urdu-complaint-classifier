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

export const V20InteractiveDonut: React.FC<V20InteractiveDonutProps> = ({
  segments,
  periodLabel,
  totalCases,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<DonutSegment | null>(null);

  // SVG dimensions
  const size = 320;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate total sum of segment values
  const sum = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  // Display value and label at the center of the donut
  const displayValue = hoveredSegment ? hoveredSegment.value : totalCases;
  const displayLabel = hoveredSegment ? hoveredSegment.label : `${periodLabel.toUpperCase()} CASES`;

  // Gap between slices in radians/strokeDashoffset
  const gapPx = 6;
  let accumulatedAngle = 0;

  const toggleHighlight = (seg: DonutSegment) => {
    setHoveredSegment((prev) => (prev?.id === seg.id ? null : seg));
  };

  return (
    <div className="v20-donut-svg-wrapper donut" data-testid="v20-donut-chart">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
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

        {/* Render separated slices */}
        {segments.map((segment, idx) => {
          const percentage = segment.value / sum;
          const sliceLength = Math.max(0, percentage * circumference - gapPx);
          const dashArray = `${sliceLength} ${circumference - sliceLength}`;
          const currentOffset = -accumulatedAngle;
          accumulatedAngle += percentage * circumference;

          const isHovered = hoveredSegment?.id === segment.id;

          return (
            <circle
              key={segment.id}
              data-slice={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={currentOffset}
              strokeLinecap="round"
              filter="url(#v20-donut-glow)"
              style={{
                cursor: 'pointer',
                transition: 'stroke-width 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
                opacity: hoveredSegment ? (isHovered ? 1 : 0.28) : 0.95,
              }}
              onMouseEnter={() => setHoveredSegment(segment)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => toggleHighlight(segment)}
            />
          );
        })}
      </svg>

      {/* Central Metric (Pure standalone typography at the heart of the donut) */}
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

      {/* Donut Legend */}
      <div className="v20-donut-legend-grid legend">
        {segments.map((segment, idx) => {
          const isHovered = hoveredSegment?.id === segment.id;
          return (
            <button
              key={segment.id}
              type="button"
              data-legend={idx}
              data-value={segment.value}
              aria-pressed={isHovered}
              className={`v20-legend-item ${isHovered ? 'is-active' : ''}`}
              style={{
                cursor: 'pointer',
                opacity: hoveredSegment ? (isHovered ? 1 : 0.45) : 0.9,
                transition: 'opacity 200ms ease',
                background: 'transparent',
                border: 0,
                textAlign: 'left',
              }}
              onMouseEnter={() => setHoveredSegment(segment)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => toggleHighlight(segment)}
            >
              <i
                className="v20-legend-dot"
                style={{
                  background: segment.color,
                  boxShadow: `0 0 8px ${segment.color}66`,
                  display: 'inline-block',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  marginRight: '8px',
                }}
              />
              <span style={{ fontWeight: isHovered ? 600 : 400 }}>
                {segment.label}
              </span>
              <strong style={{ marginLeft: 'auto', fontWeight: 600, paddingLeft: '8px' }}>
                {segment.value}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
};
