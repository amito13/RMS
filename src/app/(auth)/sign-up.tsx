import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFooter } from '@/components/auth/auth-footer';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSignUp() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords don’t match. Enter the same password in both fields.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // With "Confirm email" on in Supabase, no session is returned until the
    // user clicks the link in their inbox. Otherwise they are signed in now.
    if (!data.session) setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <Screen
        scroll
        header={{
          overline: 'RMS',
          wordmark: true,
          title: 'Confirm your email',
          subtitle: `We sent a confirmation link to ${sentTo}. Open it, then come back and sign in.`,
        }}>
        <AuthFooter prompt="Confirmed already?" linkText="Sign in" href="/sign-in" />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      header={{
        overline: 'RMS',
        wordmark: true,
        title: 'Create your account',
        subtitle: 'Set up your properties, then add tenants and track their rent.',
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
        <TextField
          label="Password"
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
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Enter it again"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSignUp}
        />

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button title="Create account" onPress={handleSignUp} loading={loading} />
      </View>

      <AuthFooter prompt="Already have an account?" linkText="Sign in" href="/sign-in" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
