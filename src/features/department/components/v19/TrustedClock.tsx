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
      <span className="v19-clock-dot" aria-hidden="true" style={{ background: isSynced ? 'var(--v20-status-solved, #43A047)' : 'var(--v20-accent, #DFA51D)' }} />
      <span>{dateStr}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ fontWeight: 600, color: 'var(--v20-text-primary, #F7EDDC)' }}>{timeStr.slice(0, 5)}</span>
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--v20-text-muted, rgba(247,237,220,0.44))', letterSpacing: '0.04em' }}>PKT</span>
    </div>
  );
};
