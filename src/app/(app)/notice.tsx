import { addDays } from 'date-fns';
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
import { useRecordNotice } from '@/features/lifecycle/queries';
import { summarise } from '@/features/money/payment-history';
import { usePaymentStats } from '@/features/money/queries';
import { useRentCharges, useTenancySummary } from '@/features/tenants/queries';
import { daysBetween, toDay, today } from '@/lib/dates';
import { formatDate, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

const full = (d: Date) => formatDate(d, new Date(0));

/** Record that the tenant is leaving (PRD NOTICE-2 to NOTICE-4). Param: tenancyId. */
export default function RecordNotice() {
  const { tenancyId } = useLocalSearchParams<{ tenancyId: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(tenancyId);
  const charges = useRentCharges(tenancyId);
  const stats = usePaymentStats(tenancyId);
  const recordNotice = useRecordNotice(tenancyId);
  const t = summary.data;

  const [givenBy, setGivenBy] = useState<'tenant' | 'landlord'>('tenant');
  const [noticeDate, setNoticeDate] = useState(today());
  const [moveOut, setMoveOut] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!t) return <Screen header={{ close: true, onBack: () => router.back(), title: 'Record notice' }} />;

  // Planned move-out follows the notice date until the landlord picks one.
  const planned = moveOut ?? addDays(noticeDate, t.notice_period_days);
  const shortBy = Math.max(0, t.notice_period_days - daysBetween(noticeDate, planned));
  const plannedDay = toDay(planned);
  const toCollect = (charges.data ?? [])
    .filter((c) => c.original_due_date <= plannedDay)
    .reduce((s, c) => s + c.outstanding, 0);

  async function save() {
    setError(null);
    if (planned < noticeDate) {
      setError('The move-out date must be on or after the notice date.');
      return;
    }
    try {
      await recordNotice.mutateAsync({
        givenBy,
        noticeDate: toDay(noticeDate),
        moveOutDate: plannedDay,
        reason: reason.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t record the notice.');
    }
  }

  return (
    <Screen
      scroll card
      header={{
        close: true, onBack: () => router.back(),
        overline: `${t.tenant_name}, ${t.unit_name}`,
        title: 'Record notice',
        subtitle: `Notice period: ${t.notice_period_days} days`,
      }}>
      <View style={styles.form}>
        <ChoiceChips
          label="Who gave notice?"
          options={[
            { value: 'tenant', label: 'Tenant is leaving' },
            { value: 'landlord', label: 'I asked them to leave' },
          ]}
          value={givenBy}
          onChange={setGivenBy}
          wrap
        />
        <DateField label="Notice given on" value={noticeDate} maximumDate={today()} onChange={setNoticeDate} />
        <DateField
          label="Planned move-out"
          value={planned}
          minimumDate={noticeDate}
          onChange={setMoveOut}
          hint={`The unit shows as available from ${full(addDays(planned, 1))}.`}
        />
        {shortBy > 0 ? (
          <Text variant="caption" tone="due">
            Short notice: {shortBy} {shortBy === 1 ? 'day' : 'days'} less than the agreed {t.notice_period_days} days.
          </Text>
        ) : null}
        <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Job transfer to Pune" hint="Optional" />

        <View style={[styles.box, { borderColor: colors.brand }]}>
          <Text variant="caption" tone="inkMuted">
            Before {full(planned)}
          </Text>
          <Text>
            {toCollect > 0
              ? `${formatINR(toCollect)} of rent to collect, including rent due before they leave.`
              : 'No rent left to collect.'}
            {t.advance_balance > 0 ? ` ${formatINR(t.advance_balance)} of advance is held.` : ''}
          </Text>
          <Text variant="caption" tone="inkMuted" style={styles.gap}>
            How {t.tenant_name.split(' ')[0]} pays
          </Text>
          {summarise(stats.data).map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <Text tone="inkMuted">
          Rent due after {full(planned)} won&apos;t be added, and agreement renewal stops showing. You can change the
          date or withdraw the notice later.
        </Text>

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={`Record notice, leaving ${full(planned)}`} onPress={save} loading={recordNotice.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  box: { borderLeftWidth: 3, paddingLeft: space.md, gap: 2 },
  gap: { marginTop: space.sm },
});
