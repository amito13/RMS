import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFooter } from '@/components/auth/auth-footer';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    // On success, the auth listener updates the session and the router
    // moves to the app automatically.
    if (signInError) setError(signInError.message);
  }

  return (
    <Screen
      scroll card
      hero="house"
      header={{
        overline: 'RMS',
        wordmark: true,
        title: 'Sign in',
        subtitle: 'Keep track of your tenants, rent and documents.',
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
          returnKeyType="next"
        />
        <View style={styles.passwordGroup}>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
          />
          <Button
            title="Forgot password?"
            variant="link"
            onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
          />
        </View>

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button title="Sign in" onPress={handleSignIn} loading={loading} />
      </View>

      <AuthFooter prompt="New to RMS?" linkText="Create an account" href="/sign-up" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  passwordGroup: { gap: space.xs },
});
