import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/use-profile';
import { usePropertySetupOpen } from '@/features/properties/setup-flow';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { space, useAppFonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // Needed for the pinch-to-zoom document viewer.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryProvider>
          <RootNavigator />
        </QueryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useAppFonts();
  const { colors } = useTheme();
  const profile = useProfile();
  const setupOpen = usePropertySetupOpen();

  const signedIn = !!session;
  const onboarded = !!profile.data?.onboarding_completed_at;
  // Signed in but the profile hasn't loaded yet (first launch, no cache).
  const profilePending = signedIn && profile.isPending;

  // If fonts fail to load, carry on with system fonts rather than block the app.
  const ready = !isLoading && (fontsLoaded || !!fontError) && !(profilePending && !profile.isError);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Keep the splash screen up until we know who is signed in, whether they've
  // set up a property, and fonts are ready.
  if (!ready) return null;

  if (signedIn && profile.isError && !profile.data) {
    return (
      <Screen header={{ overline: 'RMS', wordmark: true, title: "Couldn't load your account" }}>
        <Text tone="inkMuted" style={{ marginBottom: space.lg }}>
          Check your internet connection, then try again.
        </Text>
        <Button title="Try again" onPress={() => profile.refetch()} loading={profile.isFetching} />
      </Screen>
    );
  }

  return (
    <>
      {/* Every screen opens with the emerald header band, so status bar text is always light. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}>
        {/* Each guard has an explicit redirect: groups without an index route
            would otherwise fall back to "/" and show "Unmatched route". */}
        <Stack.Protected guard={signedIn && onboarded} redirectTo={signedIn ? '/onboarding' : '/sign-in'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        {/* First-time property setup (PRD 7.2). After onboarding it's reopened
            on purpose to add another property, or to show the "done" screen. */}
        <Stack.Protected guard={signedIn && (!onboarded || setupOpen)} redirectTo={signedIn ? '/' : '/sign-in'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Opened from the password-reset email, signed in or not. */}
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}
