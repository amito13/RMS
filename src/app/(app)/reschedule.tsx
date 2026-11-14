import { addDays, max } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useRescheduleCharge } from '@/features/money/queries';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { parseDay, toDay, today } from '@/lib/dates';
import { formatDate, formatINR, formatMonth } from '@/lib/format';
import { space } from '@/theme';

/**
 * "Not the 10th, give me till the 11th" (PRD 7.7). Moves one month's due date.
 * Params: tenancyId, chargeId.
 */
export default function Reschedule() {
  const { tenancyId, chargeId } = useLocalSearchParams<{ tenancyId: string; chargeId?: string }>();
  const summary = useTenancySummary(tenancyId);
  const charges = useRentCharges(tenancyId);
  const reschedule = useRescheduleCharge(tenancyId);
  const t = summary.data;
  // Without a month given (opened from the Today screen), move the oldest unpaid one.
  const c = chargeId
    ? charges.data?.find((x) => x.rent_charge_id === chargeId)
    : charges.data
        ?.filter((x) => x.outstanding > 0)
        .sort((a, b) => a.period_month.localeCompare(b.period_month))[0];

  // The new date must be after the current due date and no earlier than today.
  const earliest = c ? max([addDays(parseDay(c.due_date), 1), today()]) : today();
  const [date, setDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const chosen = date ?? earliest;

  if (!t || !c) {
    return (
      <Screen header={{ onBack: () => router.back(), title: 'Move due date' }}>
        <Text tone="inkMuted">{charges.isPending ? 'Loading…' : 'This month wasn’t found.'}</Text>
      </Screen>
    );
  }

  const quick = [
    { label: 'Tomorrow', date: addDays(today(), 1) },
    { label: 'In 2 days', date: addDays(today(), 2) },
    { label: 'In a week', date: addDays(today(), 7) },
  ].filter((q) => q.date >= earliest);

  async function save() {
    setError(null);
    try {
      await reschedule.mutateAsync({ chargeId: c!.rent_charge_id, newDate: toDay(chosen), reason: reason.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t move the date. Try again.');
    }
  }

  const month = formatMonth(parseDay(c.period_month)).split(' ')[0];

  return (
    <Screen
      scroll
      header={{
        onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: `Move ${month} rent`,
        subtitle: `${formatINR(c.outstanding)} due on ${formatDate(parseDay(c.due_date))}${
          c.due_date !== c.original_due_date ? ` (first due ${formatDate(parseDay(c.original_due_date))})` : ''
        }`,
      }}>
      <View style={styles.form}>
        {quick.length ? (
          <View style={styles.group}>
            <Text variant="label">New due date</Text>
            <View style={styles.chips}>
              {quick.map((q) => (
                <Chip
                  key={q.label}
                  label={`${q.label}, ${formatDate(q.date)}`}
                  selected={toDay(chosen) === toDay(q.date)}
                  onPress={() => setDate(q.date)}
                />
              ))}
            </View>
          </View>
        ) : null}
        <DateField
          label={quick.length ? 'Or pick a date' : 'New due date'}
          value={chosen}
          minimumDate={earliest}
          onChange={setDate}
        />
        <TextField
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Salary comes on the 11th"
          hint="Optional. Saved in the tenant's notes."
        />
        <Text tone="inkMuted">
          It won&apos;t show as overdue before {formatDate(chosen)}. Later months stay on their usual day.
        </Text>
        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={`Move to ${formatDate(chosen)}`} onPress={save} loading={reschedule.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  group: { gap: space.xs + 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
