import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { radius, space, touchTarget, typography, useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'link';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const container = {
    primary: { backgroundColor: colors.brand },
    secondary: { borderWidth: 1.5, borderColor: colors.brand },
    link: { minHeight: undefined, paddingVertical: space.sm, paddingHorizontal: 0 },
  }[variant];
  const textColor = { primary: colors.onBrand, secondary: colors.brand, link: colors.brand }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      hitSlop={variant === 'link' ? space.sm : undefined}
      style={({ pressed }) => [
        styles.base,
        container,
        variant === 'link' && styles.link,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[typography.label, styles.label, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.control,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { alignSelf: 'flex-start' },
  label: { fontSize: 16 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
