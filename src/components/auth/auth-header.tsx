import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { space } from '@/theme';

type Props = { title: string; subtitle: string };

/** Wordmark, title and one line of context at the top of every auth screen. */
export function AuthHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <Text variant="heading" tone="khata" style={styles.wordmark}>
        RMS
      </Text>
      <Text variant="title">{title}</Text>
      <Text tone="inkMuted">{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs, marginBottom: space.xl },
  wordmark: { marginBottom: space.lg },
});
