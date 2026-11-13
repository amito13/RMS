import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import type { NoteKind } from '@/lib/db-types';
import { formatDate } from '@/lib/format';
import { space, useTheme } from '@/theme';

import { useAddNote, useDeleteNote, useNotes } from './queries';

const KINDS: { value: NoteKind; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'payment_promise', label: 'Payment promise' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'complaint', label: 'Complaint or repair' },
];

const KIND_LABEL: Record<NoteKind, string> = {
  general: 'Note',
  payment_promise: 'Payment promise',
  renewal: 'Renewal',
  complaint: 'Complaint or repair',
  reschedule: 'Date moved',
  rent_change: 'Rent change',
  waiver: 'Rent waived',
  notice: 'Notice',
  move_out: 'Move-out',
};

/** Timeline of notes about a tenant, newest first (PRD 7.9). */
export function NotesSection({ tenantId, tenancyId }: { tenantId: string; tenancyId: string }) {
  const { colors } = useTheme();
  const notes = useNotes(tenantId);
  const addNote = useAddNote(tenantId, tenancyId);
  const deleteNote = useDeleteNote(tenantId);
  const [kind, setKind] = useState<NoteKind>('general');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!body.trim()) return;
    setError(null);
    try {
      await addNote.mutateAsync({ kind, body: body.trim() });
      setBody('');
      setKind('general');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the note.');
    }
  }

  function remove(id: string) {
    Alert.alert('Delete this note?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote.mutate(id) },
    ]);
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">Notes</Text>
      <TextField
        label="Add a note"
        value={body}
        onChangeText={setBody}
        placeholder="Said he'll pay on the 11th"
        multiline
      />
      <ChoiceChips options={KINDS} value={kind} onChange={setKind} />
      {error ? (
        <Text variant="caption" tone="overdue">
          {error}
        </Text>
      ) : null}
      <Button title="Save note" variant="secondary" onPress={add} loading={addNote.isPending} disabled={!body.trim()} />

      {notes.data?.map((n, i) => (
        <View key={n.id} style={[styles.note, { borderColor: colors.rule }, i === 0 && styles.firstNote]}>
          <View style={styles.noteHead}>
            <Text variant="caption" tone={n.is_system ? 'brand' : 'inkMuted'}>
              {KIND_LABEL[n.kind]}, {formatDate(new Date(n.created_at))}
            </Text>
            <Button title="Delete" variant="link" onPress={() => remove(n.id)} />
          </View>
          <Text>{n.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  note: { paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  firstNote: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
