import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setLoading(true);
    // The link in the email opens rms://reset-password in this app.
    // That URL must be listed under Auth → URL Configuration → Redirect URLs in Supabase.
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setLoading(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <Screen
        scroll
        header={{
          overline: 'RMS',
          wordmark: true,
          title: 'Check your email',
          subtitle: `We sent a password reset link to ${sentTo}. Open it on this phone to choose a new password.`,
        }}>
        <Button title="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      header={{
        overline: 'RMS',
        wordmark: true,
        title: 'Reset your password',
        subtitle: "We'll email you a link to choose a new password.",
      }}>
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button title="Send reset link" onPress={handleSend} loading={loading} />
        <Button title="Back to sign in" variant="link" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
