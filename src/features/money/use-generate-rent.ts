import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

import { tenancyKeys } from '../tenants/queries';

const MIN_INTERVAL = 60 * 60 * 1000; // at most once an hour
let lastRun = 0;

/**
 * Creates any missing monthly rent for the signed-in landlord's tenancies when
 * the app opens or comes back to the foreground. The daily pg_cron job does
 * the same for everyone; this is the backup (see supabase/migrations/*_cron.sql).
 */
export function useGenerateRentOnOpen() {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function run() {
      if (Date.now() - lastRun < MIN_INTERVAL) return;
      lastRun = Date.now();
      const { data, error } = await supabase.rpc('generate_rent_charges');
      if (error) {
        lastRun = 0; // try again next time
        return;
      }
      if ((data as number) > 0) {
        await queryClient.invalidateQueries({ queryKey: tenancyKeys.all });
        await queryClient.invalidateQueries({ queryKey: ['rent_charges'] });
      }
    }

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [queryClient]);
}
