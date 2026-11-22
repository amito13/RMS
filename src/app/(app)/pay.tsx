import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { allocate, describeAllocation } from '@/features/money/allocate';
import { RpcError, useRecordAdvance, useRecordPayment } from '@/features/money/queries';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { parseDay, toDay, today } from '@/lib/dates';
import type { PaymentMode } from '@/lib/db-types';
import { formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

type Kind = 'rent' | 'advance';

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

/** Record payment (PRD RENT-1 to RENT-3, ADV-2, ADV-3). Params: tenancyId, chargeId?, kind? */
export default function RecordPayment() {
  const { tenancyId, chargeId, kind: kindParam, mode: modeParam } = useLocalSearchParams<{
    tenancyId: string;
    chargeId?: string;
    kind?: Kind;
    mode?: PaymentMode;
  }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const charges = useRentCharges(tenancyId);
  const recordPayment = useRecordPayment();
  const recordAdvance = useRecordAdvance();
  const t = summary.data;

  const charge = chargeId ? charges.data?.find((c) => c.rent_charge_id === chargeId) : undefined;
  const defaultAmount = charge
    ? modeParam === 'from_advance' && t
      ? Math.min(charge.outstanding, t.advance_balance)
      : charge.outstanding
    : t
      ? t.outstanding || t.next_due_amount || t.monthly_rent
      : 0;

  const [kind, setKind] = useState<Kind>(kindParam ?? 'rent');
  // null until the landlord types, so the default can fill in once data loads.
  const [amountInput, setAmount] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(today());
  const [mode, setMode] = useState<PaymentMode>(modeParam ?? 'cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [excess, setExcess] = useState<number | null>(null);

  if (!t) {
    return <Screen header={{ close: true, onBack: () => router.back(), title: 'Record payment' }} />;
  }

  const amount = amountInput ?? (defaultAmount ? String(defaultAmount) : '');
  const value = Number(amount) || 0;
  const unpaid = charges.data ?? [];
  const preview = kind === 'rent' && mode !== 'from_advance' ? allocate(value, unpaid, chargeId) : null;
  const canAdvance = t.advance_pending > 0 || kindParam === 'advance';
  const modes =
    kind === 'rent' && t.advance_balance > 0
      ? [...MODES, { value: 'from_advance' as PaymentMode, label: `From advance (${formatINR(t.advance_balance)})` }]
      : MODES;

  async function save(excessToAdvance = false) {
    setError(null);
    if (value <= 0) {
      setError('Enter an amount more than ₹0.');
      return;
    }
    try {
      if (kind === 'advance') {
        await recordAdvance.mutateAsync({ tenancyId, amount: value, paidOn: toDay(paidOn), mode, reference });
      } else {
        await recordPayment.mutateAsync({
          tenancyId,
          amount: value,
          paidOn: toDay(paidOn),
          mode,
          reference,
          note,
          rentChargeId: chargeId,
          excessToAdvance,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      if (e instanceof RpcError && e.code === 'R0001') {
        setExcess(Number(e.detail) || null);
        return;
      }
      setError(e instanceof Error ? e.message : 'Couldn’t record the payment. Try again.');
    }
  }

  const saving = recordPayment.isPending || recordAdvance.isPending;
  const monthName = charge ? parseDay(charge.period_month).toLocaleString('en-IN', { month: 'long' }) : null;

  return (
    <Screen
      scroll card
      header={{
        close: true, onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: charge ? `${monthName} rent` : 'Record payment',
        subtitle:
          kind === 'advance'
            ? `Advance pending: ${formatINR(t.advance_pending)} of ${formatINR(t.advance_agreed)}`
            : charge
              ? `${formatINR(charge.outstanding)} left of ${formatINR(charge.amount_due)}`
              : t.outstanding > 0
                ? `Owes ${formatINR(t.outstanding)} now`
                : 'Nothing owed right now',
      }}>
      <View style={styles.form}>
        {canAdvance && !charge ? (
          <ChoiceChips
            label="What is this for?"
            options={[
              { value: 'rent', label: 'Rent' },
              { value: 'advance', label: 'Advance' },
            ]}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setExcess(null);
              if (mode === 'from_advance') setMode('cash');
              setAmount(String(k === 'advance' ? t.advance_pending : defaultAmount || ''));
            }}
          />
        ) : null}

        <TextField
          label="Amount received"
          prefix="₹"
          value={amount}
          onChangeText={(v) => {
            setAmount(v.replace(/\D/g, '').slice(0, 8));
            setExcess(null);
          }}
          keyboardType="number-pad"
          hint={preview ? describeAllocation(preview) || undefined : undefined}
        />

        {excess ? (
          <View style={[styles.excess, { borderColor: colors.due }]}>
            <Text variant="bodyStrong">That&apos;s {formatINR(excess)} more than the rent owed</Text>
            <Text tone="inkMuted">Keep the extra as advance for future rent, or change the amount.</Text>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button title={`Keep ${formatINR(excess)} as advance`} onPress={() => save(true)} loading={saving} />
              </View>
            </View>
            <Button
              title="Change amount"
              variant="link"
              onPress={() => {
                setAmount(String(value - excess));
                setExcess(null);
              }}
            />
          </View>
        ) : null}

        <ChoiceChips label="Paid by" options={modes} value={mode} onChange={setMode} wrap />

        <DateField label="Received on" value={paidOn} onChange={setPaidOn} maximumDate={today()} />

        {mode === 'upi' || mode === 'bank' || mode === 'cheque' ? (
          <TextField
            label={mode === 'cheque' ? 'Cheque number' : 'Reference'}
            value={reference}
            onChangeText={setReference}
            placeholder={mode === 'upi' ? 'UPI reference (optional)' : 'Optional'}
            autoCapitalize="characters"
          />
        ) : null}

        {kind === 'rent' ? (
          <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        ) : null}

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {!excess ? (
          <Button
            title={kind === 'advance' ? `Save ${formatINR(value)} advance` : `Save ${formatINR(value)} payment`}
            onPress={() => save(false)}
            loading={saving}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  excess: { borderLeftWidth: 3, paddingLeft: space.md, gap: space.xs },
});
