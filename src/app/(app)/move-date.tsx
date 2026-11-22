import { addDays, max } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useChangeMoveOutDate, useMoveRenewalDate } from '@/features/lifecycle/queries';
import { useTenancySummary } from '@/features/tenants/queries';
import { parseDay, toDay, today } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { space } from '@/theme';

const full = (d: Date) => formatDate(d, new Date(0));

/**
 * Moves the renewal date (PRD AGR-5) or the planned move-out date (NOTICE-7).
 * Params: tenancyId, what = 'renewal' | 'move_out'.
 */
export default function MoveDate() {
  const { tenancyId, what } = useLocalSearchParams<{ tenancyId: string; what: 'renewal' | 'move_out' }>();
  const summary = useTenancySummary(tenancyId);
  const moveRenewal = useMoveRenewalDate(tenancyId);
  const moveOut = useChangeMoveOutDate(tenancyId);
  const t = summary.data;
  const isRenewal = what === 'renewal';

  const current = t
    ? parseDay((isRenewal ? t.agreement_reminder_date : t.planned_move_out_date) ?? t.as_of)
    : today();
  // Renewal: after the current date and not in the past. Move-out: any day from the notice date.
  const earliest = isRenewal
    ? max([addDays(current, 1), today()])
    : t?.notice_date
      ? parseDay(t.notice_date)
      : today();
  const [date, setDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const chosen = date ?? (isRenewal ? earliest : current);

  if (!t) return <Screen header={{ close: true, onBack: () => router.back(), title: 'Move date' }} />;

  async function save() {
    setError(null);
    try {
      if (isRenewal) {
        await moveRenewal.mutateAsync({ agreementId: t!.agreement_id!, newDate: toDay(chosen), reason });
      } else {
        await moveOut.mutateAsync({ newDate: toDay(chosen), reason });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t move the date.');
    }
  }

  const shortBy =
    !isRenewal && t.notice_date
      ? Math.max(0, t.notice_period_days - Math.round((chosen.getTime() - parseDay(t.notice_date).getTime()) / 86_400_000))
      : 0;

  return (
    <Screen
      scroll card
      header={{
        close: true, onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: isRenewal ? 'Move renewal date' : 'Change move-out date',
        subtitle: `${isRenewal ? 'Renewal' : 'Leaving'} on ${full(current)} now`,
      }}>
      <View style={styles.form}>
        <DateField
          label={isRenewal ? 'New renewal date' : 'New move-out date'}
          value={chosen}
          minimumDate={earliest}
          onChange={setDate}
        />
        {shortBy > 0 ? (
          <Text variant="caption" tone="due">
            Short notice: {shortBy} days less than the agreed {t.notice_period_days} days.
          </Text>
        ) : null}
        <TextField
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder={isRenewal ? 'Will sign after Diwali' : 'New flat ready a week later'}
          hint="Optional. Saved in the tenant's notes."
        />
        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          title={`Move to ${full(chosen)}`}
          onPress={save}
          loading={moveRenewal.isPending || moveOut.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
