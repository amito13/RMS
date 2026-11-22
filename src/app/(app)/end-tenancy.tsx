import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useEndTenancy, type Settlement } from '@/features/lifecycle/queries';
import { previewSettlement } from '@/features/lifecycle/settlement';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { parseDay, toDay, today } from '@/lib/dates';
import { formatDate, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

const full = (d: Date) => formatDate(d, new Date(0));

/** End tenancy and settle up (PRD OUT-1 to OUT-3). Param: tenancyId. */
export default function EndTenancy() {
  const { tenancyId } = useLocalSearchParams<{ tenancyId: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const charges = useRentCharges(tenancyId);
  const endTenancy = useEndTenancy(tenancyId);
  const t = summary.data;

  const planned = t?.planned_move_out_date ? parseDay(t.planned_move_out_date) : null;
  const [moveOut, setMoveOut] = useState<Date | null>(null);
  const [useAdvance, setUseAdvance] = useState<'yes' | 'no'>('yes');
  const [waive, setWaive] = useState<'no' | 'yes'>('no');
  const [waiveReason, setWaiveReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Settlement | null>(null);

  if (!t) return <Screen header={{ onBack: () => router.back(), title: 'End tenancy' }} />;

  if (result) {
    return (
      <Screen
        scroll
        header={{ overline: `${t.tenant_name}, ${t.unit_name}`, title: 'Tenancy ended', subtitle: `${t.unit_name} is vacant now.` }}>
        <View style={styles.form}>
          <Stamp label="Moved out" tone="neutral" />
          {result.advance_used > 0 ? <Line label="Advance used for rent" value={formatINR(result.advance_used)} /> : null}
          {result.waived > 0 ? <Line label="Waived" value={formatINR(result.waived)} /> : null}
          <Line label="Still owed by tenant" value={formatINR(result.outstanding)} tone={result.outstanding > 0 ? 'overdue' : 'ink'} />
          <Line label="Refund due to tenant" value={formatINR(result.refund_due)} />
          <Text tone="inkMuted">
            {t.tenant_name}&apos;s documents, payments and notes stay in the app under Tenants, Moved out.
          </Text>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const latest = today();
  const defaultDate = planned && planned <= latest ? planned : latest;
  const date = moveOut ?? defaultDate;
  const preview = previewSettlement(charges.data ?? [], toDay(date), t.advance_balance, useAdvance === 'yes');
  const canWaive = preview.remaining > 0;

  async function save() {
    setError(null);
    if (canWaive && waive === 'yes' && !waiveReason.trim()) {
      setError('Add a reason for waiving the rest.');
      return;
    }
    try {
      const r = await endTenancy.mutateAsync({
        moveOutDate: toDay(date),
        useAdvance: useAdvance === 'yes',
        waiveRemaining: canWaive && waive === 'yes',
        waiveReason: waiveReason.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t end the tenancy.');
    }
  }

  return (
    <Screen
      scroll
      header={{
        onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: 'End tenancy',
        subtitle: planned ? `Planned move-out: ${full(planned)}` : 'No notice was recorded',
      }}>
      <View style={styles.form}>
        <DateField
          label="Moved out on"
          value={date}
          minimumDate={parseDay(t.shift_date)}
          maximumDate={latest}
          onChange={setMoveOut}
          hint="Rent for months due after this date is dropped."
        />

        <View style={[styles.ledger, { borderColor: colors.rule }]}>
          <Line label="Rent owed" value={formatINR(preview.owed)} tone={preview.owed > 0 ? 'overdue' : 'ink'} />
          <Line label="Advance held" value={formatINR(preview.advanceBalance)} />
        </View>

        {preview.owed > 0 && preview.advanceBalance > 0 ? (
          <ChoiceChips
            label="Use the advance for the rent owed?"
            options={[
              { value: 'yes', label: `Yes, use ${formatINR(Math.min(preview.owed, preview.advanceBalance))}` },
              { value: 'no', label: 'No' },
            ]}
            value={useAdvance}
            onChange={setUseAdvance}
            wrap
          />
        ) : null}

        {canWaive ? (
          <>
            <ChoiceChips
              label={`${formatINR(preview.remaining)} still owed. Waive it?`}
              options={[
                { value: 'no', label: 'No, they still owe it' },
                { value: 'yes', label: 'Yes, waive it' },
              ]}
              value={waive}
              onChange={setWaive}
              wrap
            />
            {waive === 'yes' ? (
              <TextField
                label="Reason for waiving"
                value={waiveReason}
                onChangeText={setWaiveReason}
                placeholder="Settled in cash with repair costs"
              />
            ) : null}
          </>
        ) : null}

        <View style={[styles.ledger, { borderColor: colors.rule }]}>
          <Line
            label="Tenant still owes"
            value={formatINR(canWaive && waive === 'yes' ? 0 : preview.remaining)}
            strong
            tone={preview.remaining > 0 && waive === 'no' ? 'overdue' : 'ink'}
          />
          <Line label="Refund due to tenant" value={formatINR(preview.refundDue)} strong />
        </View>

        <Text tone="inkMuted">
          The unit becomes vacant and no more rent is added. This can&apos;t be undone.
        </Text>
        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={`End tenancy on ${full(date)}`} onPress={save} loading={endTenancy.isPending} />
      </View>
    </Screen>
  );
}

function Line({
  label,
  value,
  strong,
  tone = 'ink',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'ink' | 'overdue';
}) {
  return (
    <View style={styles.line}>
      <Text tone="inkMuted" style={styles.flex}>
        {label}
      </Text>
      <Text variant={strong ? 'amount' : 'bodyStrong'} tone={tone}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  flex: { flex: 1 },
  ledger: { gap: space.xs, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
