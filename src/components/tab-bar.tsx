import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { floatShadow, space, useTheme } from '@/theme';

/** Icon per tab route name. */
const TAB_ICONS: Record<string, SymbolViewProps['name']> = {
  index: { ios: 'house', android: 'home', web: 'home' },
  tenants: { ios: 'person.2', android: 'group', web: 'group' },
  properties: { ios: 'building.2', android: 'apartment', web: 'apartment' },
  settings: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
};

/**
 * Floating white pill at the bottom. The active tab is a black pill with its
 * label; the others show only their icon.
 */
export function PillTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, space.md) + space.sm }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface }]} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const title = typeof options.title === 'string' ? options.title : route.name;

          function onPress() {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigateToTab(route.key);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={title}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.tab,
                focused && [styles.active, { backgroundColor: colors.brand }],
                pressed && !focused && styles.pressed,
              ]}>
              <SymbolView
                name={TAB_ICONS[route.name] ?? TAB_ICONS.index}
                tintColor={focused ? colors.onBrand : '#4A4945'}
                size={22}
              />
              {focused ? (
                <Text variant="label" style={{ color: colors.onBrand }}>
                  {title}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  bar: {
    height: 68,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    boxShadow: floatShadow,
  },
  tab: {
    height: 52,
    minWidth: 56,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  active: { paddingHorizontal: space.lg + 2 },
  pressed: { opacity: 0.6 },
});
