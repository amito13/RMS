import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { Text } from './text';

export type HeaderBandProps = {
  title: string;
  /** Small line above the title, e.g. the date or the RMS wordmark. */
  overline?: string;
  /** Show the overline as the gold RMS wordmark instead of muted text. */
  wordmark?: boolean;
  /** One line of context under the title. */
  subtitle?: string;
  /** Large headline type (Today screen). Defaults to the title size. */
  large?: boolean;
};

/** Emerald band at the top of every screen, running up under the status bar. */
export function HeaderBand({ title, overline, wordmark, subtitle, large }: HeaderBandProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.band,
        { backgroundColor: colors.header, paddingTop: insets.top + space.lg },
      ]}>
      {overline ? (
        <Text
          variant={wordmark ? 'heading' : 'label'}
          style={[styles.overline, { color: wordmark ? colors.gold : colors.onHeaderMuted }]}>
          {overline}
        </Text>
      ) : null}
      <Text
        variant={large ? 'display' : 'title'}
        accessibilityRole="header"
        style={{ color: colors.onHeader }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.onHeaderMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  overline: { marginBottom: space.xs },
  subtitle: { marginTop: space.xs, maxWidth: 520 },
});
