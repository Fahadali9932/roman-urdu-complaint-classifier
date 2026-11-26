import React, { useState, useEffect } from 'react';
import { trustedTimeService } from '../../../../services/trustedTimeService';

export interface TrustedClockProps {
  className?: string;
}

export const TrustedClock: React.FC<TrustedClockProps> = ({ className = '' }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isSynced, setIsSynced] = useState<boolean>(trustedTimeService.isSynced());

  useEffect(() => {
    const updateTime = () => {
      const formatted = trustedTimeService.formatPkt();
      setTimeStr(formatted.timeStr);
      setDateStr(formatted.dateStr);
      setIsSynced(trustedTimeService.isSynced());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`v19-trusted-clock ${className}`}
      data-testid="v19-trusted-clock"
      title={isSynced ? 'Trusted server-anchored Pakistan Standard Time (PKT)' : 'Local monotonic reference (Asia/Karachi PKT)'}
      aria-label={`Current time: ${timeStr} PKT, ${dateStr}`}
    >
      <span className="v19-clock-dot" aria-hidden="true" style={{ background: isSynced ? 'var(--v19-green)' : 'var(--v19-amber)' }} />
      <span>{dateStr}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ fontWeight: 600, color: 'var(--v19-text-primary)' }}>{timeStr}</span>
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--v19-lime)', letterSpacing: '0.04em' }}>PKT</span>
    </div>
  );
};
