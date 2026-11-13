import { ScrollView, StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { Chip } from './chip';
import { Text } from './text';

type Props<T extends string> = {
  label?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Wrap onto several lines instead of scrolling sideways. */
  wrap?: boolean;
  error?: string;
};

/** A labelled single-choice row of chips. */
export function ChoiceChips<T extends string>({ label, options, value, onChange, wrap, error }: Props<T>) {
  const chips = options.map((o) => (
    <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
  ));
  return (
    <View style={styles.field}>
      {label ? <Text variant="label">{label}</Text> : null}
      {wrap ? (
        <View style={styles.wrap} accessibilityRole="radiogroup">
          {chips}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          accessibilityRole="radiogroup">
          {chips}
        </ScrollView>
      )}
      {error ? (
        <Text variant="caption" tone="overdue">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs + 2 },
  row: { gap: space.sm, paddingRight: space.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
