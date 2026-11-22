import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { IconButton, icons } from '@/components/ui/icon-button';
import { Card, PaperGrain } from '@/components/ui/paper';
import { TAB_BAR_SPACE } from '@/components/ui/screen';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { useTenancySummaries } from '@/features/tenants/queries';
import { avatarTone, daysUntil, headlineAmount, rentStamp } from '@/features/tenants/status';
import type { TenancySummary } from '@/lib/db-types';
import { formatINR } from '@/lib/format';
import { radius, space, typography, useTheme } from '@/theme';

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
  const insets = useSafeAreaInsets();
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
  const living = (summaries.data ?? []).filter((t) => t.status !== 'ended').length;
  const leaving = (summaries.data ?? []).filter((t) => t.status === 'on_notice').length;

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
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
          <View style={[styles.controls, { paddingTop: insets.top + space.lg }]}>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="title" accessibilityRole="header">
                  Tenants
                </Text>
                {hasAny ? (
                  <Text variant="caption" tone="inkMuted">
                    {living} living{leaving ? ` · ${leaving} moving out` : ''}
                  </Text>
                ) : null}
              </View>
              <IconButton icon={icons.add} label="Add tenant" filled size={48} onPress={() => router.push('/tenants/new')} />
            </View>
            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
              <SymbolView name={icons.search} tintColor={colors.inkMuted} size={20} />
              <TextInput
                accessibilityLabel="Search tenants"
                value={query}
                onChangeText={setQuery}
                placeholder="Name, phone or unit"
                placeholderTextColor={colors.inkFaint}
                selectionColor={colors.ink}
                autoCorrect={false}
                returnKeyType="search"
                style={[typography.bodyStrong, styles.searchInput, { color: colors.ink }]}
              />
            </View>
            <View style={styles.chips}>
              <ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.empty}>
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
          </Card>
        }
        renderItem={({ item, index }) => (
          <TenantRow t={item} first={index === 0} last={index === list.length - 1} />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function TenantRow({ t, first, last }: { t: TenancySummary; first: boolean; last: boolean }) {
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
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        first && styles.firstRow,
        last ? styles.lastRow : { borderBottomWidth: 1 },
        pressed && { backgroundColor: colors.wash },
      ]}>
      <Avatar name={t.tenant_name} tone={avatarTone(t)} />
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
        <Text variant="amount" align="right">
          {formatINR(money.amount)}
        </Text>
        <Stamp label={stamp.label} tone={stamp.tone} small />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  search: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: 18,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  chips: { marginRight: -space.lg },
  listContent: { paddingBottom: TAB_BAR_SPACE },
  empty: { marginHorizontal: space.lg, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  firstRow: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  lastRow: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  side: { alignItems: 'flex-end', gap: space.xs },
});
