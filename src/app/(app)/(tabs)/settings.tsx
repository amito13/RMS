import Constants from 'expo-constants';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

export default function Settings() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setSigningOut(false);
    if (signOutError) setError(`Couldn't sign out: ${signOutError.message}. Try again.`);
  }

  return (
    <Screen edges={['top']}>
      <Text variant="title">Settings</Text>

      <View style={[styles.section, { borderColor: colors.rule }]}>
        <Text variant="caption" tone="inkMuted">
          Signed in as
        </Text>
        <Text variant="bodyStrong">{session?.user.email}</Text>
      </View>

      <View style={styles.actions}>
        <Button title="Sign out" variant="secondary" onPress={handleSignOut} loading={signingOut} />
        {error ? (
          <Text variant="caption" tone="khata">
            {error}
          </Text>
        ) : null}
      </View>

      <Text variant="caption" tone="inkFaint" style={styles.version}>
        RMS {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: space.xl,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { marginTop: space.xl, gap: space.sm },
  version: { marginTop: 'auto' },
});
