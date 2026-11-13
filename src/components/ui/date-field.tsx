import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatDate } from '@/lib/format';
import { radius, space, touchTarget, useTheme } from '@/theme';

import { Text } from './text';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  hint?: string;
  error?: string;
};

/** Looks like a text field; opens the system date picker (dialog on Android, inline calendar on iOS). */
export function DateField({ label, value, onChange, minimumDate, maximumDate, hint, error }: Props) {
  const { colors, scheme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  }

  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        accessibilityHint="Opens a calendar"
        onPress={open}
        style={[
          styles.box,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.overdue : iosOpen ? colors.brand : colors.rule,
            borderWidth: error || iosOpen ? 2 : 1,
          },
        ]}>
        <Text>{formatDate(value, new Date(0)) /* always show the year */}</Text>
        <Text variant="label" tone="brand">
          Change
        </Text>
      </Pressable>
      {iosOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          themeVariant={scheme}
          accentColor={colors.brand}
          onChange={(_event, date) => {
            if (date) onChange(date);
          }}
        />
      ) : null}
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
    paddingHorizontal: space.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
