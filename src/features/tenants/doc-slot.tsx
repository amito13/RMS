import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { radius, space, useTheme } from '@/theme';

import { PickError, pickFile, pickPhoto, type PickedFile } from './documents';

type Props = {
  title: string;
  file: PickedFile | undefined;
  onChange: (file: PickedFile | undefined) => void;
  /** Offer camera and gallery (photos), files (PDF), or both. */
  sources: ('camera' | 'library' | 'files')[];
};

/** One document to attach: shows a preview once picked, with ways to pick or remove. */
export function DocSlot({ title, file, onChange, sources }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library' | 'files') {
    setError(null);
    setBusy(true);
    try {
      const picked = source === 'files' ? await pickFile() : await pickPhoto(source);
      if (picked) onChange(picked);
    } catch (e) {
      setError(e instanceof PickError ? e.message : 'Couldn’t attach this file. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const labels = { camera: 'Take photo', library: 'Gallery', files: 'Choose file' };

  return (
    <View style={[styles.slot, { borderColor: colors.rule }]}>
      <View style={styles.head}>
        <Text variant="bodyStrong">{title}</Text>
        {file ? <Button title="Remove" variant="link" onPress={() => onChange(undefined)} /> : null}
      </View>

      {file ? (
        file.mimeType === 'application/pdf' ? (
          <View style={[styles.pdf, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
            <Text variant="label" tone="brand">
              PDF
            </Text>
            <Text numberOfLines={1} style={styles.pdfName}>
              {file.name}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: file.uri }}
            style={[styles.preview, { borderColor: colors.rule }]}
            contentFit="cover"
            accessibilityLabel={`${title} photo`}
          />
        )
      ) : (
        <View style={styles.buttons}>
          {sources.map((s) => (
            <View key={s} style={styles.button}>
              <Button title={labels[s]} variant="secondary" onPress={() => pick(s)} disabled={busy} />
            </View>
          ))}
        </View>
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
  slot: { gap: space.sm, paddingVertical: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  buttons: { flexDirection: 'row', gap: space.sm },
  button: { flex: 1 },
  preview: { width: '100%', aspectRatio: 1.6, borderRadius: radius.control, borderWidth: 1 },
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  pdfName: { flex: 1 },
});
