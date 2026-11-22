import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

// Open on sign-in, not on the first file alphabetically (forgot-password).
export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
    />
  );
}
