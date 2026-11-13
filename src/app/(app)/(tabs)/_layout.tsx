import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { fonts, useTheme } from '@/theme';

type IconName = SymbolViewProps['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={name} tintColor={color} size={24} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.rule },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.paper },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: tabIcon({ ios: 'calendar', android: 'today', web: 'today' }),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Tenants',
          tabBarIcon: tabIcon({ ios: 'person.2', android: 'group', web: 'group' }),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: 'Properties',
          tabBarIcon: tabIcon({ ios: 'building.2', android: 'apartment', web: 'apartment' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: tabIcon({ ios: 'gearshape', android: 'settings', web: 'settings' }),
        }}
      />
    </Tabs>
  );
}
