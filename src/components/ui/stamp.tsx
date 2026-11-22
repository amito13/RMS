import { StyleSheet, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

import { Text } from './text';

export type StampTone = 'paid' | 'due' | 'late' | 'neutral';

type Props = {
  label: string;
  tone: StampTone;
  /** Kept for older call sites; pills are never tilted. */
  tilted?: boolean;
  /** Smaller pill for dense rows. */
  small?: boolean;
};

/**
 * Rent status as a pastel pill with a dot. The label always names the
 * status, so colour is never the only signal.
 */
export function Stamp({ label, tone, small }: Props) {
  const { colors } = useTheme();
  const [bg, ink] = {
    paid: [colors.paidSoft, colors.paid],
    due: [colors.dueSoft, colors.due],
    late: [colors.overdueSoft, colors.overdue],
    neutral: [colors.neutralSoft, '#4A4945'],
  }[tone];

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.pill, small && styles.small, { backgroundColor: bg }]}>
      {tone !== 'neutral' ? <View style={[styles.dot, { backgroundColor: ink }]} /> : null}
      <Text style={[styles.label, small && styles.smallLabel, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  small: { height: 24, paddingHorizontal: 9 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12.5, lineHeight: 16 },
  smallLabel: { fontSize: 11.5 },
});
