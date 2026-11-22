import { addMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useRenewAgreement } from '@/features/lifecycle/queries';
import { summarise } from '@/features/money/payment-history';
import { usePaymentStats } from '@/features/money/queries';
import { useTenancySummary } from '@/features/tenants/queries';
import { parseDay, toDay, today } from '@/lib/dates';
import { formatDate, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

const full = (d: Date) => formatDate(d, new Date(0));

/** Renew the agreement, optionally with a new rent (PRD AGR-3, AGR-4, HIST-8). Param: tenancyId. */
export default function Renew() {
  const { tenancyId } = useLocalSearchParams<{ tenancyId: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const stats = usePaymentStats(tenancyId);
  const renew = useRenewAgreement(tenancyId);
  const t = summary.data;

  const defaultStart = t?.agreement_end_date ? parseDay(t.agreement_end_date) : today();
  const [start, setStart] = useState<Date | null>(null);
  const [term, setTerm] = useState<number | null>(null);
  const [changeRent, setChangeRent] = useState<'same' | 'new'>('same');
  const [rent, setRent] = useState('');
  const [rentFrom, setRentFrom] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!t) return <Screen header={{ close: true, onBack: () => router.back(), title: 'Renew agreement' }} />;

  const startDate = start ?? defaultStart;
  const months = term ?? t.agreement_term_months ?? 11;
  const end = addMonths(startDate, months);
  const fromDate = rentFrom ?? startDate;
  const newRent = Number(rent) || 0;

  async function save() {
    setError(null);
    if (changeRent === 'new' && newRent <= 0) {
      setError('Enter the new monthly rent.');
      return;
    }
    try {
      await renew.mutateAsync({
        startDate: toDay(startDate),
        termMonths: months,
        newRent: changeRent === 'new' ? newRent : undefined,
        rentFrom: changeRent === 'new' ? toDay(fromDate) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t renew the agreement.');
    }
  }

  return (
    <Screen
      scroll card
      header={{
        close: true, onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: 'Renew agreement',
        subtitle: t.agreement_end_date ? `Current agreement ends ${full(parseDay(t.agreement_end_date))}` : undefined,
      }}>
      <View style={styles.form}>
        <View style={[styles.history, { borderColor: colors.brand }]}>
          <Text variant="caption" tone="inkMuted">
            How {t.tenant_name.split(' ')[0]} pays
          </Text>
          {summarise(stats.data).map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <DateField label="New agreement starts" value={startDate} onChange={setStart} />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <Text variant="label">Length in months</Text>
            <Text variant="caption" tone="inkMuted">
              Ends {full(end)}
            </Text>
          </View>
          <Stepper label="months" value={months} min={1} max={36} onChange={setTerm} />
        </View>

        <ChoiceChips
          label="Rent"
          options={[
            { value: 'same', label: `Keep ${formatINR(t.monthly_rent)}` },
            { value: 'new', label: 'Change rent' },
          ]}
          value={changeRent}
          onChange={setChangeRent}
        />
        {changeRent === 'new' ? (
          <>
            <TextField
              label="New monthly rent"
              prefix="₹"
              value={rent}
              onChangeText={(v) => setRent(v.replace(/\D/g, '').slice(0, 7))}
              keyboardType="number-pad"
              hint={
                newRent > 0 && newRent !== t.monthly_rent
                  ? `${newRent > t.monthly_rent ? 'Up' : 'Down'} ${formatINR(Math.abs(newRent - t.monthly_rent))} (${Math.round(((newRent - t.monthly_rent) / t.monthly_rent) * 1000) / 10}%)`
                  : undefined
              }
            />
            <DateField
              label="New rent from"
              value={fromDate}
              onChange={setRentFrom}
              hint="Unpaid months due on or after this date use the new rent."
            />
          </>
        ) : null}

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={`Renew until ${full(end)}`} onPress={save} loading={renew.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  history: { borderLeftWidth: 3, paddingLeft: space.md, gap: 2 },
});
