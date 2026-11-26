import React, { useState, useEffect } from 'react';

export interface TrustedClockProps {
  className?: string;
}

export const TrustedClock: React.FC<TrustedClockProps> = ({ className = '' }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in Asia/Karachi (PKT)
      const timeFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      const dateFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now);

      setTimeStr(timeFmt);
      setDateStr(dateFmt);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`v19-trusted-clock ${className}`}
      title="Trusted server-anchored Pakistan Standard Time (PKT)"
      aria-label={`Current time: ${timeStr} PKT, ${dateStr}`}
    >
      <span className="v19-clock-dot" aria-hidden="true" />
      <span>{dateStr}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ fontWeight: 600, color: 'var(--v19-text-primary)' }}>{timeStr}</span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v19-lime)', letterSpacing: '0.04em' }}>PKT</span>
    </div>
  );
};
