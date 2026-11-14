import { addMonths, format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Stamp, type StampTone } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { parseDay, toDay } from '@/lib/dates';
import type { HistoryResult, RentChargeHistory, TenancyPaymentStats } from '@/lib/db-types';
import { formatINR } from '@/lib/format';
import { space, useTheme, type Palette } from '@/theme';

import { useChargeHistory, usePaymentStats } from './queries';

const HABIT: Record<NonNullable<TenancyPaymentStats['payment_habit']>, { label: string; tone: StampTone }> = {
  usually_on_time: { label: 'Usually on time', tone: 'paid' },
  sometimes_late: { label: 'Sometimes late', tone: 'due' },
  often_late: { label: 'Often late', tone: 'late' },
};

const RESULT_LABEL: Record<HistoryResult, string> = {
  on_time: 'on time',
  late_promise_kept: 'late, paid on the promised date',
  late: 'late',
  promised: 'waiting for the promised date',
  waived: 'waived',
  unpaid: 'unpaid',
  not_due: 'not due yet',
};

/** One sentence that sums up how the tenant pays (PRD HIST-1, HIST-4). */
export function summarise(s: TenancyPaymentStats | null | undefined): string[] {
  if (!s || s.months_counted === 0) return ['Not enough paid months yet to judge.'];
  const lines = [`On time ${s.months_on_time} of ${s.months_counted} ${s.months_counted === 1 ? 'month' : 'months'}.`];
  if (s.months_late > 0) {
    const longest = s.longest_delay_month ? ` (${format(parseDay(s.longest_delay_month), 'MMMM')})` : '';
    lines.push(
      s.average_days_late > 0
        ? `Late ${s.months_late} ${s.months_late === 1 ? 'time' : 'times'}, ${s.average_days_late} days on average, longest ${s.longest_days_late} days${longest}.`
        : `Late ${s.months_late} ${s.months_late === 1 ? 'time' : 'times'}, longest ${s.longest_days_late} days${longest}.`
    );
  }
  if (s.promises_made > 0) lines.push(`Kept ${s.promises_kept} of ${s.promises_made} promised dates.`);
  return lines;
}

function dotColor(result: HistoryResult | undefined, colors: Palette): { fill?: string; border: string } {
  switch (result) {
    case 'on_time':
      return { fill: colors.paid, border: colors.paid };
    case 'late':
    case 'late_promise_kept':
      return { fill: colors.due, border: colors.due };
    case 'unpaid':
      return { fill: colors.overdue, border: colors.overdue };
    case 'waived':
      return { fill: colors.inkFaint, border: colors.inkFaint };
    default:
      return { border: colors.rule };
  }
}

/** Payment history on the tenant screen: summary, 12-month strip, totals (PRD 7.5). */
export function PaymentHistorySection({ tenancyId, asOf }: { tenancyId: string; asOf: string }) {
  const { colors } = useTheme();
  const stats = usePaymentStats(tenancyId);
  const history = useChargeHistory(tenancyId);

  const byMonth = new Map((history.data ?? []).map((h) => [h.period_month.slice(0, 7), h]));
  const end = startOfMonth(parseDay(asOf));
  const months = Array.from({ length: 12 }, (_, i) => addMonths(end, i - 11));
  const habit = stats.data?.payment_habit ? HABIT[stats.data.payment_habit] : null;

  const stripLabel = months
    .map((m) => {
      const h: RentChargeHistory | undefined = byMonth.get(toDay(m).slice(0, 7));
      return h ? `${format(m, 'MMMM')}: ${RESULT_LABEL[h.result]}` : null;
    })
    .filter(Boolean)
    .join('. ');

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text variant="heading">Payment history</Text>
        {habit ? <Stamp label={habit.label} tone={habit.tone} /> : null}
      </View>

      {summarise(stats.data).map((line) => (
        <Text key={line}>{line}</Text>
      ))}

      <View style={styles.strip} accessible accessibilityLabel={stripLabel || 'No months yet'}>
        {months.map((m) => {
          const h = byMonth.get(toDay(m).slice(0, 7));
          const c = dotColor(h?.result, colors);
          return (
            <View key={toDay(m)} style={styles.month}>
              <View
                style={[
                  styles.dot,
                  { borderColor: c.border, backgroundColor: c.fill ?? 'transparent' },
                  !h && styles.emptyDot,
                ]}
              />
              <Text variant="caption" tone="inkMuted">
                {format(m, 'MMMMM')}
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="caption" tone="inkMuted">
        Green on time, gold late, red unpaid, grey waived.
      </Text>

      {stats.data ? (
        <View style={[styles.totals, { borderColor: colors.rule }]}>
          <Total label="Paid this financial year" value={stats.data.total_paid_this_financial_year} />
          <Total label="Paid since moving in" value={stats.data.total_paid} />
          {stats.data.total_waived > 0 ? <Total label="Waived" value={stats.data.total_waived} /> : null}
        </View>
      ) : null}

      <Button
        title="All payments"
        variant="link"
        onPress={() => router.push({ pathname: '/payments', params: { tenancyId } })}
      />
    </View>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.total}>
      <Text tone="inkMuted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyStrong">{formatINR(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  month: { alignItems: 'center', gap: 4, flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  emptyDot: { borderWidth: 1 },
  totals: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, marginTop: space.sm, gap: 2 },
  total: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
