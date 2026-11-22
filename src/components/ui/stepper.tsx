import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** − n + pill for small counts, e.g. how many 1BHKs. */
export function Stepper({ label, value, min, max, onChange }: Props) {
  const { colors } = useTheme();

  const button = (delta: -1 | 1) => {
    const disabled = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={delta < 0 ? `Fewer ${label}` : `More ${label}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={4}
        onPress={() => onChange(value + delta)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.wash },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <Text variant="heading">{delta < 0 ? '−' : '+'}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.row, { backgroundColor: colors.field, borderColor: colors.rule }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
      }}>
      {button(-1)}
      <Text variant="heading" align="center" style={styles.value}>
        {value}
      </Text>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 40 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
