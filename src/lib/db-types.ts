/**
 * Row types for the parts of the database the app reads so far.
 * Mirrors supabase/migrations (see docs/database.md).
 *
 * TODO: replace with generated types once the Supabase CLI has access:
 *   bunx supabase login
 *   bunx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type UnitType =
  | 'single_room'
  | '1rk'
  | '1bhk'
  | '2bhk'
  | '3bhk'
  | '4bhk_plus'
  | 'shop'
  | 'other';

export type Profile = {
  id: string;
  full_name: string | null;
  timezone: string;
  onboarding_completed_at: string | null;
  default_notice_period_days: number;
};

export type Property = {
  id: string;
  name: string;
  address_line: string;
  locality: string;
  city: string;
  pincode: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

/** Row of the unit_occupancy view. */
export type UnitOccupancy = {
  unit_id: string;
  property_id: string;
  name: string;
  unit_type: UnitType;
  type_label: string | null;
  floor: string | null;
  monthly_rent: number;
  archived_at: string | null;
  tenancy_id: string | null;
  tenant_name: string | null;
  occupancy: 'vacant' | 'occupied';
  planned_move_out_date: string | null;
  available_from: string | null;
};

/** One unit as sent to create_property_with_units. */
export type NewUnit = {
  name: string;
  unit_type: UnitType;
  type_label?: string;
  floor?: string;
  monthly_rent: number;
};

export type NewProperty = {
  name: string;
  address_line: string;
  locality: string;
  city: string;
  pincode?: string;
};
