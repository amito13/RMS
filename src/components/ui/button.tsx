import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { space, typography, useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'link' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Icon before the title. */
  icon?: SymbolViewProps['name'];
  /** Smaller pill for use inside cards and rows. */
  compact?: boolean;
};

/** Pill buttons: black primary, white outlined secondary, red danger, or a text link. */
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, compact }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const container = {
    primary: { backgroundColor: colors.brand },
    danger: { backgroundColor: colors.overdue },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule },
    link: { minHeight: undefined, paddingVertical: space.sm, paddingHorizontal: 0 },
  }[variant];
  const textColor = {
    primary: colors.onBrand,
    secondary: colors.ink,
    link: colors.ink,
    danger: colors.onBrand,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      hitSlop={variant === 'link' ? space.sm : undefined}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        container,
        variant === 'link' && styles.link,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <SymbolView name={icon} tintColor={textColor} size={18} /> : null}
          <Text
            style={[
              typography.label,
              styles.label,
              variant === 'link' && styles.linkLabel,
              { color: textColor },
            ]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 46, paddingHorizontal: space.lg },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  link: { alignSelf: 'flex-start' },
  label: { fontSize: 15 },
  linkLabel: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});
