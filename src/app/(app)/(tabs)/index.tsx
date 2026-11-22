import { format, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { IconButton, icons } from '@/components/ui/icon-button';
import { Card, PaperGrain } from '@/components/ui/paper';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Scene } from '@/components/ui/scene';
import { TAB_BAR_SPACE } from '@/components/ui/screen';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { useCollectedThisMonth } from '@/features/money/queries';
import { planToday } from '@/features/money/today';
import { useProfile } from '@/features/profile/use-profile';
import { useTenancySummaries } from '@/features/tenants/queries';
import { avatarTone, daysUntil, rentStamp } from '@/features/tenants/status';
import { parseDay, toDay, today } from '@/lib/dates';
import type { TenancySummary } from '@/lib/db-types';
import { formatDate, formatDayHeading, formatINR } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

const day = (d: string) => formatDate(parseDay(d));
const openTenant = (t: TenancySummary) =>
  router.push({ pathname: '/tenants/[id]', params: { id: t.tenancy_id } });

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Who to collect rent from today, building by building (PRD 7.11). */
export default function Today() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const summaries = useTenancySummaries();
  const monthStart = toDay(startOfMonth(today()));
  const collected = useCollectedThisMonth(monthStart);
  const plan = planToday(summaries.data ?? []);

  const firstName = profile.data?.full_name?.trim().split(/\s+/)[0];
  const monthlyTotal = (summaries.data ?? [])
    .filter((t) => t.status !== 'ended')
    .reduce((sum, t) => sum + t.monthly_rent, 0);
  const collectedAmount = collected.data ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.sm }]}
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
        <Scene height={236} style={styles.hero}>
          <View style={styles.greeting}>
            <Avatar name={profile.data?.full_name || 'RMS'} tone="dark" size={42} />
            <View style={styles.flex}>
              <Text variant="caption" style={{ color: '#2F3A44' }}>
                {formatDayHeading(new Date())}
              </Text>
              <Text variant="bodyStrong" style={styles.hello} accessibilityRole="header">
                {greeting(new Date())}
                {firstName ? `, ${firstName}` : ''}
              </Text>
            </View>
          </View>
        </Scene>

        <Card style={styles.summary} padding={18}>
          <View style={styles.between}>
            {plan.collectCount > 0 ? (
              <Stamp
                tone={plan.collect.some((g) => g.rows.some((t) => t.overdue_amount > 0)) ? 'late' : 'due'}
                label={`${plan.collectCount} ${plan.collectCount === 1 ? 'needs' : 'need'} rent today`}
              />
            ) : (
              <Stamp tone="paid" label={plan.hasTenants ? 'All paid up' : 'No tenants yet'} />
            )}
            <Text variant="caption" tone="inkMuted">
              {format(today(), 'MMMM')}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text variant="display">{formatINR(plan.collectTotal)}</Text>
            <Text variant="bodyStrong" tone="inkMuted">
              to collect
            </Text>
          </View>
          {monthlyTotal > 0 ? (
            <View style={styles.progress}>
              <ProgressBar value={collectedAmount / monthlyTotal} height={12} />
              <Text variant="caption" tone="inkMuted">
                Collected {collected.data !== undefined ? formatINR(collectedAmount) : '…'} of {formatINR(monthlyTotal)}
                {plan.advancePending > 0 ? ` · advance pending ${formatINR(plan.advancePending)}` : ''}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.body}>
          {summaries.isPending ? (
            <ActivityIndicator color={colors.brand} accessibilityLabel="Loading" />
          ) : summaries.isError && !summaries.data ? (
            <Card>
              <Text variant="heading">Couldn&apos;t load today&apos;s rent</Text>
              <Text tone="inkMuted">Check your internet connection and pull down to try again.</Text>
            </Card>
          ) : !plan.hasTenants ? (
            <Card>
              <Text variant="heading">Add your first tenant</Text>
              <Text tone="inkMuted">
                Once tenants are added, this screen lists who to collect rent from each day.
              </Text>
              <Button title="Add tenant" icon={icons.add} onPress={() => router.push('/tenants/new')} />
            </Card>
          ) : (
            <>
              {plan.collect.map((group) => (
                <Section key={group.property} title="Collect today" aside={group.property}>
                  <Card padding={0} style={styles.list}>
                    {group.rows.map((t, i) => (
                      <CollectRow key={t.tenancy_id} t={t} last={i === group.rows.length - 1} />
                    ))}
                  </Card>
                </Section>
              ))}

              {plan.upcoming.length ? (
                <Section title="Due in the next 7 days">
                  <Card padding={0} style={styles.list}>
                    {plan.upcoming.map((t, i) => (
                      <SimpleRow
                        key={t.tenancy_id}
                        t={t}
                        last={i === plan.upcoming.length - 1}
                        right={formatINR(t.next_due_amount ?? t.monthly_rent)}
                        detail={`Due ${day(t.next_due_date!)}`}
                      />
                    ))}
                  </Card>
                </Section>
              ) : null}

              {plan.leaving.length ? (
                <Section title="Moving out soon">
                  <Card padding={0} style={styles.list}>
                    {plan.leaving.map((t, i) => {
                      const n = daysUntil(t.planned_move_out_date!, t.as_of);
                      return (
                        <SimpleRow
                          key={t.tenancy_id}
                          t={t}
                          last={i === plan.leaving.length - 1}
                          right={t.outstanding > 0 ? `${formatINR(t.outstanding)} owed` : ''}
                          detail={
                            n >= 0
                              ? `Leaving ${day(t.planned_move_out_date!)}${n === 0 ? ', today' : ''}`
                              : `Was due to leave ${day(t.planned_move_out_date!)}`
                          }
                        />
                      );
                    })}
                  </Card>
                </Section>
              ) : null}

              {plan.renewals.length ? (
                <Section title="Agreements ending soon">
                  <Card padding={0} style={styles.list}>
                    {plan.renewals.map((t, i) => {
                      const n = daysUntil(t.agreement_reminder_date!, t.as_of);
                      return (
                        <SimpleRow
                          key={t.tenancy_id}
                          t={t}
                          last={i === plan.renewals.length - 1}
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
                  </Card>
                </Section>
              ) : null}

              {plan.collect.length === 0 && !plan.upcoming.length && !plan.leaving.length && !plan.renewals.length ? (
                <Card>
                  <Text variant="bodyStrong">Everyone is paid up</Text>
                  <Text tone="inkMuted">
                    {plan.next
                      ? `Next: ${formatINR(plan.next.next_due_amount ?? plan.next.monthly_rent)} from ${plan.next.tenant_name} on ${day(plan.next.next_due_date!)}.`
                      : 'Nothing needs your attention this week.'}
                  </Text>
                </Card>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={[styles.between, styles.sectionHead]}>
        <Text variant="heading">{title}</Text>
        {aside ? (
          <Text variant="caption" tone="inkMuted">
            {aside}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A tenant who owes rent now, with Record payment, Move date and Call. */
function CollectRow({ t, last }: { t: TenancySummary; last: boolean }) {
  const { colors } = useTheme();
  const stamp = rentStamp(t);
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderColor: colors.hairline }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => openTenant(t)}
        style={({ pressed }) => [styles.rowTop, pressed && styles.pressed]}>
        <Avatar name={t.tenant_name} tone={avatarTone(t)} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t.tenant_name}</Text>
          <Text variant="caption" tone="inkMuted" numberOfLines={1}>
            {t.unit_name}
            {t.last_paid_on ? ` · last paid ${day(t.last_paid_on)}` : ' · no payments yet'}
          </Text>
        </View>
        <View style={styles.side}>
          <Text variant="amount" align="right">
            {formatINR(t.outstanding)}
          </Text>
          <Stamp label={stamp.label} tone={stamp.tone} small />
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            title="Record payment"
            compact
            onPress={() => router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id } })}
          />
        </View>
        <Button
          title="Move date"
          variant="secondary"
          compact
          onPress={() => router.push({ pathname: '/reschedule', params: { tenancyId: t.tenancy_id } })}
        />
        <IconButton
          icon={icons.call}
          label={`Call ${t.tenant_name}`}
          outlined
          size={46}
          onPress={() => Linking.openURL(`tel:${t.tenant_phone}`)}
        />
      </View>
    </View>
  );
}

function SimpleRow({ t, last, right, detail }: { t: TenancySummary; last: boolean; right: string; detail: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openTenant(t)}
      style={({ pressed }) => [
        styles.row,
        styles.rowTop,
        !last && { borderBottomWidth: 1, borderColor: colors.hairline },
        pressed && styles.pressed,
      ]}>
      <Avatar name={t.tenant_name} tone={avatarTone(t)} size={40} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{t.tenant_name}</Text>
        <Text variant="caption" tone="inkMuted">
          {t.unit_name} · {detail}
        </Text>
      </View>
      {right ? <Text variant="amount">{right}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: TAB_BAR_SPACE },
  hero: { borderRadius: radius.sheet },
  greeting: {
    position: 'absolute',
    left: 18,
    right: 14,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md - 2,
  },
  hello: { fontSize: 17 },
  summary: { marginTop: -46, marginHorizontal: 10, gap: 14 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  progress: { gap: space.sm },
  body: { marginTop: space.xl, gap: space.xl },
  section: { gap: space.md - 2 },
  sectionHead: { paddingHorizontal: space.xs },
  list: { paddingHorizontal: 14, gap: 0 },
  row: { paddingVertical: space.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  side: { alignItems: 'flex-end', gap: space.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  pressed: { opacity: 0.7 },
});
