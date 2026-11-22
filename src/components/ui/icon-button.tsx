import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { buttonShadow, useTheme } from '@/theme';

type Props = {
  icon: SymbolViewProps['name'];
  /** Read out by screen readers; the button has no visible text. */
  label: string;
  onPress: () => void;
  /** Black filled button (e.g. Add) instead of white. */
  filled?: boolean;
  /** White with a thin outline instead of a shadow, for use inside cards. */
  outlined?: boolean;
  size?: number;
};

/** Round icon-only button: back, close, add, call. */
export function IconButton({ icon, label, onPress, filled, outlined, size = 44 }: Props) {
  const { colors } = useTheme();
  const tint = filled ? colors.onBrand : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: filled ? colors.brand : colors.surface,
          boxShadow: outlined ? undefined : buttonShadow,
          borderWidth: outlined ? 1 : 0,
          borderColor: colors.rule,
        },
        pressed && styles.pressed,
      ]}>
      <SymbolView name={icon} tintColor={tint} size={Math.round(size * 0.45)} />
    </Pressable>
  );
}

/** Icons used across the app, per platform. */
export const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  call: { ios: 'phone', android: 'call', web: 'call' },
  chat: { ios: 'message', android: 'chat', web: 'chat' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  arrowUpRight: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  home: { ios: 'house', android: 'home', web: 'home' },
  people: { ios: 'person.2', android: 'group', web: 'group' },
  building: { ios: 'building.2', android: 'apartment', web: 'apartment' },
  settings: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
} as const satisfies Record<string, SymbolViewProps['name']>;

const styles = StyleSheet.create({
  button: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});
