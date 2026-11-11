import { StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme';

export default function Tenants() {
  return (
    <Screen edges={['top']}>
      <Text variant="title">Tenants</Text>
      <Text variant="heading" style={styles.emptyTitle}>
        No tenants yet
      </Text>
      <Text tone="inkMuted" style={styles.emptyBody}>
        You can add tenants after setting up a property and its rooms.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: { marginTop: space.xxl },
  emptyBody: { marginTop: space.xs, maxWidth: 520 },
});
