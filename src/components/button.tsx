import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#1f5eff'} />
      ) : (
        <Text style={[styles.text, !isPrimary && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primary: { backgroundColor: '#1f5eff' },
  secondary: { backgroundColor: 'transparent' },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryText: { color: '#1f5eff' },
});
