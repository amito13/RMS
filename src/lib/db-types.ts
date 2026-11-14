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

export type TenancyStatus = 'active' | 'on_notice' | 'ended';
export type RentStatus = 'overdue' | 'due_today' | 'partly_paid' | 'upcoming' | 'paid';
export type ChargeStatus = 'overdue' | 'due_today' | 'partly_paid' | 'upcoming' | 'paid' | 'waived';
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque' | 'from_advance' | 'other';

export type DocType =
  | 'aadhaar_front'
  | 'aadhaar_back'
  | 'aadhaar_pdf'
  | 'pan'
  | 'rental_agreement'
  | 'police_verification'
  | 'photo'
  | 'other';

export type NoteKind =
  | 'general'
  | 'payment_promise'
  | 'renewal'
  | 'complaint'
  | 'reschedule'
  | 'rent_change'
  | 'waiver'
  | 'notice'
  | 'move_out';

/** Row of the tenancy_summaries view. Dates are 'YYYY-MM-DD' strings. */
export type TenancySummary = {
  tenancy_id: string;
  status: TenancyStatus;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  member_count: number;
  unit_id: string;
  unit_name: string;
  unit_type: UnitType;
  property_id: string;
  property_name: string;
  shift_date: string;
  move_out_date: string | null;
  monthly_rent: number;
  rent_due_day: number;
  notice_period_days: number;
  as_of: string;
  outstanding: number;
  overdue_amount: number;
  oldest_overdue_date: string | null;
  days_overdue: number;
  due_today_amount: number;
  next_due_date: string | null;
  next_due_amount: number | null;
  next_original_due_date: string | null;
  last_paid_on: string | null;
  last_paid_amount: number | null;
  rent_status: RentStatus;
  advance_agreed: number;
  advance_received: number;
  advance_pending: number;
  advance_used: number;
  advance_balance: number;
  agreement_id: string | null;
  agreement_start_date: string | null;
  agreement_term_months: number | null;
  agreement_end_date: string | null;
  agreement_reminder_date: string | null;
  notice_id: string | null;
  notice_given_by: 'tenant' | 'landlord' | null;
  notice_date: string | null;
  planned_move_out_date: string | null;
  is_short_notice: boolean | null;
  short_by_days: number | null;
  has_aadhaar: boolean;
  latest_note: string | null;
  latest_note_at: string | null;
};

export type Tenant = {
  id: string;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  member_count: number;
  permanent_address: string | null;
  occupation: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  aadhaar_last4: string | null;
};

/** Row of the rent_charge_balances view. */
export type RentChargeBalance = {
  rent_charge_id: string;
  tenancy_id: string;
  period_month: string;
  amount_due: number;
  waived_amount: number;
  original_due_date: string;
  due_date: string;
  paid: number;
  outstanding: number;
  status: ChargeStatus;
  days_overdue: number;
};

export type DocumentRow = {
  id: string;
  tenant_id: string;
  doc_type: DocType;
  label: string | null;
  storage_path: string;
  mime_type: 'image/jpeg' | 'image/png' | 'application/pdf';
  size_bytes: number;
  upload_status: 'pending' | 'uploaded' | 'failed';
  created_at: string;
};

export type NoteRow = {
  id: string;
  tenant_id: string;
  tenancy_id: string | null;
  kind: NoteKind;
  body: string;
  pinned: boolean;
  is_system: boolean;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  tenancy_id: string;
  rent_charge_id: string | null;
  kind: 'rent' | 'advance';
  amount: number;
  paid_on: string;
  mode: PaymentMode;
  reference: string | null;
  note: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
};

export type HistoryResult =
  | 'on_time'
  | 'late_promise_kept'
  | 'late'
  | 'promised'
  | 'waived'
  | 'unpaid'
  | 'not_due';

/** Row of the rent_charge_history view (balance columns plus these). */
export type RentChargeHistory = RentChargeBalance & {
  settled_on: string | null;
  payment_count: number;
  was_rescheduled: boolean;
  result: HistoryResult;
  days_late: number;
  promise_kept: boolean | null;
};

/** Row of the tenancy_payment_stats view. */
export type TenancyPaymentStats = {
  tenancy_id: string;
  months_counted: number;
  months_on_time: number;
  months_late: number;
  average_days_late: number;
  longest_days_late: number;
  longest_delay_month: string | null;
  promises_made: number;
  promises_kept: number;
  total_paid: number;
  total_paid_this_financial_year: number;
  total_waived: number;
  payment_habit: 'usually_on_time' | 'sometimes_late' | 'often_late' | null;
};

export type NewTenantInput = {
  tenant: {
    full_name: string;
    phone: string;
    alt_phone?: string;
    member_count: number;
    permanent_address?: string;
    occupation?: string;
    emergency_name?: string;
    emergency_phone?: string;
    aadhaar_last4?: string;
  };
  tenancy: {
    unit_id: string;
    shift_date: string;
    monthly_rent: number;
    rent_due_day: number;
    first_due_date: string;
    advance_agreed: number;
    notice_period_days: number;
  };
  agreement: { start_date: string; term_months: number };
  advance?: { amount: number; mode: PaymentMode };
};

export type NewProperty = {
  name: string;
  address_line: string;
  locality: string;
  city: string;
  pincode?: string;
};
