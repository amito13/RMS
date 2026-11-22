import { Pressable, StyleSheet } from 'react-native';

import { space, useTheme } from '@/theme';

import { Text } from './text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A single-choice option, e.g. a unit type. Selected chips fill black. */
export function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.field,
          borderColor: selected ? colors.brand : colors.rule,
        },
        pressed && styles.pressed,
      ]}>
      <Text variant="label" style={{ color: selected ? colors.onBrand : colors.ink, fontSize: 13.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
