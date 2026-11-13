import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import type { DocType, DocumentRow } from '@/lib/db-types';
import { formatDate } from '@/lib/format';
import { space, useTheme } from '@/theme';

import { DocSlot } from './doc-slot';
import {
  canRetry,
  DOC_TYPES,
  deleteDocument,
  docTypeLabel,
  openPdf,
  retryUpload,
  signedUrl,
  uploadDocument,
  type PickedFile,
} from './documents';
import { documentsKey, tenancyKeys, useDocuments } from './queries';

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Documents on the tenant screen: list, open, retry, delete, add (PRD 7.4). */
export function DocumentsSection({ tenantId }: { tenantId: string }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const docs = useDocuments(tenantId);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: documentsKey(tenantId) }),
      queryClient.invalidateQueries({ queryKey: tenancyKeys.all }),
    ]);

  async function open(doc: DocumentRow) {
    setError(null);
    setBusyId(doc.id);
    try {
      if (doc.mime_type === 'application/pdf') {
        await openPdf(doc);
      } else {
        const url = await signedUrl(doc);
        router.push({ pathname: '/document-viewer', params: { url, title: docTypeLabel(doc) } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t open this document.');
    } finally {
      setBusyId(null);
    }
  }

  async function retry(doc: DocumentRow) {
    setBusyId(doc.id);
    const ok = await retryUpload(doc);
    setBusyId(null);
    if (!ok) setError('The upload failed again. Check your internet connection and try again.');
    await refresh();
  }

  function remove(doc: DocumentRow) {
    Alert.alert(`Delete ${docTypeLabel(doc)}?`, 'The file is removed from your account. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(doc.id);
          try {
            await deleteDocument(doc);
            await refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Couldn’t delete the document.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">Documents</Text>
      {docs.data?.length === 0 && !adding ? (
        <Text tone="inkMuted">No documents yet. Add the tenant&apos;s Aadhaar for verification.</Text>
      ) : null}

      {docs.data?.map((doc, i) => {
        const failed = doc.upload_status !== 'uploaded';
        return (
          <View key={doc.id} style={[styles.row, { borderColor: colors.rule }, i === 0 && styles.firstRow]}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint={failed ? undefined : 'Opens the document'}
              disabled={failed || busyId === doc.id}
              onPress={() => open(doc)}
              style={styles.rowMain}>
              <Text variant="bodyStrong" tone={failed ? 'inkMuted' : 'brand'}>
                {docTypeLabel(doc)}
              </Text>
              <Text variant="caption" tone={failed ? 'overdue' : 'inkMuted'}>
                {failed
                  ? 'Upload failed'
                  : `${doc.mime_type === 'application/pdf' ? 'PDF' : 'Photo'}, ${sizeLabel(doc.size_bytes)}, added ${formatDate(new Date(doc.created_at))}`}
                {busyId === doc.id ? ', working…' : ''}
              </Text>
            </Pressable>
            {failed && canRetry(doc.id) ? (
              <Button title="Try again" variant="link" onPress={() => retry(doc)} />
            ) : null}
            <Button title="Delete" variant="link" onPress={() => remove(doc)} />
          </View>
        );
      })}

      {error ? (
        <Text variant="caption" tone="overdue">
          {error}
        </Text>
      ) : null}

      {adding ? (
        <AddDocument
          tenantId={tenantId}
          onDone={async () => {
            setAdding(false);
            await refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button title="Add document" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

function AddDocument({
  tenantId,
  onDone,
  onCancel,
}: {
  tenantId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<DocType | null>(null);
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<PickedFile | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!type || !file) return;
    if (type === 'other' && !label.trim()) {
      setError('Name this document, like "Voter ID".');
      return;
    }
    setSaving(true);
    try {
      const result = await uploadDocument({
        tenantId,
        docType: type,
        label: type === 'other' ? label.trim() : undefined,
        file,
      });
      if (!result.ok) setError('Saved, but the upload failed. Use "Try again" in the list.');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t add the document.');
    } finally {
      setSaving(false);
    }
  }

  const isPdfType = type === 'aadhaar_pdf' || type === 'rental_agreement' || type === 'police_verification';

  return (
    <View style={styles.add}>
      <ChoiceChips label="What is it?" options={DOC_TYPES} value={type} onChange={setType} wrap />
      {type === 'other' ? (
        <TextField label="Document name" value={label} onChangeText={setLabel} placeholder="Voter ID" />
      ) : null}
      {type ? (
        <DocSlot
          title={docTypeLabel({ doc_type: type, label })}
          file={file}
          onChange={setFile}
          sources={isPdfType ? ['files', 'camera'] : ['camera', 'library', 'files']}
        />
      ) : null}
      {error ? (
        <Text variant="caption" tone="overdue">
          {error}
        </Text>
      ) : null}
      <View style={styles.addActions}>
        <View style={styles.flex}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
        </View>
        <View style={styles.flex}>
          <Button title="Save document" onPress={save} loading={saving} disabled={!type || !file} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  add: { gap: space.md, marginTop: space.sm },
  addActions: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
