import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  newGroup,
  useSetupDraft,
  type UnitGroup,
} from '@/features/properties/setup-draft';
import { UNIT_TYPES, unitTypeLabel } from '@/features/properties/unit-types';
import { formatINR } from '@/lib/format';
import { space, useTheme } from '@/theme';

const MAX_PER_GROUP = 50;
const MAX_UNITS = 200;

type GroupErrors = { type?: string; label?: string; rent?: string };

function validateGroup(g: UnitGroup): GroupErrors {
  const e: GroupErrors = {};
  if (!g.unit_type) e.type = 'Pick a type.';
  if (g.unit_type === 'other' && !g.type_label.trim()) e.label = 'Name this type, like "Godown".';
  if (!g.rent || Number(g.rent) <= 0) e.rent = 'Enter the monthly rent.';
  return e;
}

export default function Units() {
  const { draft, update } = useSetupDraft();
  const { colors } = useTheme();
  const [errors, setErrors] = useState<Record<string, GroupErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const groups = draft.groups;

  const totalUnits = groups.reduce((n, g) => n + (g.unit_type ? g.count : 0), 0);
  const totalRent = groups.reduce(
    (sum, g) => sum + (g.unit_type ? g.count * (Number(g.rent) || 0) : 0),
    0
  );

  function setGroup(key: string, patch: Partial<UnitGroup>) {
    update({ groups: groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) });
    if (errors[key]) {
      const cleared = { ...errors[key] };
      if ('unit_type' in patch) delete cleared.type;
      if ('type_label' in patch) delete cleared.label;
      if ('rent' in patch) delete cleared.rent;
      setErrors({ ...errors, [key]: cleared });
    }
    setFormError(null);
  }

  function handleNext() {
    const found = Object.fromEntries(groups.map((g) => [g.key, validateGroup(g)]));
    setErrors(found);
    if (Object.values(found).some((e) => Object.keys(e).length > 0)) return;
    if (totalUnits > MAX_UNITS) {
      setFormError(`That's ${totalUnits} units. One property can have up to ${MAX_UNITS}.`);
      return;
    }
    router.push('/onboarding/review');
  }

  return (
    <Screen
      scroll
      header={{
        onBack: () => router.back(),
        overline: 'Step 2 of 3',
        title: 'What do you rent out?',
        subtitle: `Add each kind of room or flat in ${draft.property.name || 'the property'}, how many there are, and the monthly rent.`,
      }}>
      {groups.map((g, index) => {
        const e = errors[g.key] ?? {};
        const typeName = g.unit_type ? unitTypeLabel(g.unit_type, g.type_label) : 'units';
        return (
          <View
            key={g.key}
            style={[styles.group, { borderColor: colors.rule }, index === 0 && styles.firstGroup]}>
            <View style={styles.groupHeader}>
              <Text variant="label">Type</Text>
              {groups.length > 1 ? (
                <Button
                  title="Remove"
                  variant="link"
                  onPress={() => update({ groups: groups.filter((x) => x.key !== g.key) })}
                />
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              accessibilityRole="radiogroup">
              {UNIT_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={g.unit_type === t.value}
                  onPress={() => setGroup(g.key, { unit_type: t.value })}
                />
              ))}
            </ScrollView>
            {e.type ? (
              <Text variant="caption" tone="overdue">
                {e.type}
              </Text>
            ) : null}

            {g.unit_type === 'other' ? (
              <TextField
                label="What do you call it?"
                value={g.type_label}
                onChangeText={(v) => setGroup(g.key, { type_label: v })}
                placeholder="Godown"
                error={e.label}
                autoCapitalize="words"
              />
            ) : null}

            <View style={styles.countRow}>
              <View style={styles.countLabel}>
                <Text variant="label">How many</Text>
              </View>
              <Stepper
                label={typeName}
                value={g.count}
                min={1}
                max={MAX_PER_GROUP}
                onChange={(count) => setGroup(g.key, { count })}
              />
            </View>

            <TextField
              label={`Monthly rent for each ${g.unit_type ? typeName : 'unit'}`}
              prefix="₹"
              value={g.rent}
              onChangeText={(v) => setGroup(g.key, { rent: v.replace(/\D/g, '').slice(0, 7) })}
              placeholder="8000"
              keyboardType="number-pad"
              error={e.rent}
            />
          </View>
        );
      })}

      <Button
        title="Add another type"
        variant="secondary"
        onPress={() => update({ groups: [...groups, newGroup()] })}
      />

      <View style={styles.summary}>
        <Text variant="heading">
          {totalUnits} {totalUnits === 1 ? 'unit' : 'units'}
        </Text>
        <Text tone="inkMuted">
          {totalRent > 0
            ? `${formatINR(totalRent)} a month if all are rented`
            : 'Pick a type and rent to see the monthly total'}
        </Text>
        {formError ? (
          <Text variant="caption" tone="overdue">
            {formError}
          </Text>
        ) : null}
      </View>

      <Button title="Next: review" onPress={handleNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.md,
    paddingBottom: space.xl,
    marginBottom: space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstGroup: {},
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { gap: space.sm, paddingRight: space.lg },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countLabel: { flex: 1 },
  summary: { marginTop: space.xl, marginBottom: space.lg, gap: 2 },
});
