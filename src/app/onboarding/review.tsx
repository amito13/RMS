import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useCreateProperty } from '@/features/properties/queries';
import { propertySetup } from '@/features/properties/setup-flow';
import {
  generateUnits,
  groupsSignature,
  useSetupDraft,
} from '@/features/properties/setup-draft';
import { formatINR } from '@/lib/format';
import type { NewUnit } from '@/lib/db-types';
import { radius, space, typography, useTheme } from '@/theme';

function findProblem(units: NewUnit[]): string | null {
  const seen = new Set<string>();
  for (const u of units) {
    const name = u.name.trim();
    if (!name) return 'Every unit needs a name.';
    const key = name.toLowerCase();
    if (seen.has(key)) return `Two units are called "${name}". Give each one a different name.`;
    seen.add(key);
    if (!u.monthly_rent || u.monthly_rent <= 0) return `Enter the rent for ${name}.`;
  }
  return null;
}

export default function Review() {
  const { draft, update, reset } = useSetupDraft();
  const { colors } = useTheme();
  const createProperty = useCreateProperty();
  const [error, setError] = useState<string | null>(null);

  // Rebuild the unit list if the rooms step changed since it was made;
  // otherwise keep the landlord's renames and rent edits.
  const signature = groupsSignature(draft.groups);
  const units = draft.unitsFrom === signature ? draft.units : generateUnits(draft.groups);
  const totalRent = units.reduce((sum, u) => sum + (u.monthly_rent || 0), 0);
  const p = draft.property;

  function setUnit(index: number, patch: Partial<NewUnit>) {
    update({
      units: units.map((u, i) => (i === index ? { ...u, ...patch } : u)),
      unitsFrom: signature,
    });
    setError(null);
  }

  async function handleSave() {
    const problem = findProblem(units);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    // Keep the setup screens reachable for the "done" screen once onboarding
    // is marked complete.
    propertySetup.open();
    try {
      await createProperty.mutateAsync({
        property: {
          name: p.name.trim(),
          address_line: p.address_line.trim(),
          locality: p.locality.trim(),
          city: p.city.trim(),
          pincode: p.pincode || undefined,
        },
        units: units.map((u) => ({ ...u, name: u.name.trim() })),
      });
      const name = p.name.trim();
      reset();
      router.replace({ pathname: '/onboarding/done', params: { name, count: String(units.length) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the property. Try again.');
    }
  }

  return (
    <Screen
      scroll
      header={{
        onBack: () => router.back(),
        overline: 'Step 3 of 3',
        title: 'Check your units',
        subtitle: 'Rename any unit, like "Flat 201", or change its rent before saving.',
      }}>
      <View style={[styles.property, { borderColor: colors.rule }]}>
        <View style={styles.propertyText}>
          <Text variant="heading">{p.name}</Text>
          <Text tone="inkMuted">
            {[p.address_line, p.locality, p.city, p.pincode].filter(Boolean).join(', ')}
          </Text>
        </View>
        <Button title="Edit" variant="link" onPress={() => router.navigate('/onboarding/location')} />
      </View>

      <View style={styles.tableHead}>
        <Text variant="caption" tone="inkMuted" style={styles.nameCol}>
          Unit
        </Text>
        <Text variant="caption" tone="inkMuted" align="right" style={styles.rentCol}>
          Monthly rent
        </Text>
      </View>
      {units.map((u, i) => (
        <View key={i} style={[styles.unitRow, { borderColor: colors.rule }]}>
          <TextInput
            value={u.name}
            onChangeText={(v) => setUnit(i, { name: v })}
            accessibilityLabel={`Name of unit ${i + 1}`}
            selectionColor={colors.brand}
            style={[typography.bodyStrong, styles.input, styles.nameCol, inputColors(colors)]}
          />
          <View style={[styles.rentCol, styles.rentBox, inputColors(colors)]}>
            <Text tone="inkMuted">₹</Text>
            <TextInput
              value={u.monthly_rent ? String(u.monthly_rent) : ''}
              onChangeText={(v) =>
                setUnit(i, { monthly_rent: Number(v.replace(/\D/g, '').slice(0, 7)) || 0 })
              }
              keyboardType="number-pad"
              accessibilityLabel={`Monthly rent for ${u.name || `unit ${i + 1}`}`}
              selectionColor={colors.brand}
              style={[typography.amount, styles.rentInput, { color: colors.ink }]}
            />
          </View>
        </View>
      ))}

      <View style={styles.total}>
        <Text variant="bodyStrong">
          {units.length} {units.length === 1 ? 'unit' : 'units'}
        </Text>
        <Text variant="amount">{formatINR(totalRent)}</Text>
      </View>
      <Text variant="caption" tone="inkMuted" align="right">
        a month if all are rented
      </Text>

      {error ? (
        <Text variant="caption" tone="overdue" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button title="Save property" onPress={handleSave} loading={createProperty.isPending} />
      </View>
    </Screen>
  );
}

function inputColors(colors: ReturnType<typeof useTheme>['colors']) {
  return { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.rule };
}

const styles = StyleSheet.create({
  property: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingBottom: space.lg,
    marginBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propertyText: { flex: 1, gap: 2 },
  tableHead: { flexDirection: 'row', gap: space.md, marginBottom: space.xs },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameCol: { flex: 3 },
  rentCol: { flex: 2 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  rentBox: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  rentInput: { flex: 1, textAlign: 'right', paddingVertical: 0 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.lg,
  },
  error: { marginTop: space.lg },
  actions: { marginTop: space.xl },
});
