import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { formatDayHeading } from '@/lib/format';
import { space } from '@/theme';

export default function Today() {
  return (
    <Screen edges={['top']}>
      <Text variant="label" tone="inkMuted">
        {formatDayHeading(new Date())}
      </Text>
      <Text variant="display" style={styles.headline}>
        Nothing to collect yet
      </Text>
      <View style={styles.body}>
        <Text tone="inkMuted">
          Once you add a property and its tenants, this screen lists who to collect rent from
          today, building by building.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { marginTop: space.xs },
  body: { marginTop: space.lg, maxWidth: 520 },
});
