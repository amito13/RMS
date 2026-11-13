-- Daily job: create upcoming rent charges for every tenancy.
-- Runs at 00:05 IST (18:35 UTC; pg_cron on Supabase uses UTC).
--
-- If this fails with "extension pg_cron is not available", enable pg_cron in
-- the Supabase dashboard (Database → Extensions) and run this file again.
-- As a backup, the app also calls generate_rent_charges() when it opens
-- (RLS limits that call to the signed-in landlord's own tenancies).

create extension if not exists pg_cron;

select cron.schedule(
  'generate-rent-charges',
  '35 18 * * *',
  $$ select public.generate_rent_charges(); $$
);
