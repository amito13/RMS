import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { Text } from '@/components/ui/text';
import { useProperties, useUnits } from '@/features/properties/queries';
import { propertySetup } from '@/features/properties/setup-flow';
import { summariseUnitTypes } from '@/features/properties/unit-types';
import { space, useTheme } from '@/theme';

export default function Properties() {
  const { colors } = useTheme();
  const properties = useProperties();
  const units = useUnits();

  const loading = properties.isPending || units.isPending;
  const failed = (properties.isError && !properties.data) || (units.isError && !units.data);
  const refreshing = (properties.isRefetching || units.isRefetching) && !loading;

  function addProperty() {
    propertySetup.open();
    router.push('/onboarding/location');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={styles.grow}
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
      <HeaderBand title="Properties" />
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.brand} accessibilityLabel="Loading properties" />
        ) : failed ? (
          <View style={styles.message}>
            <Text variant="heading">Couldn&apos;t load your properties</Text>
            <Text tone="inkMuted">Check your internet connection and pull down to try again.</Text>
          </View>
        ) : (
          <>
            {properties.data!.map((p, i) => {
              const own = units.data!.filter((u) => u.property_id === p.id);
              const occupied = own.filter((u) => u.occupancy === 'occupied').length;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityHint="Opens the property's units"
                  onPress={() => router.push({ pathname: '/properties/[id]', params: { id: p.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    { borderColor: colors.rule },
                    i === 0 && styles.firstRow,
                    pressed && { backgroundColor: colors.surface },
                  ]}>
                  <View style={styles.rowMain}>
                    <Text variant="heading">{p.name}</Text>
                    <Text tone="inkMuted">
                      {p.locality}, {p.city}
                    </Text>
                    <Text variant="caption" tone="inkMuted" style={styles.types}>
                      {own.length ? summariseUnitTypes(own) : 'No units yet'}
                    </Text>
                  </View>
                  <View style={styles.rowSide}>
                    <Text variant="amount" align="right">
                      {occupied}/{own.length}
                    </Text>
                    <Text variant="caption" tone="inkMuted" align="right">
                      occupied
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.actions}>
              <Button title="Add property" variant="secondary" onPress={addProperty} />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
  body: { paddingHorizontal: space.lg, paddingVertical: space.xl, flexGrow: 1 },
  message: { gap: space.xs },
  row: {
    flexDirection: 'row',
    gap: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, gap: 2 },
  types: { marginTop: space.xs },
  rowSide: { justifyContent: 'center' },
  actions: { marginTop: space.xl },
});
