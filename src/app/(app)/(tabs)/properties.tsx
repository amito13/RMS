import { StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme';

export default function Properties() {
  return (
    <Screen bottomInset={false} header={{ title: 'Properties' }}>
      <Text variant="heading">No properties yet</Text>
      <Text tone="inkMuted" style={styles.emptyBody}>
        Your buildings, their rooms and the rent for each will be listed here.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyBody: { marginTop: space.xs, maxWidth: 520 },
});
