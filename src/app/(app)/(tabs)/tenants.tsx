import { StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme';

export default function Tenants() {
  return (
    <Screen bottomInset={false} header={{ title: 'Tenants' }}>
      <Text variant="heading">No tenants yet</Text>
      <Text tone="inkMuted" style={styles.emptyBody}>
        You can add tenants after setting up a property and its rooms.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyBody: { marginTop: space.xs, maxWidth: 520 },
});
