import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  DocumentRow,
  NewTenantInput,
  NoteKind,
  NoteRow,
  RentChargeBalance,
  Tenant,
  TenancySummary,
} from '@/lib/db-types';
import { supabase } from '@/lib/supabase';

import { propertiesKey, unitsKey } from '../properties/queries';

export const tenancyKeys = {
  all: ['tenancy_summaries'] as const,
  charges: (tenancyId: string) => ['rent_charges', tenancyId] as const,
};
export const tenantKey = (tenantId: string) => ['tenant', tenantId] as const;
export const documentsKey = (tenantId: string) => ['documents', tenantId] as const;
export const notesKey = (tenantId: string) => ['notes', tenantId] as const;

function unwrap<T>({ data, error }: { data: unknown; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/** Every tenancy (current and moved out), newest first. */
export function useTenancySummaries() {
  return useQuery({
    queryKey: tenancyKeys.all,
    queryFn: async () =>
      unwrap<TenancySummary[]>(
        await supabase.from('tenancy_summaries').select('*').order('shift_date', { ascending: false })
      ),
  });
}

/** One tenancy, read from the shared list so the tenant screen opens instantly. */
export function useTenancySummary(tenancyId: string) {
  const query = useTenancySummaries();
  return { ...query, data: query.data?.find((t) => t.tenancy_id === tenancyId) };
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: tenantKey(tenantId ?? ''),
    enabled: !!tenantId,
    queryFn: async () =>
      unwrap<Tenant>(
        await supabase
          .from('tenants')
          .select(
            'id, full_name, phone, alt_phone, member_count, permanent_address, occupation, emergency_name, emergency_phone, aadhaar_last4'
          )
          .eq('id', tenantId!)
          .single()
      ),
  });
}

export function useRentCharges(tenancyId: string) {
  return useQuery({
    queryKey: tenancyKeys.charges(tenancyId),
    queryFn: async () =>
      unwrap<RentChargeBalance[]>(
        await supabase
          .from('rent_charge_balances')
          .select(
            'rent_charge_id, tenancy_id, period_month, amount_due, waived_amount, original_due_date, due_date, paid, outstanding, status, days_overdue'
          )
          .eq('tenancy_id', tenancyId)
          .order('period_month', { ascending: false })
      ),
  });
}

export function useDocuments(tenantId: string | undefined) {
  return useQuery({
    queryKey: documentsKey(tenantId ?? ''),
    enabled: !!tenantId,
    queryFn: async () =>
      unwrap<DocumentRow[]>(
        await supabase
          .from('documents')
          .select('id, tenant_id, doc_type, label, storage_path, mime_type, size_bytes, upload_status, created_at')
          .eq('tenant_id', tenantId!)
          .order('created_at')
      ),
  });
}

export function useNotes(tenantId: string | undefined) {
  return useQuery({
    queryKey: notesKey(tenantId ?? ''),
    enabled: !!tenantId,
    queryFn: async () =>
      unwrap<NoteRow[]>(
        await supabase
          .from('notes')
          .select('id, tenant_id, tenancy_id, kind, body, pinned, is_system, created_at')
          .eq('tenant_id', tenantId!)
          .order('created_at', { ascending: false })
      ),
  });
}

/** Tenant + tenancy + agreement + advance + first rent, in one transaction. */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTenantInput) =>
      unwrap<{ tenant_id: string; tenancy_id: string }>(
        await supabase.rpc('create_tenant', {
          p_tenant: input.tenant,
          p_tenancy: input.tenancy,
          p_agreement: input.agreement,
          p_advance: input.advance ?? null,
        })
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tenancyKeys.all }),
        queryClient.invalidateQueries({ queryKey: unitsKey }),
        queryClient.invalidateQueries({ queryKey: propertiesKey }),
      ]),
  });
}

export function useAddNote(tenantId: string, tenancyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: NoteKind; body: string }) =>
      unwrap<null>(
        await supabase
          .from('notes')
          .insert({ tenant_id: tenantId, tenancy_id: tenancyId, kind: input.kind, body: input.body })
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: notesKey(tenantId) }),
        queryClient.invalidateQueries({ queryKey: tenancyKeys.all }),
      ]),
  });
}

export function useDeleteNote(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) =>
      unwrap<null>(await supabase.from('notes').delete().eq('id', noteId)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: notesKey(tenantId) }),
        queryClient.invalidateQueries({ queryKey: tenancyKeys.all }),
      ]),
  });
}
