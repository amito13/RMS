-- RMS core schema: profiles, properties, units, tenants, tenancies, agreements,
-- rent charges, payments, notices, date changes, documents, notes.
-- Every row belongs to one landlord (landlord_id = auth.uid()) and Row Level
-- Security keeps each landlord's data private.
--
-- Money is stored as whole rupees (integer). Dates are calendar dates in the
-- landlord's timezone (profiles.timezone, default Asia/Kolkata).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles: one row per landlord, created automatically on sign-up.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  timezone text not null default 'Asia/Kolkata',
  reminder_time time not null default '09:00',
  remind_due_today boolean not null default true,
  remind_overdue boolean not null default true,
  remind_agreement boolean not null default true,
  remind_move_out boolean not null default true,
  default_notice_period_days smallint not null default 30
    check (default_notice_period_days between 0 and 180),
  onboarding_completed_at timestamptz,
  last_reminder_run_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Landlords who signed up before this migration also get a profile.
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Properties and units
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address_line text not null check (length(trim(address_line)) > 0),
  locality text not null check (length(trim(locality)) > 0),
  city text not null check (length(trim(city)) > 0),
  pincode text check (pincode ~ '^[0-9]{6}$'),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, landlord_id)
);

create index properties_landlord_idx on public.properties (landlord_id);
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create table public.units (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  property_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  unit_type text not null
    check (unit_type in ('single_room', '1rk', '1bhk', '2bhk', '3bhk', '4bhk_plus', 'shop', 'other')),
  type_label text,
  floor text,
  monthly_rent integer not null check (monthly_rent > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name),
  unique (id, landlord_id),
  foreign key (property_id, landlord_id)
    references public.properties (id, landlord_id) on delete cascade,
  check (unit_type <> 'other' or length(trim(coalesce(type_label, ''))) > 0)
);

create index units_landlord_idx on public.units (landlord_id);
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tenants and tenancies
-- ---------------------------------------------------------------------------

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  phone text not null check (phone ~ '^\+91[0-9]{10}$'),
  alt_phone text check (alt_phone ~ '^\+91[0-9]{10}$'),
  member_count smallint not null check (member_count between 1 and 20),
  permanent_address text,
  occupation text,
  emergency_name text,
  emergency_phone text check (emergency_phone ~ '^\+91[0-9]{10}$'),
  aadhaar_last4 text check (aadhaar_last4 ~ '^[0-9]{4}$'),
  household_members jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, landlord_id)
);

create index tenants_landlord_idx on public.tenants (landlord_id);
create trigger tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenant_id uuid not null,
  unit_id uuid not null,
  shift_date date not null,
  move_out_date date,
  status text not null default 'active' check (status in ('active', 'on_notice', 'ended')),
  monthly_rent integer not null check (monthly_rent > 0),
  rent_due_day smallint not null check (rent_due_day between 1 and 31),
  first_due_date date not null,
  advance_agreed integer not null default 0 check (advance_agreed >= 0),
  notice_period_days smallint not null default 30 check (notice_period_days between 0 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, landlord_id),
  foreign key (tenant_id, landlord_id)
    references public.tenants (id, landlord_id) on delete cascade,
  foreign key (unit_id, landlord_id)
    references public.units (id, landlord_id),
  check (move_out_date is null or move_out_date >= shift_date),
  check (status <> 'ended' or move_out_date is not null)
);

-- One current tenancy per unit, and per tenant.
create unique index tenancies_one_current_per_unit
  on public.tenancies (unit_id) where status in ('active', 'on_notice');
create unique index tenancies_one_current_per_tenant
  on public.tenancies (tenant_id) where status in ('active', 'on_notice');
create index tenancies_landlord_idx on public.tenancies (landlord_id);
create trigger tenancies_updated_at before update on public.tenancies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Agreements (one row per agreement period) and rent revisions
-- ---------------------------------------------------------------------------

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenancy_id uuid not null,
  start_date date not null,
  term_months smallint not null check (term_months between 1 and 120),
  end_date date not null,
  -- The renewal date reminders use; equals end_date unless rescheduled.
  reminder_date date not null,
  renewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, landlord_id),
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade,
  check (end_date > start_date),
  check (reminder_date >= end_date)
);

create index agreements_tenancy_idx on public.agreements (tenancy_id);
create index agreements_landlord_idx on public.agreements (landlord_id);
create trigger agreements_updated_at before update on public.agreements
  for each row execute function public.set_updated_at();

create table public.rent_revisions (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenancy_id uuid not null,
  old_rent integer not null check (old_rent > 0),
  new_rent integer not null check (new_rent > 0),
  effective_from date not null,
  created_at timestamptz not null default now(),
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade
);

create index rent_revisions_tenancy_idx on public.rent_revisions (tenancy_id);

-- ---------------------------------------------------------------------------
-- Rent charges (one per tenancy per month) and payments
-- ---------------------------------------------------------------------------

create table public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenancy_id uuid not null,
  period_month date not null check (period_month = date_trunc('month', period_month)::date),
  amount_due integer not null check (amount_due >= 0),
  original_due_date date not null,
  due_date date not null,
  waived_amount integer not null default 0 check (waived_amount >= 0),
  waive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenancy_id, period_month),
  unique (id, tenancy_id),
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade,
  check (due_date >= original_due_date),
  check (waived_amount <= amount_due)
);

create index rent_charges_landlord_due_idx on public.rent_charges (landlord_id, due_date);
create trigger rent_charges_updated_at before update on public.rent_charges
  for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenancy_id uuid not null,
  -- Set for rent payments, null for advance payments.
  rent_charge_id uuid,
  kind text not null check (kind in ('rent', 'advance')),
  amount integer not null check (amount > 0),
  paid_on date not null,
  mode text not null check (mode in ('cash', 'upi', 'bank', 'cheque', 'from_advance', 'other')),
  reference text,
  note text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade,
  foreign key (rent_charge_id, tenancy_id)
    references public.rent_charges (id, tenancy_id) on delete cascade,
  check ((kind = 'rent') = (rent_charge_id is not null)),
  check (mode <> 'from_advance' or kind = 'rent')
);

create index payments_tenancy_idx on public.payments (tenancy_id, paid_on);
create index payments_charge_idx on public.payments (rent_charge_id);
create index payments_landlord_idx on public.payments (landlord_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notice and planned move-out
-- ---------------------------------------------------------------------------

create table public.move_out_notices (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenancy_id uuid not null,
  given_by text not null check (given_by in ('tenant', 'landlord')),
  notice_date date not null,
  planned_move_out_date date not null,
  reason text,
  is_short_notice boolean not null default false,
  short_by_days smallint not null default 0 check (short_by_days >= 0),
  status text not null default 'open' check (status in ('open', 'withdrawn', 'completed')),
  withdrawn_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, landlord_id),
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade,
  check (planned_move_out_date >= notice_date)
);

create unique index move_out_notices_one_open
  on public.move_out_notices (tenancy_id) where status = 'open';
create index move_out_notices_landlord_idx on public.move_out_notices (landlord_id);
create trigger move_out_notices_updated_at before update on public.move_out_notices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- History of moved dates (rent due dates, renewal dates, move-out dates)
-- ---------------------------------------------------------------------------

create table public.date_changes (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rent_charge_id uuid references public.rent_charges (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  notice_id uuid references public.move_out_notices (id) on delete cascade,
  old_date date not null,
  new_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(rent_charge_id, agreement_id, notice_id) = 1)
);

create index date_changes_charge_idx on public.date_changes (rent_charge_id);
create index date_changes_agreement_idx on public.date_changes (agreement_id);
create index date_changes_notice_idx on public.date_changes (notice_id);
create index date_changes_landlord_idx on public.date_changes (landlord_id);

-- ---------------------------------------------------------------------------
-- Documents (files live in the private "tenant-documents" storage bucket)
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenant_id uuid not null,
  doc_type text not null check (doc_type in (
    'aadhaar_front', 'aadhaar_back', 'aadhaar_pdf', 'pan', 'rental_agreement',
    'police_verification', 'photo', 'other'
  )),
  label text,
  -- {landlord_id}/{tenant_id}/{document_id}.{ext}
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  upload_status text not null default 'pending' check (upload_status in ('pending', 'uploaded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, landlord_id)
    references public.tenants (id, landlord_id) on delete cascade,
  check (doc_type <> 'other' or length(trim(coalesce(label, ''))) > 0),
  check (split_part(storage_path, '/', 1) = landlord_id::text)
);

create index documents_tenant_idx on public.documents (tenant_id);
create index documents_landlord_idx on public.documents (landlord_id);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notes timeline
-- ---------------------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tenant_id uuid not null,
  tenancy_id uuid,
  kind text not null default 'general' check (kind in (
    'general', 'payment_promise', 'renewal', 'complaint',
    'reschedule', 'rent_change', 'waiver', 'notice', 'move_out'
  )),
  body text not null check (length(trim(body)) > 0),
  pinned boolean not null default false,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, landlord_id)
    references public.tenants (id, landlord_id) on delete cascade,
  foreign key (tenancy_id, landlord_id)
    references public.tenancies (id, landlord_id) on delete cascade
);

create index notes_tenant_idx on public.notes (tenant_id, created_at desc);
create index notes_landlord_idx on public.notes (landlord_id);
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: a landlord sees and changes only their own rows.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Landlords read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Landlords update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'properties', 'units', 'tenants', 'tenancies', 'agreements', 'rent_revisions',
    'rent_charges', 'payments', 'move_out_notices', 'date_changes', 'documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Landlords manage their own %1$s" on public.%1$I
         for all to authenticated
         using (landlord_id = (select auth.uid()))
         with check (landlord_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Notes written by the app (is_system) can be deleted but not edited.
alter table public.notes enable row level security;

create policy "Landlords read their own notes" on public.notes
  for select to authenticated using (landlord_id = (select auth.uid()));
create policy "Landlords add notes" on public.notes
  for insert to authenticated with check (landlord_id = (select auth.uid()));
create policy "Landlords edit their own non-system notes" on public.notes
  for update to authenticated
  using (landlord_id = (select auth.uid()) and not is_system)
  with check (landlord_id = (select auth.uid()) and not is_system);
create policy "Landlords delete their own notes" on public.notes
  for delete to authenticated using (landlord_id = (select auth.uid()));
