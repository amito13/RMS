import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { useAppFonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryProvider>
        <RootNavigator />
      </QueryProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded, fontError] = useAppFonts();
  const { scheme, colors } = useTheme();

  // If fonts fail to load, carry on with system fonts rather than block the app.
  const ready = !isLoading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // Keep the splash screen up until we know who is signed in and fonts are ready.
  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}>
        {/* redirectTo is explicit: the (auth) group has no index route, so the
            default fallback ("/") would show "Unmatched route" after sign-out. */}
        <Stack.Protected guard={!!session} redirectTo="/sign-in">
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Opened from the password-reset email, signed in or not. */}
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}
