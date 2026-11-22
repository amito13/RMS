import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useSetupDraft } from '@/features/properties/setup-draft';
import { supabase } from '@/lib/supabase';
import { space, useTheme } from '@/theme';

const STEPS = [
  { title: 'Where the property is', body: 'Its name and address.' },
  { title: 'Its rooms and their rent', body: 'For example, three 1BHKs at ₹8,000 each.' },
  { title: 'Check and save', body: 'Rename any unit, like "Flat 201", before saving.' },
];

export default function Welcome() {
  const { hasProgress } = useSetupDraft();
  const { colors } = useTheme();

  return (
    <Screen
      scroll
      hero="street"
      header={{
        overline: 'RMS',
        wordmark: true,
        title: 'Set up your property',
        subtitle: "Tell us what you rent out. You'll add tenants after this.",
      }}>
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View
            key={step.title}
            style={[styles.step, { borderColor: colors.rule }, i === 0 && styles.firstStep]}>
            <Text variant="amount" tone="brand" style={styles.stepNumber}>
              {i + 1}
            </Text>
            <View style={styles.stepText}>
              <Text variant="bodyStrong">{step.title}</Text>
              <Text tone="inkMuted">{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title={hasProgress ? 'Continue setup' : 'Start setup'}
          onPress={() => router.push('/onboarding/location')}
        />
        <Button title="Sign out" variant="link" onPress={() => supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { marginBottom: space.xxl },
  step: {
    flexDirection: 'row',
    gap: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstStep: { borderTopWidth: StyleSheet.hairlineWidth },
  stepNumber: { width: 20 },
  stepText: { flex: 1, gap: 2 },
  actions: { marginTop: 'auto', gap: space.sm },
});
