import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { propertySetup } from '@/features/properties/setup-flow';
import { space } from '@/theme';

export default function Done() {
  const { name, count } = useLocalSearchParams<{ name?: string; count?: string }>();
  const units = Number(count) || 0;

  function goToProperties() {
    router.replace('/properties');
    propertySetup.close();
  }

  function addTenant() {
    router.replace('/tenants/new');
    propertySetup.close();
  }

  return (
    <Screen
      scroll
      hero="house"
      header={{
        overline: 'Property saved',
        title: `${name || 'Your property'} is set up`,
        subtitle: `${units} ${units === 1 ? 'unit' : 'units'} added. They show as vacant until you add tenants.`,
      }}>
      <View style={styles.stamp}>
        <Stamp label={`${units} vacant`} tone="neutral" />
      </View>
      <Text tone="inkMuted">
        Next, add the tenants who live there. Each tenant goes into one of these units, and their
        rent starts from the unit&apos;s rent.
      </Text>

      <View style={styles.actions}>
        <Button title="Add your first tenant" onPress={addTenant} />
        <Button title="Go to properties" variant="secondary" onPress={goToProperties} />
        <Button
          title="Add another property"
          variant="secondary"
          onPress={() => router.replace('/onboarding/location')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stamp: { marginBottom: space.lg },
  actions: { marginTop: space.xxl, gap: space.md },
});
