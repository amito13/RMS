import { StyleSheet, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

import { Text } from './text';

export type StampTone = 'paid' | 'due' | 'late' | 'neutral';

type Props = {
  label: string;
  tone: StampTone;
  /** Tilt like a hand-pressed stamp. Use only for the one stamp in a screen header. */
  tilted?: boolean;
};

/**
 * Rent status as a rubber-stamp impression: a double-ruled outline in stamp
 * ink. The label always names the status, so colour is never the only signal.
 */
export function Stamp({ label, tone, tilted }: Props) {
  const { colors } = useTheme();
  const ink = { paid: colors.paid, due: colors.due, late: colors.overdue, neutral: colors.inkMuted }[
    tone
  ];

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.outer, { borderColor: ink }, tilted && styles.tilted]}>
      <View style={[styles.inner, { borderColor: ink }]}>
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 2,
  },
  inner: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  tilted: { transform: [{ rotate: '-3deg' }] },
});
