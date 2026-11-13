import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { useProperties, useUnits } from '@/features/properties/queries';
import { unitTypeLabel } from '@/features/properties/unit-types';
import { formatDate, formatINR } from '@/lib/format';
import type { UnitOccupancy } from '@/lib/db-types';
import { space, useTheme } from '@/theme';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const properties = useProperties();
  const units = useUnits();

  const property = properties.data?.find((p) => p.id === id);
  const own = (units.data ?? []).filter((u) => u.property_id === id);
  const vacant = own.filter((u) => u.occupancy === 'vacant');
  const occupied = own.filter((u) => u.occupancy === 'occupied');
  const vacantRent = vacant.reduce((sum, u) => sum + u.monthly_rent, 0);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/properties'));

  if (!property) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.paper }]}>
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
    <ScrollView
      style={{ backgroundColor: colors.paper }}
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
      <HeaderBand
        onBack={back}
        title={property.name}
        subtitle={[property.address_line, property.locality, property.city, property.pincode]
          .filter(Boolean)
          .join(', ')}
      />
      <View style={styles.body}>
        <Section
          title={`Vacant (${vacant.length})`}
          note={vacant.length ? `${formatINR(vacantRent)} a month if rented` : undefined}>
          {vacant.length === 0 ? (
            <Text tone="inkMuted">Every unit has a tenant.</Text>
          ) : (
            vacant.map((u, i) => <UnitRow key={u.unit_id} unit={u} first={i === 0} />)
          )}
        </Section>

        <Section title={`Occupied (${occupied.length})`}>
          {occupied.length === 0 ? (
            <Text tone="inkMuted">No tenants yet. Tenants you add to these units will show here.</Text>
          ) : (
            occupied.map((u, i) => <UnitRow key={u.unit_id} unit={u} first={i === 0} />)
          )}
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
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

function UnitRow({ unit, first }: { unit: UnitOccupancy; first: boolean }) {
  const { colors } = useTheme();
  const type = unitTypeLabel(unit.unit_type, unit.type_label);
  const detail = [type !== unit.name.replace(/ \d+$/, '') ? type : null, unit.floor]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.unit, { borderColor: colors.rule }, first && styles.firstUnit]}>
      <View style={styles.unitMain}>
        <Text variant="bodyStrong">{unit.name}</Text>
        {unit.occupancy === 'occupied' ? (
          <Text tone="inkMuted">{unit.tenant_name}</Text>
        ) : detail ? (
          <Text variant="caption" tone="inkMuted">
            {detail}
          </Text>
        ) : null}
        {unit.available_from ? (
          <View style={styles.stamp}>
            <Stamp
              tone="due"
              label={`Available from ${formatDate(new Date(unit.available_from + 'T00:00:00'))}`}
            />
          </View>
        ) : null}
        {unit.occupancy === 'vacant' ? (
          <Button
            title="Add tenant here"
            variant="link"
            onPress={() => router.push({ pathname: '/tenants/new', params: { unitId: unit.unit_id } })}
          />
        ) : unit.tenancy_id ? (
          <Button
            title="Open tenant"
            variant="link"
            onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: unit.tenancy_id! } })}
          />
        ) : null}
      </View>
      <Text variant="amount" align="right">
        {formatINR(unit.monthly_rent)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  body: { paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.xxl },
  section: { gap: space.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  unit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstUnit: { borderTopWidth: StyleSheet.hairlineWidth },
  unitMain: { flex: 1, gap: 2 },
  stamp: { marginTop: space.xs },
});
