-- Delete account (PRD AUTH-6): removes the signed-in landlord's sign-in account.
-- Every RMS table references auth.users with ON DELETE CASCADE, so all their
-- properties, tenants, payments, notes and document rows go with it.
--
-- The app deletes the landlord's files from the tenant-documents bucket first
-- (Supabase doesn't allow deleting storage objects from SQL), then calls this.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in again to delete your account.';
  end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
