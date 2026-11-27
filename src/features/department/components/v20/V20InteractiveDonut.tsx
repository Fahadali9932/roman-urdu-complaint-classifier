import React, { useState } from 'react';

export interface DonutSegment { id: string; label: string; value: number; color: string }
export interface V20InteractiveDonutProps { segments: DonutSegment[]; periodLabel: string; totalCases: number }

export const V20InteractiveDonut: React.FC<V20InteractiveDonutProps> = ({ segments, periodLabel, totalCases }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const focused = segments.find(s => s.id === (hoverId ?? activeId));
  const radius = 135, circumference = 2 * Math.PI * radius;
  const sum = segments.reduce((a, s) => a + Math.max(0, s.value), 0);
  let offset = 0;
  const toggle = (id: string) => setActiveId(old => old === id ? null : id);
  return (
    <div className="v20-donut-svg-wrapper" data-testid="v20-donut-chart">
      <div className="v20-donut-ring">
        <svg viewBox="0 0 320 320" role="img" aria-label={periodLabel + ' case distribution: ' + totalCases}>
          <circle cx="160" cy="160" r={radius} fill="none" stroke="var(--v20-glass-border)" strokeWidth="38"/>
          {segments.filter(s => s.value > 0).map(s => {
            const length = s.value / sum * circumference;
            const gap = sum === s.value ? 0 : Math.min(6, length * 0.2);
            const start = offset;
            offset += length;
            return <circle key={s.id} cx="160" cy="160" r={radius} fill="none" stroke={s.color} strokeWidth={focused?.id === s.id ? 42 : 38} strokeLinecap="butt" strokeDasharray={`${length - gap} ${circumference - length + gap}`} strokeDashoffset={-start - gap / 2} transform="rotate(-90 160 160)" opacity={!focused || focused.id === s.id ? 1 : 0.35} style={{ cursor: 'pointer', transition: 'opacity 200ms ease, stroke-width 200ms ease' }} onMouseEnter={() => setHoverId(s.id)} onMouseLeave={() => setHoverId(null)} onClick={() => toggle(s.id)}/>;
          })}
        </svg>
        <div className="v20-donut-center-metric">
          <span className="v20-donut-center-number" data-testid="v20-donut-center-total">{focused?.value ?? totalCases}</span>
          <span className="v20-donut-center-label" data-testid="v20-donut-center-label">{focused?.label ?? 'Total cases'}</span>
        </div>
      </div>
      <div className="v20-donut-legend-grid">
        {segments.map(s => <button type="button" key={s.id} className="v20-legend-item" aria-pressed={activeId === s.id} onClick={() => toggle(s.id)} onMouseEnter={() => setHoverId(s.id)} onMouseLeave={() => setHoverId(null)} style={{ opacity: !focused || focused.id === s.id ? 1 : 0.45 }}>
          <span className="v20-legend-dot" style={{ background: s.color }}/><span>{s.label}</span><strong>{s.value}</strong>
        </button>)}
      </div>
    </div>
  );
};
