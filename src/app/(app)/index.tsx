import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function Home() {
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) Alert.alert('Sign out failed', error.message);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'RMS' }} />
      <Text style={styles.text}>Signed in as</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <View style={styles.action}>
        <Button title="Sign out" onPress={handleSignOut} loading={signingOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 4 },
  text: { fontSize: 15, color: '#666' },
  email: { fontSize: 18, fontWeight: '600', color: '#111' },
  action: { alignSelf: 'stretch', marginTop: 24 },
});
