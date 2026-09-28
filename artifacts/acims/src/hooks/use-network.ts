import { useEffect, useState, useCallback } from 'react';

const SIMULATE_KEY = 'acims-simulate-offline';

export function useNetworkStatus() {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SIMULATE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    const handleCustomChange = () => {
      try {
        setIsSimulatedOffline(sessionStorage.getItem(SIMULATE_KEY) === 'true');
      } catch {}
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('acims-network-state-change', handleCustomChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('acims-network-state-change', handleCustomChange);
    };
  }, []);

  const isOnline = browserOnline && !isSimulatedOffline;

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(SIMULATE_KEY, String(next));
      } catch {}
      window.dispatchEvent(new Event('acims-network-state-change'));
      return next;
    });
  }, []);

  const setSimulatedOffline = useCallback((val: boolean) => {
    setIsSimulatedOffline(val);
    try {
      sessionStorage.setItem(SIMULATE_KEY, String(val));
    } catch {}
    window.dispatchEvent(new Event('acims-network-state-change'));
  }, []);

  return {
    isOnline,
    browserOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    setSimulatedOffline,
  };
}
