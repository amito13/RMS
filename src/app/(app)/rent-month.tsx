import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { MODE_LABEL } from '@/features/money/labels';
import { usePayments, useVoidPayment, useWaiveCharge } from '@/features/money/queries';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { chargeStamp } from '@/features/tenants/status';
import { parseDay } from '@/lib/dates';
import { formatDate, formatINR, formatMonth } from '@/lib/format';
import { space, useTheme } from '@/theme';

const day = (d: string) => formatDate(parseDay(d));

/** One month's rent: what's paid, and actions on it. Params: tenancyId, chargeId. */
export default function RentMonth() {
  const { tenancyId, chargeId } = useLocalSearchParams<{ tenancyId: string; chargeId: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const charges = useRentCharges(tenancyId);
  const payments = usePayments(tenancyId);
  const waive = useWaiveCharge(tenancyId);
  const voidPayment = useVoidPayment(tenancyId);
  const [waiving, setWaiving] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const t = summary.data;
  const c = charges.data?.find((x) => x.rent_charge_id === chargeId);
  const close = () => router.back();

  if (!t || !c) {
    return (
      <Screen header={{ onBack: close, title: 'Rent' }}>
        <Text tone="inkMuted">{charges.isPending ? 'Loading…' : 'This month wasn’t found.'}</Text>
      </Screen>
    );
  }

  const stamp = chargeStamp(c);
  const own = (payments.data ?? []).filter((p) => p.rent_charge_id === c.rent_charge_id);
  const open = c.outstanding > 0;
  const moved = c.due_date !== c.original_due_date;

  async function confirmWaive() {
    setError(null);
    if (!waiveReason.trim()) {
      setError('Add a reason, like "Repair cost adjusted".');
      return;
    }
    try {
      await waive.mutateAsync({ chargeId: c!.rent_charge_id, reason: waiveReason.trim() });
      setWaiving(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t waive the rent.');
    }
  }

  async function confirmVoid(paymentId: string) {
    setError(null);
    if (!voidReason.trim()) {
      setError('Add a reason, like "Entered twice".');
      return;
    }
    try {
      await voidPayment.mutateAsync({ paymentId, reason: voidReason.trim() });
      setVoidingId(null);
      setVoidReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t update the payment.');
    }
  }

  return (
    <Screen
      scroll
      header={{
        onBack: close,
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: `${formatMonth(parseDay(c.period_month))} rent`,
      }}>
      <View style={styles.top}>
        <Stamp label={stamp.label} tone={stamp.tone} />
      </View>

      <View style={styles.section}>
        <Line label="Rent" value={formatINR(c.amount_due)} />
        <Line
          label="Due"
          value={day(c.due_date)}
          detail={moved ? `Moved from ${day(c.original_due_date)}` : undefined}
        />
        <Line label="Paid" value={formatINR(c.paid)} />
        {c.waived_amount > 0 ? <Line label="Waived" value={formatINR(c.waived_amount)} /> : null}
        <Line label="Left to pay" value={formatINR(c.outstanding)} strong tone={c.status === 'overdue' ? 'overdue' : 'ink'} />
      </View>

      {open ? (
        <View style={styles.actions}>
          <Button
            title={`Record payment for ${formatMonth(parseDay(c.period_month)).split(' ')[0]}`}
            onPress={() => router.push({ pathname: '/pay', params: { tenancyId, chargeId: c.rent_charge_id } })}
          />
          <Button
            title="Move due date"
            variant="secondary"
            onPress={() => router.push({ pathname: '/reschedule', params: { tenancyId, chargeId: c.rent_charge_id } })}
          />
          {t.advance_balance > 0 ? (
            <Button
              title={`Pay from advance (${formatINR(t.advance_balance)} held)`}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/pay',
                  params: { tenancyId, chargeId: c.rent_charge_id, mode: 'from_advance' },
                })
              }
            />
          ) : null}
          {waiving ? (
            <View style={styles.inline}>
              <TextField
                label={`Waive the remaining ${formatINR(c.outstanding)}`}
                value={waiveReason}
                onChangeText={setWaiveReason}
                placeholder="Reason, like repair cost adjusted"
              />
              <Button title="Waive rent" variant="secondary" onPress={confirmWaive} loading={waive.isPending} />
              <Button title="Cancel" variant="link" onPress={() => setWaiving(false)} />
            </View>
          ) : (
            <Button title="Waive what's left" variant="link" onPress={() => setWaiving(true)} />
          )}
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" tone="overdue" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text variant="heading">Payments</Text>
        {own.length === 0 ? <Text tone="inkMuted">No payments for this month yet.</Text> : null}
        {own.map((p, i) => {
          const voided = !!p.voided_at;
          return (
            <View key={p.id} style={[styles.payment, { borderColor: colors.rule }, i === 0 && styles.first]}>
              <View style={styles.paymentRow}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" tone={voided ? 'inkFaint' : 'ink'} style={voided && styles.struck}>
                    {day(p.paid_on)}, {MODE_LABEL[p.mode]}
                  </Text>
                  {p.reference || p.note ? (
                    <Text variant="caption" tone="inkMuted">
                      {[p.reference, p.note].filter(Boolean).join('. ')}
                    </Text>
                  ) : null}
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
              {!voided && voidingId !== p.id ? (
                <Button title="Mark as mistake" variant="link" onPress={() => setVoidingId(p.id)} />
              ) : null}
              {voidingId === p.id ? (
                <View style={styles.inline}>
                  <TextField
                    label="Why is this a mistake?"
                    value={voidReason}
                    onChangeText={setVoidReason}
                    placeholder="Entered twice"
                  />
                  <Button
                    title="Mark as mistake"
                    variant="secondary"
                    onPress={() => confirmVoid(p.id)}
                    loading={voidPayment.isPending}
                  />
                  <Button title="Cancel" variant="link" onPress={() => setVoidingId(null)} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Line({
  label,
  value,
  detail,
  strong,
  tone = 'ink',
}: {
  label: string;
  value: string;
  detail?: string;
  strong?: boolean;
  tone?: 'ink' | 'overdue';
}) {
  return (
    <View style={styles.line}>
      <View style={styles.flex}>
        <Text tone="inkMuted">{label}</Text>
        {detail ? (
          <Text variant="caption" tone="due">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant={strong ? 'amount' : 'bodyStrong'} tone={tone}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { marginBottom: space.lg },
  section: { gap: space.sm, marginBottom: space.xl },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  actions: { gap: space.sm, marginBottom: space.xl },
  inline: { gap: space.sm, marginTop: space.sm },
  error: { marginBottom: space.lg },
  payment: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  first: { borderTopWidth: StyleSheet.hairlineWidth },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  struck: { textDecorationLine: 'line-through' },
});
