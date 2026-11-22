import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { profileKey } from '../profile/use-profile';
import { BUCKET } from '../tenants/documents';

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: { full_name: string | null; default_notice_period_days: number }) => {
      const { error } = await supabase.from('profiles').update(p).eq('id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

/** Checks the current password, then sets a new one. */
export async function changePassword(email: string, current: string, next: string) {
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) throw new Error('Your current password is wrong.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

/** Every file under {landlordId}/ in the documents bucket (one folder per tenant). */
async function listAllFiles(landlordId: string): Promise<string[]> {
  const paths: string[] = [];
  const { data: folders, error } = await supabase.storage.from(BUCKET).list(landlordId, { limit: 1000 });
  if (error) throw new Error(error.message);
  for (const folder of folders ?? []) {
    // Folders come back without an id; files directly under the landlord folder have one.
    if (folder.id) {
      paths.push(`${landlordId}/${folder.name}`);
      continue;
    }
    let offset = 0;
    for (;;) {
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(`${landlordId}/${folder.name}`, { limit: 1000, offset });
      if (listError) throw new Error(listError.message);
      paths.push(...(files ?? []).filter((f) => f.id).map((f) => `${landlordId}/${folder.name}/${f.name}`));
      if (!files || files.length < 1000) break;
      offset += 1000;
    }
  }
  return paths;
}

/**
 * Deletes the landlord's account (PRD AUTH-6): first every stored document
 * file, then the account itself, which removes all their rows.
 */
export async function deleteAccount(landlordId: string, onProgress?: (message: string) => void) {
  onProgress?.('Deleting documents…');
  const paths = await listAllFiles(landlordId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
  onProgress?.('Deleting your account…');
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'local' });
}
