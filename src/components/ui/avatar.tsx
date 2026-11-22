import { StyleSheet, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

import { Text } from './text';

export type AvatarTone = 'paid' | 'due' | 'late' | 'neutral' | 'info' | 'dark';

type Props = {
  name: string;
  tone?: AvatarTone;
  size?: number;
};

/** Initials in a soft circle, tinted by rent status. */
export function Avatar({ name, tone = 'info', size = 46 }: Props) {
  const { colors } = useTheme();
  const [bg, ink] = {
    paid: [colors.paidSoft, colors.paid],
    due: [colors.dueSoft, colors.due],
    late: [colors.overdueSoft, colors.overdue],
    neutral: [colors.neutralSoft, '#4A4945'],
    info: [colors.infoSoft, colors.info],
    dark: [colors.brand, colors.onBrand],
  }[tone];

  return (
    <View
      accessible={false}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ color: ink, fontFamily: fonts.bodyBold, fontSize: size * 0.32 }}>{initials(name)}</Text>
    </View>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
