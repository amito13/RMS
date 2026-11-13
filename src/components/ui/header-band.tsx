import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { Text } from './text';

export type HeaderBandProps = {
  /** Shows a "Back" button above the title. */
  onBack?: () => void;
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
export function HeaderBand({ title, overline, wordmark, subtitle, large, onBack }: HeaderBandProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.band,
        { backgroundColor: colors.header, paddingTop: insets.top + (onBack ? space.xs : space.lg) },
      ]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            tintColor={colors.onHeader}
            size={22}
          />
          <Text variant="label" style={{ color: colors.onHeader }}>
            Back
          </Text>
        </Pressable>
      ) : null}
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
    marginBottom: space.xs,
  },
  overline: { marginBottom: space.xs },
  subtitle: { marginTop: space.xs, maxWidth: 520 },
});
