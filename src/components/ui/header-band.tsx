import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

import { IconButton, icons } from './icon-button';
import { Text } from './text';

export type HeaderBandProps = {
  /** Shows a round back button above the title. */
  onBack?: () => void;
  /** Use a close (×) icon instead of a back arrow, for modals. */
  close?: boolean;
  title: string;
  /** Small line above the title, e.g. the tenant and unit, or "RMS". */
  overline?: string;
  /** Show the overline as the spaced-out RMS wordmark. */
  wordmark?: boolean;
  /** One line of context under the title. */
  subtitle?: string;
  /** Large headline type. */
  large?: boolean;
  /** Pad for the status bar. Off when something is drawn above the header. */
  inset?: boolean;
};

/** Screen header on the paper: round back button, small overline, bold title. */
export function HeaderBand({ title, overline, wordmark, subtitle, large, onBack, close, inset = true }: HeaderBandProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: (inset ? insets.top : 0) + space.md }]}>
      {onBack ? (
        <View style={styles.back}>
          <IconButton icon={close ? icons.close : icons.back} label={close ? 'Close' : 'Back'} onPress={onBack} />
        </View>
      ) : null}
      {overline ? (
        <Text
          variant="caption"
          style={[styles.overline, { color: colors.inkMuted }, wordmark && styles.wordmark]}>
          {overline}
        </Text>
      ) : null}
      <Text
        variant="title"
        accessibilityRole="header"
        style={large ? styles.large : undefined}>
        {title}
      </Text>
      {subtitle ? (
        <Text tone="inkMuted" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg + space.xs,
    paddingBottom: space.sm,
  },
  back: { alignSelf: 'flex-start', marginBottom: space.lg, marginLeft: -space.xs },
  overline: { marginBottom: 2 },
  wordmark: { letterSpacing: 1.4, fontSize: 13 },
  large: { fontSize: 34, lineHeight: 40, letterSpacing: -0.9 },
  subtitle: { marginTop: space.xs, maxWidth: 520 },
});
