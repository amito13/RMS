import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cardShadow, radius, space, useTheme } from '@/theme';

const grain = require('../../../assets/images/paper-grain.png');

/** Fine paper grain laid over a whole screen. Touches pass through it. */
export function PaperGrain() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={grain} resizeMode="repeat" style={styles.grain} />
    </View>
  );
}

type CardProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding. Defaults to 16; use 0 for edge-to-edge rows. */
  padding?: number;
};

/** White paper card with a soft shadow. */
export function Card({ children, style, padding = space.lg }: CardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, padding }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  grain: { width: '100%', height: '100%', opacity: 0.9 },
  card: { borderRadius: radius.card, boxShadow: cardShadow, gap: space.md },
});
