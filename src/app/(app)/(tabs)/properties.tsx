import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, icons } from '@/components/ui/icon-button';
import { Card, PaperGrain } from '@/components/ui/paper';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Scene } from '@/components/ui/scene';
import { TAB_BAR_SPACE } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useProperties, useUnits } from '@/features/properties/queries';
import { propertySetup } from '@/features/properties/setup-flow';
import { summariseUnitTypes } from '@/features/properties/unit-types';
import { formatINR } from '@/lib/format';
import { cardShadow, space, useTheme } from '@/theme';

export default function Properties() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const properties = useProperties();
  const units = useUnits();

  const loading = properties.isPending || units.isPending;
  const failed = (properties.isError && !properties.data) || (units.isError && !units.data);
  const refreshing = (properties.isRefetching || units.isRefetching) && !loading;
  const unitCount = units.data?.length ?? 0;

  function addProperty() {
    propertySetup.open();
    router.push('/onboarding/location');
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              properties.refetch();
              units.refetch();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }>
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text variant="title" accessibilityRole="header">
              Properties
            </Text>
            {properties.data?.length ? (
              <Text variant="caption" tone="inkMuted">
                {properties.data.length} {properties.data.length === 1 ? 'property' : 'properties'} · {unitCount}{' '}
                {unitCount === 1 ? 'unit' : 'units'}
              </Text>
            ) : null}
          </View>
          <IconButton icon={icons.add} label="Add property" filled size={48} onPress={addProperty} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} accessibilityLabel="Loading properties" />
        ) : failed ? (
          <Card>
            <Text variant="heading">Couldn&apos;t load your properties</Text>
            <Text tone="inkMuted">Check your internet connection and pull down to try again.</Text>
          </Card>
        ) : (
          properties.data!.map((p, i) => {
            const own = units.data!.filter((u) => u.property_id === p.id);
            const occupied = own.filter((u) => u.occupancy === 'occupied');
            const vacant = own.length - occupied.length;
            const rent = occupied.reduce((sum, u) => sum + u.monthly_rent, 0);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${occupied.length} of ${own.length} rented`}
                accessibilityHint="Opens the property's units"
                onPress={() => router.push({ pathname: '/properties/[id]', params: { id: p.id } })}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}>
                <Scene art={i % 2 ? 'street' : 'house'} height={i === 0 ? 150 : 120} style={styles.thumb}>
                  <View style={[styles.tag, styles.tagTopLeft, { backgroundColor: 'rgba(251,250,247,0.92)' }]}>
                    <View style={[styles.dot, { backgroundColor: vacant ? colors.due : colors.paid }]} />
                    <Text variant="caption" style={styles.tagText}>
                      {vacant ? `${occupied.length} of ${own.length} rented` : `All ${own.length} rented`}
                    </Text>
                  </View>
                  <View style={[styles.go, { backgroundColor: colors.brand }]}>
                    <SymbolView name={icons.arrowUpRight} tintColor={colors.onBrand} size={16} />
                  </View>
                </Scene>
                <View style={styles.info}>
                  <View style={styles.between}>
                    <View style={styles.flex}>
                      <Text variant="heading">{p.name}</Text>
                      <Text variant="caption" tone="inkMuted" numberOfLines={1}>
                        {[p.address_line, p.locality, p.city].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <View style={styles.rent}>
                      <Text variant="amount">{formatINR(rent)}</Text>
                      <Text variant="caption" tone="inkMuted">
                        a month
                      </Text>
                    </View>
                  </View>
                  {own.length ? <ProgressBar value={occupied.length / own.length} /> : null}
                  <View style={styles.tags}>
                    {own.length ? (
                      summariseUnitTypes(own)
                        .split(', ')
                        .map((label) => (
                          <View key={label} style={[styles.tag, { backgroundColor: colors.wash }]}>
                            <Text variant="caption" style={styles.tagText}>
                              {label}
                            </Text>
                          </View>
                        ))
                    ) : (
                      <Text variant="caption" tone="inkMuted">
                        No units yet
                      </Text>
                    )}
                    {vacant ? (
                      <View style={[styles.tag, { backgroundColor: colors.dueSoft }]}>
                        <Text variant="caption" style={[styles.tagText, { color: colors.due }]}>
                          {vacant} vacant
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: TAB_BAR_SPACE, gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  card: { borderRadius: 28, padding: space.sm, boxShadow: cardShadow },
  pressed: { opacity: 0.85 },
  thumb: { borderRadius: 22 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tagTopLeft: { position: 'absolute', left: 10, top: 10 },
  tagText: { fontSize: 12, color: '#161616' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  go: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 10, gap: space.md - 2 },
  between: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rent: { alignItems: 'flex-end' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
