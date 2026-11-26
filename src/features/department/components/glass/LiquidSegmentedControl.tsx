import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface LiquidSegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}

/**
 * Apple-style segmented control with an animated sliding translucent capsule
 * anchored directly to the active option geometry.
 */
export function LiquidSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: LiquidSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const measure = () => {
    const activeIndex = options.findIndex((o) => o.id === value);
    const activeBtn = activeIndex >= 0 ? btnRefs.current[activeIndex] : null;
    if (!activeBtn) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
      ready: activeBtn.offsetWidth > 0,
    });
  };

  useLayoutEffect(() => {
    measure();
  }, [value, options]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className="lg-segmented"
      role="group"
      aria-label={ariaLabel}
    >
      {indicator.ready && (
        <span
          className="lg-segmented-indicator"
          aria-hidden="true"
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      )}
      {options.map((opt, idx) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              btnRefs.current[idx] = el;
            }}
            type="button"
            className="lg-segmented-btn"
            aria-pressed={active}
            style={size === 'sm' ? { minHeight: '28px', padding: '0 10px', fontSize: '12px' } : undefined}
            onClick={() => onChange(opt.id)}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span style={{ opacity: active ? 0.85 : 0.65, fontVariantNumeric: 'tabular-nums' }}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
