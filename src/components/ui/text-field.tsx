import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, touchTarget, typography, useTheme } from '@/theme';

import { Text } from './text';

type Props = TextInputProps & {
  label: string;
  /** Shown under the field in khata red. */
  error?: string;
  /** Shown under the field when there's no error. */
  hint?: string;
};

export function TextField({ label, error, hint, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.khata : focused ? colors.blue : colors.rule;

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.blue}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            // Keep text from shifting when the border thickens.
            paddingHorizontal: focused || error ? space.md + 1 : space.md + 2,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" tone="khata">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="inkMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs + 2 },
  input: {
    minHeight: touchTarget + 4,
    borderRadius: radius.control,
    paddingVertical: space.sm,
  },
});
