import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import type { DocType, DocumentRow } from '@/lib/db-types';
import { supabase } from '@/lib/supabase';

export const BUCKET = 'tenant-documents';
export const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 2000;

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'aadhaar_front', label: 'Aadhaar (front)' },
  { value: 'aadhaar_back', label: 'Aadhaar (back)' },
  { value: 'aadhaar_pdf', label: 'Aadhaar (PDF)' },
  { value: 'pan', label: 'PAN card' },
  { value: 'rental_agreement', label: 'Rental agreement' },
  { value: 'police_verification', label: 'Police verification' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export function docTypeLabel(doc: { doc_type: DocType; label?: string | null }): string {
  if (doc.doc_type === 'other' && doc.label) return doc.label;
  return DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? 'Document';
}

/** A file picked on the phone, ready to upload. */
export type PickedFile = {
  uri: string;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  size: number;
  name: string;
};

export class PickError extends Error {}

/** Shrinks a photo to at most 2000 px on its long edge and saves it as JPEG (also converts HEIC). */
async function prepareImage(uri: string, width: number, height: number): Promise<PickedFile> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  const size = new FsFile(result.uri).size;
  if (size > MAX_BYTES) throw new PickError('This photo is larger than 10 MB, even after shrinking it.');
  return { uri: result.uri, mimeType: 'image/jpeg', size, name: 'photo.jpg' };
}

/** Takes a photo or picks one from the gallery. Returns null if the landlord cancels. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedFile | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PickError(
      source === 'camera'
        ? 'Allow camera access for RMS in your phone settings to photograph documents.'
        : 'Allow photo access for RMS in your phone settings to attach documents.'
    );
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return prepareImage(asset.uri, asset.width, asset.height);
}

/** Picks a PDF (or an image) from the phone's files. Returns null if cancelled. */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (asset.mimeType?.startsWith('image/')) {
    const { width, height } = await ImageManipulator.manipulate(asset.uri).renderAsync();
    return prepareImage(asset.uri, width, height);
  }
  if (asset.mimeType !== 'application/pdf') throw new PickError('Pick a PDF, JPEG or PNG file.');

  const size = asset.size ?? new FsFile(asset.uri).size;
  if (size > MAX_BYTES) throw new PickError('This PDF is larger than 10 MB. Pick a smaller file.');
  return { uri: asset.uri, mimeType: 'application/pdf', size, name: asset.name };
}

// Local copies of uploads that failed, so "Try again" works without re-picking
// (kept while the app is open).
const failedUploads = new Map<string, PickedFile>();

export function canRetry(documentId: string) {
  return failedUploads.has(documentId);
}

async function sendFile(path: string, file: PickedFile) {
  const bytes = await new FsFile(file.uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.mimeType, upsert: true });
  if (error) throw new Error(error.message);
}

/**
 * Records the document, then uploads the file to the private bucket at
 * {landlord_id}/{tenant_id}/{unique}.{ext}. If the upload fails, the row stays
 * as "failed" so the tenant screen can offer to try again.
 */
export async function uploadDocument(input: {
  tenantId: string;
  docType: DocType;
  label?: string;
  file: PickedFile;
}): Promise<{ ok: boolean; documentId: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const landlordId = auth.user?.id;
  if (!landlordId) throw new Error('Sign in again to upload documents.');

  const ext = input.file.mimeType === 'application/pdf' ? 'pdf' : input.file.mimeType === 'image/png' ? 'png' : 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${landlordId}/${input.tenantId}/${unique}.${ext}`;

  const { data: row, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: input.tenantId,
      doc_type: input.docType,
      label: input.label ?? null,
      storage_path: path,
      mime_type: input.file.mimeType,
      size_bytes: input.file.size,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const documentId = (row as { id: string }).id;

  try {
    await sendFile(path, input.file);
    await supabase.from('documents').update({ upload_status: 'uploaded' }).eq('id', documentId);
    return { ok: true, documentId };
  } catch {
    failedUploads.set(documentId, input.file);
    await supabase.from('documents').update({ upload_status: 'failed' }).eq('id', documentId);
    return { ok: false, documentId };
  }
}

export async function retryUpload(doc: DocumentRow): Promise<boolean> {
  const file = failedUploads.get(doc.id);
  if (!file) return false;
  try {
    await sendFile(doc.storage_path, file);
    await supabase.from('documents').update({ upload_status: 'uploaded' }).eq('id', doc.id);
    failedUploads.delete(doc.id);
    return true;
  } catch {
    return false;
  }
}

/** Deletes the file from storage and then its row. */
export async function deleteDocument(doc: DocumentRow) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw new Error(error.message);
  failedUploads.delete(doc.id);
}

/** A link to the file that works for 5 minutes (the bucket is private). */
export async function signedUrl(doc: DocumentRow): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
  if (error || !data) throw new Error(error?.message ?? 'Couldn’t open this document.');
  return data.signedUrl;
}

/** Downloads a PDF to the cache and opens the phone's "Open with" sheet (PDF viewers). */
export async function openPdf(doc: DocumentRow) {
  const url = await signedUrl(doc);
  const target = new FsFile(Paths.cache, `${doc.id}.pdf`);
  if (target.exists) target.delete();
  const file = await FsFile.downloadFileAsync(url, target);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: docTypeLabel(doc),
  });
}
