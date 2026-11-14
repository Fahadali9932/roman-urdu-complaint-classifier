import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff } from 'lucide-react';

export const DepartmentPortalLayout: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register PWA service worker scoped strictly to /department
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      import.meta.env.MODE !== 'test'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/department' })
        .then(() => {
          // Registered successfully
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration non-blocking:', err);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen w-full text-[#111827] selection:bg-[#111827] selection:text-white">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-950/90 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs flex items-center justify-center gap-2 text-center z-50 sticky top-0 backdrop-blur-md"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Application Shell Loaded (Offline)</strong> — Live complaint synchronization and authentication require an active network connection.
          </span>
        </div>
      )}
      <Outlet />
    </div>
  );
};
