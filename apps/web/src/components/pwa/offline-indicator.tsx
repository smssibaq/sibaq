import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-primary/95 text-primary-foreground px-4 py-2 text-xs font-bold shadow-lg backdrop-blur animate-in slide-in-from-top duration-200"
      >
        <Wifi className="h-4 w-4" />
        <span>You are back online. Supabase sync restored.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-600/95 text-white px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur animate-in slide-in-from-top duration-200"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You are currently offline. Cached pages are viewable, but match changes and squad updates require an active internet connection.
      </span>
    </div>
  );
}
