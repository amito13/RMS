import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { IconButton, icons } from '@/components/ui/icon-button';
import { Card, PaperGrain } from '@/components/ui/paper';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Scene } from '@/components/ui/scene';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { useProperties, useUnits } from '@/features/properties/queries';
import { unitTypeLabel } from '@/features/properties/unit-types';
import type { UnitOccupancy } from '@/lib/db-types';
import { formatDate, formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const properties = useProperties();
  const units = useUnits();

  const property = properties.data?.find((p) => p.id === id);
  const own = (units.data ?? []).filter((u) => u.property_id === id);
  const vacant = own.filter((u) => u.occupancy === 'vacant');
  const occupied = own.filter((u) => u.occupancy === 'occupied');
  const vacantRent = vacant.reduce((sum, u) => sum + u.monthly_rent, 0);
  const rentedRent = occupied.reduce((sum, u) => sum + u.monthly_rent, 0);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/properties'));

  if (!property) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.paper }]}>
        <PaperGrain />
        <HeaderBand onBack={back} title="Property" />
        <View style={styles.body}>
          {properties.isPending || units.isPending ? (
            <ActivityIndicator color={colors.brand} accessibilityLabel="Loading property" />
          ) : (
            <Text tone="inkMuted">This property wasn&apos;t found. It may have been archived.</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
      <ScrollView
        contentContainerStyle={styles.grow}
        refreshControl={
          <RefreshControl
            refreshing={units.isRefetching}
            onRefresh={() => {
              units.refetch();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }>
        <Scene height={300 + insets.top} fadeToPaper>
          <View style={[styles.topBar, { top: insets.top + space.md }]}>
            <IconButton icon={icons.back} label="Back" onPress={back} />
            <Text variant="bodyStrong" style={styles.topTitle} numberOfLines={1} accessibilityRole="header">
              {property.name}
            </Text>
            <View style={styles.spacer} />
          </View>
        </Scene>

        <View style={styles.body}>
          <Card padding={18} style={styles.overlap}>
            <View style={styles.address}>
              <SymbolView name={icons.pin} tintColor={colors.inkMuted} size={16} />
              <Text variant="caption" tone="inkMuted" style={styles.flex}>
                {[property.address_line, property.locality, property.city, property.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
            <View style={styles.between}>
              <Text>
                <Text variant="display" style={styles.count}>
                  {occupied.length}
                </Text>
                <Text variant="bodyStrong" tone="inkMuted">
                  {' '}
                  of {own.length} rented
                </Text>
              </Text>
              <View style={styles.right}>
                <Text variant="amount">{formatINR(rentedRent)}</Text>
                <Text variant="caption" tone="inkMuted">
                  a month
                </Text>
              </View>
            </View>
            {own.length ? <ProgressBar value={occupied.length / own.length} /> : null}
          </Card>

          <Section
            title={`Vacant (${vacant.length})`}
            note={vacant.length ? `${formatINR(vacantRent)} a month if rented` : undefined}>
            <Card padding={0} style={styles.list}>
              {vacant.length === 0 ? (
                <Text tone="inkMuted" style={styles.emptyRow}>
                  Every unit has a tenant.
                </Text>
              ) : (
                vacant.map((u, i) => <UnitRow key={u.unit_id} unit={u} last={i === vacant.length - 1} />)
              )}
            </Card>
          </Section>

          <Section title={`Occupied (${occupied.length})`}>
            <Card padding={0} style={styles.list}>
              {occupied.length === 0 ? (
                <Text tone="inkMuted" style={styles.emptyRow}>
                  No tenants yet. Tenants you add to these units will show here.
                </Text>
              ) : (
                occupied.map((u, i) => <UnitRow key={u.unit_id} unit={u} last={i === occupied.length - 1} />)
              )}
            </Card>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="heading">{title}</Text>
        {note ? (
          <Text variant="caption" tone="inkMuted">
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function UnitRow({ unit, last }: { unit: UnitOccupancy; last: boolean }) {
  const { colors } = useTheme();
  const type = unitTypeLabel(unit.unit_type, unit.type_label);
  const isVacant = unit.occupancy === 'vacant';
  const badge = type.length <= 5 ? type : type.slice(0, 4);

  const content = (
    <>
      <View style={[styles.badge, { backgroundColor: isVacant ? colors.dueSoft : colors.infoSoft }]}>
        <Text variant="caption" style={[styles.badgeText, { color: isVacant ? colors.due : colors.info }]}>
          {badge}
        </Text>
      </View>
      <View style={styles.unitMain}>
        <Text variant="bodyStrong">{unit.name}</Text>
        <Text variant="caption" tone="inkMuted">
          {isVacant ? 'Vacant' : unit.tenant_name} · {formatINR(unit.monthly_rent)}
          {unit.floor ? ` · ${unit.floor}` : ''}
        </Text>
        {unit.available_from ? (
          <View style={styles.stamp}>
            <Stamp
              tone="due"
              small
              label={`Available from ${formatDate(new Date(unit.available_from + 'T00:00:00'))}`}
            />
          </View>
        ) : null}
      </View>
    </>
  );

  const rowStyle = [styles.unit, !last && { borderBottomWidth: 1, borderColor: colors.hairline }];

  if (isVacant) {
    return (
      <View style={rowStyle}>
        {content}
        <Button
          title="Add tenant"
          icon={icons.add}
          compact
          onPress={() => router.push({ pathname: '/tenants/new', params: { unitId: unit.unit_id } })}
        />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unit.name}, ${unit.tenant_name}`}
      disabled={!unit.tenancy_id}
      onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: unit.tenancy_id! } })}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
      <SymbolView name={icons.chevron} tintColor={colors.inkMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1, paddingBottom: space.xxl },
  topBar: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  spacer: { width: 44 },
  body: { paddingHorizontal: space.lg, gap: space.xl },
  overlap: { marginTop: -38 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  count: { fontSize: 34 },
  right: { alignItems: 'flex-end' },
  section: { gap: space.md - 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: space.xs,
  },
  list: { paddingHorizontal: space.lg, gap: 0 },
  emptyRow: { paddingVertical: space.lg },
  unit: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  badge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11.5 },
  unitMain: { flex: 1, gap: 2 },
  stamp: { marginTop: space.xs },
  pressed: { opacity: 0.7 },
});
