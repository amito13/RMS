import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useSetupDraft } from '@/features/properties/setup-draft';
import type { NewProperty } from '@/lib/db-types';
import { space } from '@/theme';

type Errors = Partial<Record<keyof NewProperty, string>>;

function validate(p: NewProperty): Errors {
  const errors: Errors = {};
  if (!p.name.trim()) errors.name = 'Enter a name for the property.';
  if (!p.address_line.trim()) errors.address_line = 'Enter the house or plot number and street.';
  if (!p.locality.trim()) errors.locality = 'Enter the area or locality.';
  if (!p.city.trim()) errors.city = 'Enter the city.';
  if (p.pincode && !/^\d{6}$/.test(p.pincode)) errors.pincode = 'A PIN code has 6 digits.';
  return errors;
}

export default function Location() {
  const { draft, update } = useSetupDraft();
  const [errors, setErrors] = useState<Errors>({});
  const property = draft.property;

  function set<K extends keyof NewProperty>(key: K, value: NewProperty[K]) {
    update({ property: { ...property, [key]: value } });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  }

  function handleNext() {
    const found = validate(property);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    router.push('/onboarding/units');
  }

  return (
    <Screen
      scroll
      header={{
        onBack: () => (router.canGoBack() ? router.back() : router.replace('/onboarding')),
        overline: 'Step 1 of 3',
        title: 'Where is the property?',
      }}>
      <View style={styles.form}>
        <TextField
          label="Property name"
          value={property.name}
          onChangeText={(v) => set('name', v)}
          placeholder="Shanti Niwas"
          hint="The name you use for the building or house"
          error={errors.name}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          label="Address"
          value={property.address_line}
          onChangeText={(v) => set('address_line', v)}
          placeholder="12, MG Road"
          error={errors.address_line}
          autoCapitalize="words"
          autoComplete="street-address"
          returnKeyType="next"
        />
        <TextField
          label="Area or locality"
          value={property.locality}
          onChangeText={(v) => set('locality', v)}
          placeholder="Shankar Nagar"
          error={errors.locality}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={styles.row}>
          <View style={styles.city}>
            <TextField
              label="City"
              value={property.city}
              onChangeText={(v) => set('city', v)}
              placeholder="Raipur"
              error={errors.city}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={styles.pin}>
            <TextField
              label="PIN code"
              value={property.pincode ?? ''}
              onChangeText={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))}
              placeholder="492001"
              hint="Optional"
              error={errors.pincode}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="postal-code"
            />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Next: rooms and rent" onPress={handleNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  city: { flex: 3 },
  pin: { flex: 2 },
  actions: { marginTop: space.xxl },
});
