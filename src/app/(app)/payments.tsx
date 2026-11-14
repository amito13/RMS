import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { MODE_LABEL } from '@/features/money/labels';
import { usePayments } from '@/features/money/queries';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { parseDay } from '@/lib/dates';
import type { PaymentMode } from '@/lib/db-types';
import { formatDate, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

/** Every payment for a tenancy, rent and advance, as one timeline (PRD HIST-6). */
export default function AllPayments() {
  const { tenancyId } = useLocalSearchParams<{ tenancyId: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const payments = usePayments(tenancyId);
  const charges = useRentCharges(tenancyId);
  const [mode, setMode] = useState<PaymentMode | 'all'>('all');
  const [year, setYear] = useState<string>('all');

  const monthOf = useMemo(
    () => new Map((charges.data ?? []).map((c) => [c.rent_charge_id, parseDay(c.period_month)])),
    [charges.data]
  );
  const years = [...new Set((payments.data ?? []).map((p) => p.paid_on.slice(0, 4)))];
  const modes = [...new Set((payments.data ?? []).map((p) => p.mode))];
  const list = (payments.data ?? []).filter(
    (p) => (mode === 'all' || p.mode === mode) && (year === 'all' || p.paid_on.startsWith(year))
  );
  const total = list.filter((p) => !p.voided_at).reduce((s, p) => s + p.amount, 0);

  return (
    <Screen
      scroll
      header={{
        onBack: () => router.back(),
        overline: summary.data ? `${summary.data.tenant_name}, ${summary.data.unit_name}` : undefined,
        title: 'All payments',
      }}>
      <View style={styles.filters}>
        {modes.length > 1 ? (
          <ChoiceChips
            options={[{ value: 'all' as const, label: 'Any way' }, ...modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))]}
            value={mode}
            onChange={setMode}
          />
        ) : null}
        {years.length > 1 ? (
          <ChoiceChips
            options={[{ value: 'all', label: 'All years' }, ...years.map((y) => ({ value: y, label: y }))]}
            value={year}
            onChange={setYear}
          />
        ) : null}
      </View>

      <View style={styles.totalRow}>
        <Text tone="inkMuted">
          {list.length} {list.length === 1 ? 'payment' : 'payments'}
        </Text>
        <Text variant="amount">{formatINR(total)}</Text>
      </View>

      {payments.isPending ? <Text tone="inkMuted">Loading…</Text> : null}
      {!payments.isPending && list.length === 0 ? <Text tone="inkMuted">No payments recorded yet.</Text> : null}

      {list.map((p, i) => {
        const voided = !!p.voided_at;
        const forWhat =
          p.kind === 'advance'
            ? 'Advance'
            : p.rent_charge_id && monthOf.get(p.rent_charge_id)
              ? `${monthOf.get(p.rent_charge_id)!.toLocaleString('en-IN', { month: 'long' })} rent`
              : 'Rent';
        return (
          <View key={p.id} style={[styles.row, { borderColor: colors.rule }, i === 0 && styles.first]}>
            <View style={styles.flex}>
              <Text variant="bodyStrong" tone={voided ? 'inkFaint' : 'ink'} style={voided && styles.struck}>
                {forWhat}
              </Text>
              <Text variant="caption" tone="inkMuted">
                {formatDate(parseDay(p.paid_on), new Date(0))}, {MODE_LABEL[p.mode]}
                {p.reference ? `, ${p.reference}` : ''}
              </Text>
              {voided ? (
                <Text variant="caption" tone="inkMuted">
                  Marked as a mistake: {p.void_reason}
                </Text>
              ) : null}
            </View>
            <Text variant="amount" tone={voided ? 'inkFaint' : 'ink'} style={voided && styles.struck}>
              {formatINR(p.amount)}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { gap: space.sm, marginBottom: space.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  first: { borderTopWidth: StyleSheet.hairlineWidth },
  struck: { textDecorationLine: 'line-through' },
});
