-- Private bucket for tenant documents (Aadhaar, PAN, agreements, photos).
-- Files are stored at {landlord_id}/{tenant_id}/{document_id}.{ext} and a
-- landlord can only read or write files under their own folder.
-- The app shows files through short-lived signed URLs; nothing is public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-documents',
  'tenant-documents',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Landlords read their own tenant documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Landlords upload their own tenant documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Landlords replace their own tenant documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Landlords delete their own tenant documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
