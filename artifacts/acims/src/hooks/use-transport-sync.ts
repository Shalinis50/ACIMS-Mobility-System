import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTransportSync } from '@/lib/realtime-location';
import { getListBusesQueryKey } from '@workspace/api-client-react';

/**
 * Automatically invalidates and refetches all student transport queries
 * whenever the Admin publishes or updates any bus, route, shift, or driver.
 */
export function useTransportSync(onSyncCallback?: (event: any) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribeToTransportSync((event) => {
      // Invalidate student transport schedule & daily shifts
      void queryClient.invalidateQueries({ queryKey: ['student', 'transport-schedule'] });
      void queryClient.invalidateQueries({ queryKey: ['mobility', 'daily-shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['mobility', 'shifts'] });

      // Invalidate fleet buses queries
      void queryClient.invalidateQueries({ queryKey: ['buses'] });
      void queryClient.invalidateQueries({ queryKey: getListBusesQueryKey() });

      // Invalidate student specific assignments & pickups
      void queryClient.invalidateQueries({ queryKey: ['student', 'my-bus'] });
      void queryClient.invalidateQueries({ queryKey: ['mvp', 'college-route'] });
      void queryClient.invalidateQueries({ queryKey: ['mobility', 'pickup-points'] });
      void queryClient.invalidateQueries({ queryKey: ['mobility', 'eta'] });

      onSyncCallback?.(event);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, onSyncCallback]);
}
