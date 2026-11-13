import { Stack } from 'expo-router';

import { SetupDraftProvider } from '@/features/properties/setup-draft';
import { useTheme } from '@/theme';

/** Property setup: welcome → location → rooms and rent → review → done (PRD 7.2). */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <SetupDraftProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
      />
    </SetupDraftProvider>
  );
}
