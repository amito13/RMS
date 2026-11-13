import { Pressable, StyleSheet, View } from 'react-native';

import { radius, touchTarget, useTheme } from '@/theme';

import { Text } from './text';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** − n + control for small counts, e.g. how many 1BHKs. */
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
        onPress={() => onChange(value + delta)}
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.rule, backgroundColor: colors.surface },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <Text variant="heading" tone="brand">
          {delta < 0 ? '−' : '+'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={styles.row}
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
      <Text variant="amount" align="center" style={styles.value}>
        {value}
      </Text>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 44 },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
});
