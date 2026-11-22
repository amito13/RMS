import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const hatch = require('../../../assets/illustrations/hatch.svg');

type Props = {
  /** Filled share, 0 to 1 (e.g. rent collected). */
  value: number;
  /** Optional second share after the first, in the warm accent (e.g. promised). */
  extra?: number;
  height?: number;
};

/** Black bar, optional peach bar, then a hatched remainder. */
export function ProgressBar({ value, extra = 0, height = 10 }: Props) {
  const { colors } = useTheme();
  const a = clamp(value);
  const b = clamp(Math.min(extra, 1 - a));
  const rest = 1 - a - b;
  return (
    <View
      style={[styles.row, { height }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(a * 100) }}>
      {a > 0 ? <View style={[styles.seg, { flex: a, backgroundColor: colors.brand }]} /> : null}
      {b > 0 ? <View style={[styles.seg, { flex: b, backgroundColor: colors.gold }]} /> : null}
      {rest > 0.001 ? (
        <View style={[styles.seg, { flex: rest }]}>
          <Image source={hatch} contentFit="cover" contentPosition="left" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
    </View>
  );
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  seg: { borderRadius: 999, overflow: 'hidden' },
});
