import React, { useEffect, useState } from 'react';

export interface WatermarkOverlayProps {
  userId?: string;
  departmentCode?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  userId = 'STAFF-AUTH',
  departmentCode = 'KMC',
}) => {
  const [stamp] = useState<string>(() => {
    const now = new Date();
    const timeFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
    return `${departmentCode} · ${userId} · ${timeFmt} PKT`;
  });

  useEffect(() => {
    // Visibility-change listener to conceal sensitive content when tab/window is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        document.body.classList.add('v19-window-hidden');
      } else {
        document.body.classList.remove('v19-window-hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.body.classList.remove('v19-window-hidden');
    };
  }, [userId, departmentCode]);

  // Repeated grid elements for background watermarking
  const items = Array.from({ length: 18 });

  return (
    <div className="v19-watermark-overlay" aria-hidden="true">
      {items.map((_, i) => (
        <span key={i}>
          {stamp} · OFFICIAL USE ONLY
        </span>
      ))}
    </div>
  );
};
