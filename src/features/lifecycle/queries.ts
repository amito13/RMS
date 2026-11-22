import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { invalidateMoney, RpcError } from '../money/queries';
import { propertiesKey, unitsKey } from '../properties/queries';
import { tenantKey } from '../tenants/queries';

type PgResult = { data: unknown; error: { message: string; code?: string } | null };

function unwrap<T>({ data, error }: PgResult): T {
  if (error) throw new RpcError(error.message, error.code);
  return data as T;
}

/** Refreshes everything a lifecycle change can touch, including unit occupancy. */
function useRefresh(tenancyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      invalidateMoney(queryClient, tenancyId),
      queryClient.invalidateQueries({ queryKey: unitsKey }),
      queryClient.invalidateQueries({ queryKey: propertiesKey }),
    ]);
}

export function useRenewAgreement(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (i: { startDate: string; termMonths: number; newRent?: number; rentFrom?: string }) =>
      unwrap<string>(
        await supabase.rpc('renew_agreement', {
          p_tenancy_id: tenancyId,
          p_start_date: i.startDate,
          p_term_months: i.termMonths,
          p_new_rent: i.newRent ?? null,
          p_rent_effective_from: i.rentFrom ?? null,
        })
      ),
    onSuccess: refresh,
  });
}

export function useMoveRenewalDate(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (i: { agreementId: string; newDate: string; reason?: string }) =>
      unwrap<null>(
        await supabase.rpc('reschedule_agreement', {
          p_agreement_id: i.agreementId,
          p_new_date: i.newDate,
          p_reason: i.reason || null,
        })
      ),
    onSuccess: refresh,
  });
}

export function useRecordNotice(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (i: { givenBy: 'tenant' | 'landlord'; noticeDate: string; moveOutDate: string; reason?: string }) =>
      unwrap<string>(
        await supabase.rpc('record_notice', {
          p_tenancy_id: tenancyId,
          p_given_by: i.givenBy,
          p_notice_date: i.noticeDate,
          p_planned_move_out_date: i.moveOutDate,
          p_reason: i.reason || null,
        })
      ),
    onSuccess: refresh,
  });
}

export function useChangeMoveOutDate(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (i: { newDate: string; reason?: string }) =>
      unwrap<null>(
        await supabase.rpc('change_move_out_date', {
          p_tenancy_id: tenancyId,
          p_new_date: i.newDate,
          p_reason: i.reason || null,
        })
      ),
    onSuccess: refresh,
  });
}

export function useWithdrawNotice(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (reason: string) =>
      unwrap<null>(await supabase.rpc('withdraw_notice', { p_tenancy_id: tenancyId, p_reason: reason || null })),
    onSuccess: refresh,
  });
}

export type Settlement = { outstanding: number; refund_due: number; advance_used: number; waived: number };

export function useEndTenancy(tenancyId: string) {
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (i: { moveOutDate: string; useAdvance: boolean; waiveRemaining: boolean; waiveReason?: string }) =>
      unwrap<Settlement>(
        await supabase.rpc('end_tenancy', {
          p_tenancy_id: tenancyId,
          p_move_out_date: i.moveOutDate,
          p_use_advance: i.useAdvance,
          p_waive_remaining: i.waiveRemaining,
          p_waive_reason: i.waiveReason || null,
        })
      ),
    onSuccess: refresh,
  });
}

export type TenantEdits = {
  tenant: {
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
  tenancy: { monthly_rent: number; rent_due_day: number; notice_period_days: number };
};

/** Saves tenant details and tenancy terms (PRD TEN-6). Rent and due day apply to months not yet created. */
export function useEditTenant(tenancyId: string, tenantId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefresh(tenancyId);
  return useMutation({
    mutationFn: async (e: TenantEdits) => {
      unwrap(await supabase.from('tenants').update(e.tenant).eq('id', tenantId));
      unwrap(await supabase.from('tenancies').update(e.tenancy).eq('id', tenancyId));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantKey(tenantId) });
      await refresh();
    },
  });
}
