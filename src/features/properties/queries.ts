import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { NewProperty, NewUnit, Property, UnitOccupancy } from '@/lib/db-types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export const propertiesKey = ['properties'] as const;
export const unitsKey = ['unit_occupancy'] as const;

export function useProperties() {
  return useQuery({
    queryKey: propertiesKey,
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address_line, locality, city, pincode, notes, archived_at, created_at')
        .is('archived_at', null)
        .order('created_at');
      if (error) throw new Error(error.message);
      return data as Property[];
    },
  });
}

/** Every current unit with its occupancy, across all properties. */
export function useUnits() {
  return useQuery({
    queryKey: unitsKey,
    queryFn: async (): Promise<UnitOccupancy[]> => {
      const { data, error } = await supabase
        .from('unit_occupancy')
        .select('*')
        .is('archived_at', null)
        .order('name');
      if (error) throw new Error(error.message);
      return data as UnitOccupancy[];
    },
  });
}

/** Saves a property and all its units in one transaction (create_property_with_units). */
export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: { property: NewProperty; units: NewUnit[] }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_property_with_units', {
        p_property: input.property,
        p_units: input.units,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: propertiesKey }),
        queryClient.invalidateQueries({ queryKey: unitsKey }),
        queryClient.invalidateQueries({ queryKey: ['profile', session?.user.id] }),
      ]);
    },
  });
}
