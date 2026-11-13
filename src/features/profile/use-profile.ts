import { useQuery } from '@tanstack/react-query';

import type { Profile } from '@/lib/db-types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** The signed-in landlord's profile (created by a database trigger on sign-up). */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, timezone, onboarding_completed_at, default_notice_period_days')
        .eq('id', userId!)
        .single();
      if (error) throw new Error(error.message);
      return data as Profile;
    },
  });
}
