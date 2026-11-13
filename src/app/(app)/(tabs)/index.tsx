import { StyleSheet } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { formatDayHeading } from '@/lib/format';

export default function Today() {
  return (
    <Screen
      bottomInset={false}
      header={{ overline: formatDayHeading(new Date()), title: 'Nothing to collect yet', large: true }}>
      <Text tone="inkMuted" style={styles.body}>
        Once you add a property and its tenants, this screen lists who to collect rent from today,
        building by building.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { maxWidth: 520 },
});
