import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type {
  PaymentMode,
  PaymentRow,
  RentChargeHistory,
  TenancyPaymentStats,
} from '@/lib/db-types';
import { supabase } from '@/lib/supabase';

import { tenancyKeys } from '../tenants/queries';

/** An error from a database function, keeping its code (e.g. R0001 = more than owed). */
export class RpcError extends Error {
  constructor(
    message: string,
    public code?: string,
    public detail?: string
  ) {
    super(message);
  }
}

type PgResult = { data: unknown; error: { message: string; code?: string; details?: string } | null };

function unwrap<T>({ data, error }: PgResult): T {
  if (error) throw new RpcError(error.message, error.code, error.details ?? undefined);
  return data as T;
}

export const moneyKeys = {
  payments: (tenancyId: string) => ['payments', tenancyId] as const,
  history: (tenancyId: string) => ['rent_charge_history', tenancyId] as const,
  stats: (tenancyId: string) => ['tenancy_payment_stats', tenancyId] as const,
  collected: ['collected_this_month'] as const,
};

/** Everything that changes when money moves for a tenancy. */
export function invalidateMoney(queryClient: QueryClient, tenancyId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: tenancyKeys.all }),
    queryClient.invalidateQueries({ queryKey: tenancyKeys.charges(tenancyId) }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.payments(tenancyId) }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.history(tenancyId) }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.stats(tenancyId) }),
    queryClient.invalidateQueries({ queryKey: moneyKeys.collected }),
    queryClient.invalidateQueries({ queryKey: ['notes'] }),
  ]);
}

export function usePayments(tenancyId: string) {
  return useQuery({
    queryKey: moneyKeys.payments(tenancyId),
    queryFn: async () =>
      unwrap<PaymentRow[]>(
        await supabase
          .from('payments')
          .select(
            'id, tenancy_id, rent_charge_id, kind, amount, paid_on, mode, reference, note, voided_at, void_reason, created_at'
          )
          .eq('tenancy_id', tenancyId)
          .order('paid_on', { ascending: false })
          .order('created_at', { ascending: false })
      ),
  });
}

export function useChargeHistory(tenancyId: string) {
  return useQuery({
    queryKey: moneyKeys.history(tenancyId),
    queryFn: async () =>
      unwrap<RentChargeHistory[]>(
        await supabase
          .from('rent_charge_history')
          .select('*')
          .eq('tenancy_id', tenancyId)
          .order('period_month', { ascending: false })
      ),
  });
}

export function usePaymentStats(tenancyId: string) {
  return useQuery({
    queryKey: moneyKeys.stats(tenancyId),
    queryFn: async () =>
      unwrap<TenancyPaymentStats | null>(
        await supabase.from('tenancy_payment_stats').select('*').eq('tenancy_id', tenancyId).maybeSingle()
      ),
  });
}

/** Rent received this calendar month (cash, UPI etc.; not money moved from advance). */
export function useCollectedThisMonth(monthStart: string) {
  return useQuery({
    queryKey: [...moneyKeys.collected, monthStart],
    queryFn: async () => {
      const rows = unwrap<{ amount: number }[]>(
        await supabase
          .from('payments')
          .select('amount')
          .eq('kind', 'rent')
          .neq('mode', 'from_advance')
          .is('voided_at', null)
          .gte('paid_on', monthStart)
      );
      return rows.reduce((sum, r) => sum + r.amount, 0);
    },
  });
}

export type RecordPaymentInput = {
  tenancyId: string;
  amount: number;
  paidOn: string;
  mode: PaymentMode;
  reference?: string;
  note?: string;
  rentChargeId?: string;
  excessToAdvance?: boolean;
};

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: RecordPaymentInput) =>
      unwrap<{ payment_ids: string[]; applied_to_rent: number; kept_as_advance: number }>(
        await supabase.rpc('record_payment', {
          p_tenancy_id: i.tenancyId,
          p_amount: i.amount,
          p_paid_on: i.paidOn,
          p_mode: i.mode,
          p_reference: i.reference || null,
          p_note: i.note || null,
          p_rent_charge_id: i.rentChargeId ?? null,
          p_excess_to_advance: i.excessToAdvance ?? false,
        })
      ),
    onSuccess: (_data, i) => invalidateMoney(queryClient, i.tenancyId),
  });
}

/** Records advance received (not linked to a month). */
export function useRecordAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: { tenancyId: string; amount: number; paidOn: string; mode: PaymentMode; reference?: string }) =>
      unwrap<null>(
        await supabase.from('payments').insert({
          tenancy_id: i.tenancyId,
          kind: 'advance',
          amount: i.amount,
          paid_on: i.paidOn,
          mode: i.mode,
          reference: i.reference || null,
        })
      ),
    onSuccess: (_data, i) => invalidateMoney(queryClient, i.tenancyId),
  });
}

export function useRescheduleCharge(tenancyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: { chargeId: string; newDate: string; reason?: string }) =>
      unwrap<null>(
        await supabase.rpc('reschedule_rent_charge', {
          p_rent_charge_id: i.chargeId,
          p_new_date: i.newDate,
          p_reason: i.reason || null,
        })
      ),
    onSuccess: () => invalidateMoney(queryClient, tenancyId),
  });
}

export function useWaiveCharge(tenancyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: { chargeId: string; reason: string }) =>
      unwrap<null>(
        await supabase.rpc('waive_rent_charge', { p_rent_charge_id: i.chargeId, p_reason: i.reason })
      ),
    onSuccess: () => invalidateMoney(queryClient, tenancyId),
  });
}

/** Marks a payment as a mistake. It stays in history, struck through (PRD RENT-7). */
export function useVoidPayment(tenancyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: { paymentId: string; reason: string }) =>
      unwrap<null>(
        await supabase
          .from('payments')
          .update({ voided_at: new Date().toISOString(), void_reason: i.reason })
          .eq('id', i.paymentId)
      ),
    onSuccess: () => invalidateMoney(queryClient, tenancyId),
  });
}
