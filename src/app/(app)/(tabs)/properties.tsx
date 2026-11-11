import { StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme';

export default function Properties() {
  return (
    <Screen edges={['top']}>
      <Text variant="title">Properties</Text>
      <Text variant="heading" style={styles.emptyTitle}>
        No properties yet
      </Text>
      <Text tone="inkMuted" style={styles.emptyBody}>
        Your buildings, their rooms and the rent for each will be listed here.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: { marginTop: space.xxl },
  emptyBody: { marginTop: space.xs, maxWidth: 520 },
});
