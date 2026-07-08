import { useCallback, useEffect } from 'react';
import { usageService } from '@/services/usage.service';
import { useUsageStore } from '@/stores/usage.store';

// Polls /usage/status on mount + every 20s; refresh() is called after each message.
export function useUsage() {
  const setStatus = useUsageStore((s) => s.setStatus);

  const refresh = useCallback(() => {
    usageService
      .status()
      .then(setStatus)
      .catch(() => {});
  }, [setStatus]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  return { refresh };
}
