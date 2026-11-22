import { Stack } from 'expo-router';

import { useGenerateRentOnOpen } from '@/features/money/use-generate-rent';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  useGenerateRentOnOpen();

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="(tabs)" />
      {/* Money actions open as modals over the tenant or Today screen. */}
      <Stack.Screen name="pay" options={{ presentation: 'modal' }} />
      <Stack.Screen name="rent-month" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reschedule" options={{ presentation: 'modal' }} />
      <Stack.Screen name="renew" options={{ presentation: 'modal' }} />
      <Stack.Screen name="move-date" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notice" options={{ presentation: 'modal' }} />
      <Stack.Screen name="end-tenancy" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-tenant" options={{ presentation: 'modal' }} />
      <Stack.Screen name="document-viewer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
  );
}
