import { format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { useCollectedThisMonth } from '@/features/money/queries';
import { planToday } from '@/features/money/today';
import { useTenancySummaries } from '@/features/tenants/queries';
import { daysUntil, rentStamp } from '@/features/tenants/status';
import { parseDay, toDay, today } from '@/lib/dates';
import type { TenancySummary } from '@/lib/db-types';
import { formatDate, formatDayHeading, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

const day = (d: string) => formatDate(parseDay(d));
const openTenant = (t: TenancySummary) =>
  router.push({ pathname: '/tenants/[id]', params: { id: t.tenancy_id } });

/** Who to collect rent from today, building by building (PRD 7.11). */
export default function Today() {
  const { colors } = useTheme();
  const summaries = useTenancySummaries();
  const monthStart = toDay(startOfMonth(today()));
  const collected = useCollectedThisMonth(monthStart);
  const plan = planToday(summaries.data ?? []);

  const header =
    plan.collectTotal > 0
      ? {
          title: `Collect ${formatINR(plan.collectTotal)}`,
          subtitle: `from ${plan.collectCount} ${plan.collectCount === 1 ? 'tenant' : 'tenants'} today`,
        }
      : plan.hasTenants
        ? {
            title: 'Nothing to collect today',
            subtitle: plan.next
              ? `Next: ${formatINR(plan.next.next_due_amount ?? plan.next.monthly_rent)} from ${plan.next.tenant_name} on ${day(plan.next.next_due_date!)}`
              : undefined,
          }
        : { title: 'Nothing to collect yet', subtitle: 'Add tenants to your units to start tracking rent.' };

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={styles.grow}
      refreshControl={
        <RefreshControl
          refreshing={summaries.isRefetching}
          onRefresh={() => {
            summaries.refetch();
            collected.refetch();
          }}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }>
      <HeaderBand overline={formatDayHeading(new Date())} large {...header} />

      <View style={styles.body}>
        {summaries.isPending ? (
          <ActivityIndicator color={colors.brand} accessibilityLabel="Loading" />
        ) : summaries.isError && !summaries.data ? (
          <View style={styles.section}>
            <Text variant="heading">Couldn&apos;t load today&apos;s rent</Text>
            <Text tone="inkMuted">Check your internet connection and pull down to try again.</Text>
          </View>
        ) : !plan.hasTenants ? (
          <View style={styles.section}>
            <Text tone="inkMuted">
              Once tenants are added, this screen lists who to collect rent from each day.
            </Text>
            <Button title="Add tenant" onPress={() => router.push('/tenants/new')} />
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <SummaryLine
                label={`Collected in ${format(today(), 'MMMM')}`}
                value={collected.data !== undefined ? formatINR(collected.data) : '…'}
              />
              {plan.advancePending > 0 ? (
                <SummaryLine label="Advance still pending" value={formatINR(plan.advancePending)} />
              ) : null}
            </View>

            {plan.collect.map((group) => (
              <View key={group.property} style={styles.section}>
                <Text variant="heading">{group.property}</Text>
                {group.rows.map((t, i) => (
                  <CollectRow key={t.tenancy_id} t={t} first={i === 0} />
                ))}
              </View>
            ))}

            {plan.upcoming.length ? (
              <View style={styles.section}>
                <Text variant="heading">Due in the next 7 days</Text>
                {plan.upcoming.map((t, i) => (
                  <SimpleRow
                    key={t.tenancy_id}
                    t={t}
                    first={i === 0}
                    right={formatINR(t.next_due_amount ?? t.monthly_rent)}
                    detail={`Due ${day(t.next_due_date!)}`}
                  />
                ))}
              </View>
            ) : null}

            {plan.leaving.length ? (
              <View style={styles.section}>
                <Text variant="heading">Moving out soon</Text>
                {plan.leaving.map((t, i) => {
                  const n = daysUntil(t.planned_move_out_date!, t.as_of);
                  return (
                    <SimpleRow
                      key={t.tenancy_id}
                      t={t}
                      first={i === 0}
                      right={t.outstanding > 0 ? `${formatINR(t.outstanding)} owed` : ''}
                      detail={
                        n >= 0
                          ? `Leaving ${day(t.planned_move_out_date!)}${n === 0 ? ', today' : ''}`
                          : `Was due to leave ${day(t.planned_move_out_date!)}`
                      }
                    />
                  );
                })}
              </View>
            ) : null}

            {plan.renewals.length ? (
              <View style={styles.section}>
                <Text variant="heading">Agreements ending soon</Text>
                {plan.renewals.map((t, i) => {
                  const n = daysUntil(t.agreement_reminder_date!, t.as_of);
                  return (
                    <SimpleRow
                      key={t.tenancy_id}
                      t={t}
                      first={i === 0}
                      right=""
                      detail={
                        n > 0
                          ? `Renewal on ${day(t.agreement_reminder_date!)}, in ${n} ${n === 1 ? 'day' : 'days'}`
                          : n === 0
                            ? 'Renewal due today'
                            : `Renewal was due ${day(t.agreement_reminder_date!)}`
                      }
                    />
                  );
                })}
              </View>
            ) : null}

            {plan.collect.length === 0 && !plan.upcoming.length && !plan.leaving.length && !plan.renewals.length ? (
              <Text tone="inkMuted">Everyone is paid up. Nothing needs your attention this week.</Text>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text tone="inkMuted" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

/** A tenant who owes rent now, with Record payment, Call and Move date. */
function CollectRow({ t, first }: { t: TenancySummary; first: boolean }) {
  const { colors } = useTheme();
  const stamp = rentStamp(t);
  return (
    <View style={[styles.row, { borderColor: colors.rule }, first && styles.firstRow]}>
      <Pressable accessibilityRole="button" onPress={() => openTenant(t)} style={styles.rowTop}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t.tenant_name}</Text>
          <Text variant="caption" tone="inkMuted">
            {t.unit_name}
            {t.last_paid_on ? `. Last paid ${formatINR(t.last_paid_amount ?? 0)} on ${day(t.last_paid_on)}` : '. No payments yet'}
          </Text>
        </View>
        <View style={styles.side}>
          <Text variant="amount" align="right" tone={t.overdue_amount > 0 ? 'overdue' : 'ink'}>
            {formatINR(t.outstanding)}
          </Text>
          <Stamp label={stamp.label} tone={stamp.tone} />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button
          title="Record payment"
          variant="link"
          onPress={() => router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id } })}
        />
        <Button title="Call" variant="link" onPress={() => Linking.openURL(`tel:${t.tenant_phone}`)} />
        <Button
          title="Move date"
          variant="link"
          onPress={() => router.push({ pathname: '/reschedule', params: { tenancyId: t.tenancy_id } })}
        />
      </View>
    </View>
  );
}

function SimpleRow({ t, first, right, detail }: { t: TenancySummary; first: boolean; right: string; detail: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openTenant(t)}
      style={({ pressed }) => [
        styles.row,
        styles.rowTop,
        { borderColor: colors.rule },
        first && styles.firstRow,
        pressed && { backgroundColor: colors.surface },
      ]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{t.tenant_name}</Text>
        <Text variant="caption" tone="inkMuted">
          {t.unit_name}, {t.property_name}. {detail}
        </Text>
      </View>
      {right ? <Text variant="amount">{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.xxl },
  summary: { gap: 2 },
  summaryLine: { flexDirection: 'row', gap: space.md },
  section: { gap: space.sm },
  row: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  side: { alignItems: 'flex-end', gap: space.xs },
  actions: { flexDirection: 'row', gap: space.xl, marginTop: space.xs },
});
