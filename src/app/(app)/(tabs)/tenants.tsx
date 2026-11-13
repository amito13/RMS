import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { HeaderBand } from '@/components/ui/header-band';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useTenancySummaries } from '@/features/tenants/queries';
import { daysUntil, headlineAmount, rentStamp } from '@/features/tenants/status';
import type { TenancySummary } from '@/lib/db-types';
import { formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

type Filter = 'all' | 'overdue' | 'week' | 'advance' | 'verify' | 'leaving' | 'moved_out';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'week', label: 'Due this week' },
  { value: 'advance', label: 'Advance pending' },
  { value: 'verify', label: 'Verification missing' },
  { value: 'leaving', label: 'Moving out soon' },
  { value: 'moved_out', label: 'Moved out' },
];

function matches(t: TenancySummary, filter: Filter): boolean {
  const current = t.status !== 'ended';
  switch (filter) {
    case 'all':
      return current;
    case 'overdue':
      return current && t.overdue_amount > 0;
    case 'week':
      return (
        current &&
        (t.outstanding > 0 || (!!t.next_due_date && daysUntil(t.next_due_date, t.as_of) <= 7))
      );
    case 'advance':
      return current && t.advance_pending > 0;
    case 'verify':
      return current && !t.has_aadhaar;
    case 'leaving':
      return t.status === 'on_notice';
    case 'moved_out':
      return t.status === 'ended';
  }
}

/** Overdue first (longest first), then by next due date. */
function compare(a: TenancySummary, b: TenancySummary) {
  if (a.days_overdue !== b.days_overdue) return b.days_overdue - a.days_overdue;
  if (a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
  return (a.next_due_date ?? '9999').localeCompare(b.next_due_date ?? '9999');
}

export default function Tenants() {
  const { colors } = useTheme();
  const summaries = useTenancySummaries();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return (summaries.data ?? [])
      .filter((t) => matches(t, filter))
      .filter(
        (t) =>
          !q ||
          t.tenant_name.toLowerCase().includes(q) ||
          t.unit_name.toLowerCase().includes(q) ||
          t.property_name.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && t.tenant_phone.includes(qDigits))
      )
      .sort(compare);
  }, [summaries.data, query, filter]);

  const hasAny = (summaries.data ?? []).some((t) => t.status !== 'ended');

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <FlatList
        data={list}
        keyExtractor={(t) => t.tenancy_id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={summaries.isRefetching}
            onRefresh={() => {
              summaries.refetch();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
        ListHeaderComponent={
          <>
            <HeaderBand title="Tenants" />
            <View style={styles.controls}>
              <TextField
                label="Search"
                value={query}
                onChangeText={setQuery}
                placeholder="Name, phone or unit"
                autoCorrect={false}
                returnKeyType="search"
              />
              <ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {summaries.isPending ? (
              <ActivityIndicator color={colors.brand} accessibilityLabel="Loading tenants" />
            ) : summaries.isError && !summaries.data ? (
              <>
                <Text variant="heading">Couldn&apos;t load your tenants</Text>
                <Text tone="inkMuted">Check your internet connection and pull down to try again.</Text>
              </>
            ) : !hasAny && filter === 'all' && !query ? (
              <>
                <Text variant="heading">Add your first tenant</Text>
                <Text tone="inkMuted">
                  Put each tenant in one of your units. RMS then tracks their rent, advance and documents.
                </Text>
              </>
            ) : (
              <Text tone="inkMuted">No tenants match. Try another search or filter.</Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => <TenantRow t={item} first={index === 0} />}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.addBar, { backgroundColor: colors.paper, borderColor: colors.rule }]}>
        <Button title="Add tenant" onPress={() => router.push('/tenants/new')} />
      </View>
    </View>
  );
}

function TenantRow({ t, first }: { t: TenancySummary; first: boolean }) {
  const { colors } = useTheme();
  const stamp = rentStamp(t);
  const money = headlineAmount(t);
  const flags = [
    t.status === 'on_notice' && t.planned_move_out_date ? 'Leaving soon' : null,
    !t.has_aadhaar && t.status !== 'ended' ? 'Verification missing' : null,
    t.advance_pending > 0 ? `Advance ${formatINR(t.advance_pending)} pending` : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.tenant_name}, ${t.unit_name}, ${stamp.label}`}
      onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: t.tenancy_id } })}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.rule },
        first && styles.firstRow,
        pressed && { backgroundColor: colors.surface },
      ]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{t.tenant_name}</Text>
        <Text variant="caption" tone="inkMuted">
          {t.unit_name}, {t.property_name}
        </Text>
        {flags.length ? (
          <Text variant="caption" tone="due">
            {flags.join('. ')}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>
        <Text variant="amount" align="right" tone={t.overdue_amount > 0 ? 'overdue' : 'ink'}>
          {formatINR(money.amount)}
        </Text>
        <Stamp label={stamp.label} tone={stamp.tone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, gap: space.md },
  listContent: { paddingBottom: 96 },
  empty: { paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  side: { alignItems: 'flex-end', gap: space.xs },
  addBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
