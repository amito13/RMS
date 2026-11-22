import Constants from 'expo-constants';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/paper';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { changePassword, deleteAccount, useUpdateProfile } from '@/features/account/account';
import { useProfile } from '@/features/profile/use-profile';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { space } from '@/theme';

const MIN_PASSWORD_LENGTH = 8;

export default function Settings() {
  const { session } = useAuth();
  const email = session?.user.email ?? '';

  return (
    <Screen scroll bottomInset={false} header={{ title: 'Settings' }}>
      <View style={styles.sections}>
        <AccountCard email={email} />
        <ProfileSection />
        <PasswordSection email={email} />
        <SignOutSection />
        <DeleteSection email={email} userId={session?.user.id ?? ''} />
        <Text variant="caption" tone="inkMuted" align="center">
          RMS {Constants.expoConfig?.version}
        </Text>
      </View>
    </Screen>
  );
}

function AccountCard({ email }: { email: string }) {
  const profile = useProfile();
  const name = profile.data?.full_name || 'Your account';
  return (
    <Card style={styles.account}>
      <Avatar name={profile.data?.full_name || email} tone="dark" size={56} />
      <View style={styles.flex}>
        <Text variant="heading">{name}</Text>
        <Text variant="caption" tone="inkMuted">
          {email}
        </Text>
      </View>
    </Card>
  );
}

function ProfileSection() {
  const { session } = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile(session?.user.id ?? '');
  const [name, setName] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const nameValue = name ?? profile.data?.full_name ?? '';
  const noticeValue = notice ?? String(profile.data?.default_notice_period_days ?? 30);
  const dirty = name !== null || notice !== null;

  async function save() {
    setMessage(null);
    const days = Number(noticeValue);
    if (noticeValue === '' || !(days >= 0 && days <= 180)) {
      setMessage({ text: 'Enter a notice period from 0 to 180 days.', error: true });
      return;
    }
    try {
      await update.mutateAsync({ full_name: nameValue.trim() || null, default_notice_period_days: days });
      setName(null);
      setNotice(null);
      setMessage({ text: 'Saved' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Couldn’t save.', error: true });
    }
  }

  return (
    <Card style={styles.section}>
      <Text variant="heading">Your details</Text>
      <TextField label="Your name" value={nameValue} onChangeText={setName} autoCapitalize="words" placeholder="Amit Dewangan" />
      <TextField
        label="Default notice period for new tenants"
        value={noticeValue}
        onChangeText={(v) => setNotice(v.replace(/\D/g, '').slice(0, 3))}
        keyboardType="number-pad"
        hint="Days. You can change it for each tenant."
      />
      {message ? (
        <Text variant="caption" tone={message.error ? 'overdue' : 'paid'}>
          {message.text}
        </Text>
      ) : null}
      <Button title="Save details" variant="secondary" onPress={save} loading={update.isPending} disabled={!dirty} />
    </Card>
  );
}

function PasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function save() {
    setMessage(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setMessage({ text: `Use a new password of at least ${MIN_PASSWORD_LENGTH} characters.`, error: true });
      return;
    }
    if (next !== confirm) {
      setMessage({ text: 'The two new passwords don’t match.', error: true });
      return;
    }
    setSaving(true);
    try {
      await changePassword(email, current, next);
      setOpen(false);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ text: 'Password changed' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Couldn’t change the password.', error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.section}>
      <Text variant="heading">Password</Text>
      {open ? (
        <>
          <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />
          <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint={`At least ${MIN_PASSWORD_LENGTH} characters`} />
          <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
        </>
      ) : null}
      {message ? (
        <Text variant="caption" tone={message.error ? 'overdue' : 'paid'}>
          {message.text}
        </Text>
      ) : null}
      {open ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
          </View>
          <View style={styles.flex}>
            <Button title="Change password" onPress={save} loading={saving} />
          </View>
        </View>
      ) : (
        <Button title="Change password" variant="secondary" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

function SignOutSection() {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setSigningOut(false);
    if (signOutError) setError(`Couldn't sign out: ${signOutError.message}. Try again.`);
  }

  return (
    <Card style={styles.section}>
      <Button title="Sign out" variant="secondary" onPress={signOut} loading={signingOut} />
      {error ? (
        <Text variant="caption" tone="overdue">
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function DeleteSection({ email, userId }: { email: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === email.toLowerCase() && !!email;

  async function remove() {
    setError(null);
    try {
      await deleteAccount(userId, setStatus);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : 'Couldn’t delete your account. Try again.');
    }
  }

  return (
    <Card style={styles.section}>
      <Text variant="heading">Delete account</Text>
      <Text tone="inkMuted">
        Permanently deletes your account, every property, tenant, payment and note, and all uploaded
        documents. This can&apos;t be undone.
      </Text>
      {open ? (
        <>
          <TextField
            label={`Type ${email} to confirm`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {status ? <Text tone="inkMuted">{status}</Text> : null}
          {error ? (
            <Text variant="caption" tone="overdue">
              {error}
            </Text>
          ) : null}
          <Button title="Delete my account and data" variant="danger" onPress={remove} disabled={!matches} loading={!!status} />
          <Button title="Cancel" variant="link" onPress={() => setOpen(false)} />
        </>
      ) : (
        <Button title="Delete account" variant="link" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  sections: { gap: space.lg },
  section: { gap: space.md },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
