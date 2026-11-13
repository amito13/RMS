import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, space, touchTarget, typography, useTheme } from '@/theme';

import { Text } from './text';

type Props = TextInputProps & {
  label: string;
  /** Shown under the field in red. */
  error?: string;
  /** Shown under the field when there's no error. */
  hint?: string;
  /** Fixed text before the input, e.g. "₹". */
  prefix?: string;
};

export function TextField({ label, error, hint, prefix, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.overdue : focused ? colors.brand : colors.rule;
  const thick = focused || !!error;

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: thick ? 2 : 1,
            // Keep text from shifting when the border thickens.
            paddingHorizontal: thick ? space.md + 1 : space.md + 2,
          },
        ]}>
        {prefix ? (
          <Text variant="bodyStrong" tone="inkMuted" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.brand}
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
          style={[typography.body, styles.input, { color: colors.ink }, style]}
          {...props}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="overdue">
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
  box: {
    minHeight: touchTarget + 4,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: { marginRight: space.xs },
  input: { flex: 1, paddingVertical: space.sm },
});
