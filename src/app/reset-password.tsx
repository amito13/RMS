import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { createSessionFromLink } from '@/lib/auth-link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { space, useTheme } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

type LinkState = { status: 'checking' } | { status: 'ready' } | { status: 'invalid'; message: string };

const NO_LINK_MESSAGE = 'This link has expired or was already used.';

function hasAuthParams(url: string | null): url is string {
  return !!url && /access_token|code=|error/.test(url);
}

/** Opened from the password-reset email (rms://reset-password#access_token=…). */
export default function ResetPassword() {
  const url = Linking.useLinkingURL();
  const { session } = useAuth();
  const { colors } = useTheme();
  const handledUrl = useRef<string | null>(null);

  // Result of signing in with the link; null until the link has been checked.
  const [linkResult, setLinkResult] = useState<LinkState | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAuthParams(url) || handledUrl.current === url) return;
    handledUrl.current = url;

    createSessionFromLink(url).then((result) => {
      setLinkResult(
        result.ok ? { status: 'ready' } : { status: 'invalid', message: result.message }
      );
    });
  }, [url]);

  // Without auth details in the URL, a signed-in landlord (link already
  // handled) can still set a password; anyone else needs a new link.
  const linkState: LinkState = hasAuthParams(url)
    ? (linkResult ?? { status: 'checking' })
    : session
      ? { status: 'ready' }
      : { status: 'invalid', message: NO_LINK_MESSAGE };

  async function handleSave() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords don’t match. Enter the same password in both fields.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/');
  }

  if (linkState.status === 'checking') {
    return (
      <Screen centered header={{ overline: 'RMS', wordmark: true, title: 'Checking your link' }}>
        <ActivityIndicator color={colors.brand} accessibilityLabel="Checking your reset link" />
      </Screen>
    );
  }

  if (linkState.status === 'invalid') {
    return (
      <Screen
        scroll card
        header={{
          overline: 'RMS',
          wordmark: true,
          title: "This link didn't work",
          subtitle: `${linkState.message} Ask for a new reset link and open the latest email.`,
        }}>
        <Button title="Send a new link" onPress={() => router.replace('/forgot-password')} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll card
      header={{
        overline: 'RMS',
        wordmark: true,
        title: 'Choose a new password',
        subtitle: "You'll use it the next time you sign in.",
      }}>
      <View style={styles.form}>
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Enter it again"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSave}
        />

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button title="Save new password" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
