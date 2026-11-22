import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

const house = require('../../../assets/illustrations/house.svg');
const street = require('../../../assets/illustrations/street.svg');

type Props = {
  /** One house, or two buildings side by side. */
  art?: 'house' | 'street';
  height: number;
  /** Fades the sky into the paper at the bottom (full-bleed screen tops). */
  fadeToPaper?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Drawn over the sky, e.g. a greeting or a back button. */
  children?: ReactNode;
};

/** Illustrated sky with a house on green hills, used at the top of main screens. */
export function Scene({ art = 'house', height, fadeToPaper, style, children }: Props) {
  const { colors } = useTheme();
  const bottom = fadeToPaper ? colors.paper : colors.skyBottom;
  return (
    <View
      style={[
        styles.sky,
        { height, backgroundImage: `linear-gradient(180deg, ${colors.skyTop} 0%, ${colors.skyBottom} 62%, ${bottom} 100%)` },
        style,
      ]}>
      <Image
        source={art === 'house' ? house : street}
        contentFit="cover"
        contentPosition="bottom"
        style={StyleSheet.absoluteFill}
        accessible={false}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { overflow: 'hidden' },
});
