-- RMS actions as Postgres functions, called from the app with supabase.rpc().
-- Each one runs in a single transaction (all-or-nothing) and as the calling
-- user (security invoker), so Row Level Security still applies.
--
-- Errors are raised with plain-English messages the app can show as-is.
-- Custom codes: R0001 = payment is more than the rent owed.

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------

-- "2 Nov" in the given year, "2 Nov 2025" otherwise.
create or replace function public.format_day(p_date date, p_today date default current_date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when extract(year from p_date) = extract(year from p_today) then to_char(p_date, 'FMDD Mon')
    else to_char(p_date, 'FMDD Mon YYYY')
  end;
$$;

create or replace function public.add_system_note(p_tenancy_id uuid, p_kind text, p_body text)
returns void
language sql
set search_path = ''
as $$
  insert into public.notes (landlord_id, tenant_id, tenancy_id, kind, body, is_system)
  select t.landlord_id, t.tenant_id, t.id, p_kind, p_body, true
  from public.tenancies t
  where t.id = p_tenancy_id;
$$;

-- Removes rent charges for months whose normal due date is after a date and
-- that have no payments against them (used when a move-out date is set or
-- brought forward). Uses original_due_date, so a month that was rescheduled
-- past the move-out date is kept: that rent is still owed.
create or replace function public.remove_charges_after(p_tenancy_id uuid, p_after date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer;
begin
  delete from public.rent_charges c
  where c.tenancy_id = p_tenancy_id
    and c.original_due_date > p_after
    and not exists (select 1 from public.payments p where p.rent_charge_id = c.id);
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rent charge generation
-- ---------------------------------------------------------------------------

-- Creates missing monthly rent charges so every charge due within the next
-- p_horizon_days exists. The first month is due on first_due_date; later
-- months on rent_due_day (or the month's last day). Never past a move-out
-- date or a planned move-out date. Safe to run any number of times.
--
-- Run daily for everyone by pg_cron (see the cron migration), and by the app
-- for one tenancy right after it changes.
create or replace function public.generate_rent_charges(
  p_tenancy_id uuid default null,
  p_horizon_days integer default 31
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer;
begin
  insert into public.rent_charges (
    landlord_id, tenancy_id, period_month, amount_due, original_due_date, due_date
  )
  select t.landlord_id, t.id, m.month_start, rent.amount, d.due, d.due
  from public.tenancies t
  cross join lateral (select public.landlord_today(t.landlord_id) as today) td
  left join public.move_out_notices n on n.tenancy_id = t.id and n.status = 'open'
  cross join lateral (
    select least(
      td.today + p_horizon_days,
      coalesce(t.move_out_date, 'infinity'::date),
      coalesce(n.planned_move_out_date, 'infinity'::date)
    ) as cutoff
  ) c
  cross join lateral (
    select gs::date as month_start
    from generate_series(
      date_trunc('month', t.first_due_date),
      date_trunc('month', c.cutoff),
      interval '1 month'
    ) gs
  ) m
  cross join lateral (
    select case
      when m.month_start = date_trunc('month', t.first_due_date)::date then t.first_due_date
      else public.due_date_in_month(m.month_start, t.rent_due_day)
    end as due
  ) d
  -- The rent in force on the due date, allowing for future rent revisions.
  cross join lateral (
    select coalesce(
      (select r.new_rent from public.rent_revisions r
        where r.tenancy_id = t.id and r.effective_from <= d.due
        order by r.effective_from desc, r.created_at desc limit 1),
      (select r.old_rent from public.rent_revisions r
        where r.tenancy_id = t.id and r.effective_from > d.due
        order by r.effective_from asc, r.created_at asc limit 1),
      t.monthly_rent
    ) as amount
  ) rent
  where t.status in ('active', 'on_notice')
    and (p_tenancy_id is null or t.id = p_tenancy_id)
    and d.due >= t.first_due_date
    and d.due <= c.cutoff
  on conflict (tenancy_id, period_month) do nothing;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding: a property and all its units in one go (PRD 7.2)
-- ---------------------------------------------------------------------------

-- p_property: {name, address_line, locality, city, pincode?, notes?}
-- p_units:    [{name, unit_type, type_label?, floor?, monthly_rent}, ...]
create or replace function public.create_property_with_units(p_property jsonb, p_units jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_property_id uuid;
  v_constraint text;
begin
  if p_units is null or jsonb_typeof(p_units) <> 'array' or jsonb_array_length(p_units) = 0 then
    raise exception 'Add at least one unit to the property.';
  end if;

  insert into public.properties (name, address_line, locality, city, pincode, notes)
  values (
    trim(p_property ->> 'name'),
    trim(p_property ->> 'address_line'),
    trim(p_property ->> 'locality'),
    trim(p_property ->> 'city'),
    nullif(trim(coalesce(p_property ->> 'pincode', '')), ''),
    nullif(trim(coalesce(p_property ->> 'notes', '')), '')
  )
  returning id into v_property_id;

  insert into public.units (property_id, name, unit_type, type_label, floor, monthly_rent)
  select
    v_property_id,
    trim(u ->> 'name'),
    u ->> 'unit_type',
    nullif(trim(coalesce(u ->> 'type_label', '')), ''),
    nullif(trim(coalesce(u ->> 'floor', '')), ''),
    (u ->> 'monthly_rent')::integer
  from jsonb_array_elements(p_units) u;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = auth.uid();

  return v_property_id;
exception
  when unique_violation then
    raise exception 'Each unit in a property needs a different name.';
  when not_null_violation or check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    raise exception 'Check the property and unit details. Name, address, area and city are required, and every unit needs a type and a rent above ₹0. (%)',
      coalesce(v_constraint, 'missing value');
end;
$$;

-- ---------------------------------------------------------------------------
-- Add tenant: tenant + tenancy + agreement + advance + first charges (TEN-2)
-- ---------------------------------------------------------------------------

-- p_tenant:    {full_name, phone, alt_phone?, member_count, permanent_address?,
--               occupation?, emergency_name?, emergency_phone?, aadhaar_last4?}
-- p_tenancy:   {unit_id, shift_date, monthly_rent?, rent_due_day?, first_due_date?,
--               advance_agreed?, notice_period_days?}
-- p_agreement: {start_date?, term_months?, end_date?}
-- p_advance:   {amount, paid_on?, mode?, reference?}  (advance received now)
create or replace function public.create_tenant(
  p_tenant jsonb,
  p_tenancy jsonb,
  p_agreement jsonb default '{}'::jsonb,
  p_advance jsonb default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_unit public.units;
  v_tenant_id uuid;
  v_tenancy_id uuid;
  v_shift date := (p_tenancy ->> 'shift_date')::date;
  v_today date := public.landlord_today();
  v_start date;
  v_term integer;
  v_end date;
  v_advance integer := coalesce((p_advance ->> 'amount')::integer, 0);
  v_constraint text;
begin
  if v_shift is null then
    raise exception 'Enter the date the tenant moves in.';
  end if;

  select * into v_unit
  from public.units
  where id = (p_tenancy ->> 'unit_id')::uuid and archived_at is null;
  if not found then
    raise exception 'That unit wasn''t found. Pick a unit from your properties.';
  end if;

  if exists (
    select 1 from public.tenancies
    where unit_id = v_unit.id and status in ('active', 'on_notice')
  ) then
    raise exception 'This unit already has a tenant.';
  end if;

  insert into public.tenants (
    full_name, phone, alt_phone, member_count, permanent_address, occupation,
    emergency_name, emergency_phone, aadhaar_last4
  )
  values (
    trim(p_tenant ->> 'full_name'),
    p_tenant ->> 'phone',
    nullif(p_tenant ->> 'alt_phone', ''),
    (p_tenant ->> 'member_count')::smallint,
    nullif(trim(coalesce(p_tenant ->> 'permanent_address', '')), ''),
    nullif(trim(coalesce(p_tenant ->> 'occupation', '')), ''),
    nullif(trim(coalesce(p_tenant ->> 'emergency_name', '')), ''),
    nullif(p_tenant ->> 'emergency_phone', ''),
    nullif(p_tenant ->> 'aadhaar_last4', '')
  )
  returning id into v_tenant_id;

  insert into public.tenancies (
    tenant_id, unit_id, shift_date, monthly_rent, rent_due_day, first_due_date,
    advance_agreed, notice_period_days
  )
  values (
    v_tenant_id,
    v_unit.id,
    v_shift,
    coalesce((p_tenancy ->> 'monthly_rent')::integer, v_unit.monthly_rent),
    coalesce((p_tenancy ->> 'rent_due_day')::smallint, extract(day from v_shift)::smallint),
    coalesce((p_tenancy ->> 'first_due_date')::date, v_shift),
    coalesce((p_tenancy ->> 'advance_agreed')::integer, 0),
    coalesce(
      (p_tenancy ->> 'notice_period_days')::smallint,
      (select default_notice_period_days from public.profiles where id = auth.uid()),
      30
    )
  )
  returning id into v_tenancy_id;

  v_start := coalesce((p_agreement ->> 'start_date')::date, v_shift);
  v_term := coalesce((p_agreement ->> 'term_months')::integer, 11);
  v_end := coalesce((p_agreement ->> 'end_date')::date, (v_start + make_interval(months => v_term))::date);

  insert into public.agreements (tenancy_id, start_date, term_months, end_date, reminder_date)
  values (v_tenancy_id, v_start, v_term, v_end, v_end);

  if v_advance > 0 then
    insert into public.payments (tenancy_id, kind, amount, paid_on, mode, reference)
    values (
      v_tenancy_id,
      'advance',
      v_advance,
      least(coalesce((p_advance ->> 'paid_on')::date, v_today), v_today),
      coalesce(p_advance ->> 'mode', 'cash'),
      nullif(p_advance ->> 'reference', '')
    );
  end if;

  perform public.generate_rent_charges(v_tenancy_id);

  return jsonb_build_object('tenant_id', v_tenant_id, 'tenancy_id', v_tenancy_id);
exception
  when unique_violation then
    raise exception 'This unit already has a tenant.';
  when not_null_violation or check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    raise exception 'Check the tenant details. Name, a 10-digit phone number (+91), members (1 to 20), rent and dates are required. (%)',
      coalesce(v_constraint, 'missing value');
end;
$$;

-- ---------------------------------------------------------------------------
-- Record a rent payment (RENT-1 to RENT-3, ADV-3)
-- ---------------------------------------------------------------------------

-- Applies the amount to the oldest unpaid month first (or only to
-- p_rent_charge_id if given). If it's more than what's owed:
--   p_excess_to_advance = true  → the extra is kept as advance
--   otherwise                   → error R0001, so the app can ask the landlord.
-- p_mode = 'from_advance' pays from the tenant's advance balance.
create or replace function public.record_payment(
  p_tenancy_id uuid,
  p_amount integer,
  p_paid_on date default null,
  p_mode text default 'cash',
  p_reference text default null,
  p_note text default null,
  p_rent_charge_id uuid default null,
  p_excess_to_advance boolean default false
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  v_today date;
  v_paid_on date;
  v_left integer := p_amount;
  v_apply integer;
  v_balance integer;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_to_advance integer := 0;
  r record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount more than ₹0.';
  end if;

  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  if not found then
    raise exception 'That tenant wasn''t found.';
  end if;

  v_today := public.landlord_today(v_tenancy.landlord_id);
  v_paid_on := coalesce(p_paid_on, v_today);
  if v_paid_on > v_today then
    raise exception 'The payment date can''t be in the future.';
  end if;

  if p_mode = 'from_advance' then
    select
      coalesce(sum(amount) filter (where kind = 'advance'), 0)
      - coalesce(sum(amount) filter (where mode = 'from_advance'), 0)
    into v_balance
    from public.payments
    where tenancy_id = p_tenancy_id and voided_at is null;

    if p_amount > v_balance then
      raise exception 'Only ₹% is left in this tenant''s advance.', v_balance;
    end if;
  end if;

  for r in
    select b.rent_charge_id, b.outstanding
    from public.rent_charge_balances b
    where b.tenancy_id = p_tenancy_id
      and b.outstanding > 0
      and (p_rent_charge_id is null or b.rent_charge_id = p_rent_charge_id)
    order by b.period_month
  loop
    exit when v_left = 0;
    v_apply := least(v_left, r.outstanding);

    insert into public.payments (
      landlord_id, tenancy_id, rent_charge_id, kind, amount, paid_on, mode, reference, note
    )
    values (
      v_tenancy.landlord_id, p_tenancy_id, r.rent_charge_id, 'rent', v_apply, v_paid_on,
      p_mode, nullif(p_reference, ''), nullif(p_note, '')
    )
    returning id into v_id;

    v_ids := v_ids || v_id;
    v_left := v_left - v_apply;
  end loop;

  if v_left > 0 then
    if p_mode = 'from_advance' then
      raise exception 'Only ₹% of rent is unpaid, so less advance is needed.', p_amount - v_left;
    elsif p_excess_to_advance then
      insert into public.payments (landlord_id, tenancy_id, kind, amount, paid_on, mode, reference, note)
      values (
        v_tenancy.landlord_id, p_tenancy_id, 'advance', v_left, v_paid_on, p_mode,
        nullif(p_reference, ''), coalesce(nullif(p_note, ''), 'Extra rent kept as advance')
      )
      returning id into v_id;
      v_ids := v_ids || v_id;
      v_to_advance := v_left;
    else
      raise exception using
        errcode = 'R0001',
        message = format('This is ₹%s more than the rent owed. Keep the extra as advance, or reduce the amount.', v_left),
        detail = v_left::text;
    end if;
  end if;

  return jsonb_build_object(
    'payment_ids', to_jsonb(v_ids),
    'applied_to_rent', p_amount - v_left,
    'kept_as_advance', v_to_advance
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reschedule and waive a month's rent (PRD 7.7, RENT-6)
-- ---------------------------------------------------------------------------

create or replace function public.reschedule_rent_charge(
  p_rent_charge_id uuid,
  p_new_date date,
  p_reason text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  b public.rent_charge_balances;
begin
  select * into b from public.rent_charge_balances where rent_charge_id = p_rent_charge_id;
  if not found then
    raise exception 'That month''s rent wasn''t found.';
  end if;
  if b.outstanding = 0 then
    raise exception 'This month is already paid.';
  end if;
  if p_new_date is null or p_new_date <= b.due_date then
    raise exception 'Pick a date after the current due date (%).', public.format_day(b.due_date, b.as_of);
  end if;
  if p_new_date < b.as_of then
    raise exception 'Pick today or a later date.';
  end if;

  insert into public.date_changes (landlord_id, rent_charge_id, old_date, new_date, reason)
  values (b.landlord_id, b.rent_charge_id, b.due_date, p_new_date, nullif(trim(coalesce(p_reason, '')), ''));

  update public.rent_charges set due_date = p_new_date where id = p_rent_charge_id;

  perform public.add_system_note(
    b.tenancy_id,
    'reschedule',
    format(
      '%s rent moved from %s to %s%s',
      to_char(b.period_month, 'FMMonth'),
      public.format_day(b.due_date, b.as_of),
      public.format_day(p_new_date, b.as_of),
      coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), '.')
    )
  );
end;
$$;

create or replace function public.waive_rent_charge(p_rent_charge_id uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  b public.rent_charge_balances;
begin
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Add a reason for waiving the rent.';
  end if;

  select * into b from public.rent_charge_balances where rent_charge_id = p_rent_charge_id;
  if not found then
    raise exception 'That month''s rent wasn''t found.';
  end if;
  if b.outstanding = 0 then
    raise exception 'Nothing is left to waive for this month.';
  end if;

  update public.rent_charges
  set waived_amount = waived_amount + b.outstanding, waive_reason = trim(p_reason)
  where id = p_rent_charge_id;

  perform public.add_system_note(
    b.tenancy_id,
    'waiver',
    format('₹%s of %s rent waived: %s', b.outstanding, to_char(b.period_month, 'FMMonth'), trim(p_reason))
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Agreement renewal (PRD 7.8)
-- ---------------------------------------------------------------------------

create or replace function public.reschedule_agreement(
  p_agreement_id uuid,
  p_new_date date,
  p_reason text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  a public.agreements;
  v_today date;
begin
  select * into a from public.agreements where id = p_agreement_id;
  if not found then
    raise exception 'That agreement wasn''t found.';
  end if;
  if a.renewed_at is not null then
    raise exception 'This agreement has already been renewed.';
  end if;

  v_today := public.landlord_today(a.landlord_id);
  if p_new_date is null or p_new_date <= a.reminder_date or p_new_date < v_today then
    raise exception 'Pick a date after % and no earlier than today.', public.format_day(a.reminder_date, v_today);
  end if;

  insert into public.date_changes (landlord_id, agreement_id, old_date, new_date, reason)
  values (a.landlord_id, a.id, a.reminder_date, p_new_date, nullif(trim(coalesce(p_reason, '')), ''));

  update public.agreements set reminder_date = p_new_date where id = a.id;

  perform public.add_system_note(
    a.tenancy_id,
    'renewal',
    format(
      'Agreement renewal moved from %s to %s%s',
      public.format_day(a.reminder_date, v_today),
      public.format_day(p_new_date, v_today),
      coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), '.')
    )
  );
end;
$$;

-- Renews the current agreement. Optionally changes the rent from a date:
-- unpaid charges due on or after that date get the new rent.
create or replace function public.renew_agreement(
  p_tenancy_id uuid,
  p_start_date date default null,
  p_term_months integer default null,
  p_new_rent integer default null,
  p_rent_effective_from date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  a public.agreements;
  v_today date;
  v_start date;
  v_term integer;
  v_end date;
  v_effective date;
  v_new_id uuid;
begin
  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  if not found then
    raise exception 'That tenant wasn''t found.';
  end if;
  if v_tenancy.status <> 'active' then
    raise exception 'Only a current tenant who isn''t leaving can renew.';
  end if;

  select * into a
  from public.agreements
  where tenancy_id = p_tenancy_id
  order by start_date desc, created_at desc
  limit 1;

  v_today := public.landlord_today(v_tenancy.landlord_id);
  v_start := coalesce(p_start_date, a.end_date, v_today);
  v_term := coalesce(p_term_months, a.term_months, 11);
  v_end := (v_start + make_interval(months => v_term))::date;

  if a.id is not null then
    update public.agreements set renewed_at = now() where id = a.id;
  end if;

  insert into public.agreements (tenancy_id, start_date, term_months, end_date, reminder_date)
  values (p_tenancy_id, v_start, v_term, v_end, v_end)
  returning id into v_new_id;

  perform public.add_system_note(
    p_tenancy_id,
    'renewal',
    format('Agreement renewed for %s months, from %s to %s.',
      v_term, public.format_day(v_start, v_today), public.format_day(v_end, v_today))
  );

  if p_new_rent is not null and p_new_rent <> v_tenancy.monthly_rent then
    if p_new_rent <= 0 then
      raise exception 'Enter a rent above ₹0.';
    end if;
    v_effective := coalesce(p_rent_effective_from, v_start);

    insert into public.rent_revisions (tenancy_id, old_rent, new_rent, effective_from)
    values (p_tenancy_id, v_tenancy.monthly_rent, p_new_rent, v_effective);

    update public.tenancies set monthly_rent = p_new_rent where id = p_tenancy_id;

    update public.rent_charges c
    set amount_due = p_new_rent
    where c.tenancy_id = p_tenancy_id
      and c.due_date >= v_effective
      and c.waived_amount = 0
      and not exists (select 1 from public.payments p where p.rent_charge_id = c.id);

    perform public.add_system_note(
      p_tenancy_id,
      'rent_change',
      format('Rent changed from ₹%s to ₹%s from %s.',
        v_tenancy.monthly_rent, p_new_rent, public.format_day(v_effective, v_today))
    );
  end if;

  return v_new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notice and planned move-out (PRD 7.10)
-- ---------------------------------------------------------------------------

create or replace function public.record_notice(
  p_tenancy_id uuid,
  p_given_by text,
  p_notice_date date,
  p_planned_move_out_date date,
  p_reason text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  v_today date;
  v_short_by integer;
  v_notice_id uuid;
begin
  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  if not found then
    raise exception 'That tenant wasn''t found.';
  end if;
  if v_tenancy.status = 'on_notice' then
    raise exception 'Notice is already recorded for this tenant. Change the move-out date instead.';
  end if;
  if v_tenancy.status = 'ended' then
    raise exception 'This tenant has already moved out.';
  end if;

  v_today := public.landlord_today(v_tenancy.landlord_id);
  if p_notice_date is null or p_notice_date > v_today then
    raise exception 'The notice date can''t be in the future.';
  end if;
  if p_planned_move_out_date is null or p_planned_move_out_date < p_notice_date then
    raise exception 'The move-out date must be on or after the notice date.';
  end if;

  v_short_by := greatest((p_notice_date + v_tenancy.notice_period_days) - p_planned_move_out_date, 0);

  insert into public.move_out_notices (
    tenancy_id, given_by, notice_date, planned_move_out_date, reason, is_short_notice, short_by_days
  )
  values (
    p_tenancy_id, p_given_by, p_notice_date, p_planned_move_out_date,
    nullif(trim(coalesce(p_reason, '')), ''), v_short_by > 0, v_short_by
  )
  returning id into v_notice_id;

  update public.tenancies set status = 'on_notice' where id = p_tenancy_id;
  perform public.remove_charges_after(p_tenancy_id, p_planned_move_out_date);

  perform public.add_system_note(
    p_tenancy_id,
    'notice',
    format(
      'Notice given by %s on %s. Leaving on %s.%s%s',
      p_given_by,
      public.format_day(p_notice_date, v_today),
      public.format_day(p_planned_move_out_date, v_today),
      coalesce(' Reason: ' || nullif(trim(coalesce(p_reason, '')), '') || '.', ''),
      case when v_short_by > 0
        then format(' Short notice: %s days less than the agreed %s days.', v_short_by, v_tenancy.notice_period_days)
        else ''
      end
    )
  );

  return v_notice_id;
end;
$$;

create or replace function public.change_move_out_date(
  p_tenancy_id uuid,
  p_new_date date,
  p_reason text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  n public.move_out_notices;
  v_today date;
  v_short_by integer;
begin
  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  select * into n from public.move_out_notices where tenancy_id = p_tenancy_id and status = 'open';
  if n.id is null then
    raise exception 'No notice is recorded for this tenant.';
  end if;
  if p_new_date is null or p_new_date < n.notice_date then
    raise exception 'The move-out date must be on or after the notice date.';
  end if;
  if p_new_date = n.planned_move_out_date then
    return;
  end if;

  v_today := public.landlord_today(v_tenancy.landlord_id);
  v_short_by := greatest((n.notice_date + v_tenancy.notice_period_days) - p_new_date, 0);

  insert into public.date_changes (landlord_id, notice_id, old_date, new_date, reason)
  values (n.landlord_id, n.id, n.planned_move_out_date, p_new_date, nullif(trim(coalesce(p_reason, '')), ''));

  update public.move_out_notices
  set planned_move_out_date = p_new_date, is_short_notice = v_short_by > 0, short_by_days = v_short_by
  where id = n.id;

  if p_new_date < n.planned_move_out_date then
    perform public.remove_charges_after(p_tenancy_id, p_new_date);
  else
    perform public.generate_rent_charges(p_tenancy_id);
  end if;

  perform public.add_system_note(
    p_tenancy_id,
    'notice',
    format(
      'Move-out date changed from %s to %s%s',
      public.format_day(n.planned_move_out_date, v_today),
      public.format_day(p_new_date, v_today),
      coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), '.')
    )
  );
end;
$$;

create or replace function public.withdraw_notice(p_tenancy_id uuid, p_reason text default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  n public.move_out_notices;
begin
  perform 1 from public.tenancies where id = p_tenancy_id for update;
  select * into n from public.move_out_notices where tenancy_id = p_tenancy_id and status = 'open';
  if n.id is null then
    raise exception 'No notice is recorded for this tenant.';
  end if;

  update public.move_out_notices set status = 'withdrawn', withdrawn_at = now() where id = n.id;
  update public.tenancies set status = 'active' where id = p_tenancy_id;
  perform public.generate_rent_charges(p_tenancy_id);

  perform public.add_system_note(
    p_tenancy_id,
    'notice',
    'Notice withdrawn. The tenant is staying'
      || coalesce(': ' || nullif(trim(coalesce(p_reason, '')), ''), '.')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- End tenancy and settle (PRD OUT-1 to OUT-3)
-- ---------------------------------------------------------------------------

-- 1. Removes unpaid charges due after the move-out date.
-- 2. If p_use_advance, pays remaining rent from the advance balance.
-- 3. If p_waive_remaining, waives whatever is still unpaid (reason required).
-- 4. Ends the tenancy and completes any open notice.
-- Returns what's left: {outstanding, refund_due}.
create or replace function public.end_tenancy(
  p_tenancy_id uuid,
  p_move_out_date date,
  p_use_advance boolean default true,
  p_waive_remaining boolean default false,
  p_waive_reason text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tenancy public.tenancies;
  v_today date;
  v_outstanding integer;
  v_balance integer;
  v_used integer := 0;
  v_waived integer := 0;
  r record;
begin
  select * into v_tenancy from public.tenancies where id = p_tenancy_id for update;
  if not found then
    raise exception 'That tenant wasn''t found.';
  end if;
  if v_tenancy.status = 'ended' then
    raise exception 'This tenant has already moved out.';
  end if;

  v_today := public.landlord_today(v_tenancy.landlord_id);
  if p_move_out_date is null or p_move_out_date > v_today then
    raise exception 'The move-out date can''t be in the future.';
  end if;
  if p_move_out_date < v_tenancy.shift_date then
    raise exception 'The move-out date can''t be before the move-in date.';
  end if;
  if p_waive_remaining and nullif(trim(coalesce(p_waive_reason, '')), '') is null then
    raise exception 'Add a reason for waiving the remaining rent.';
  end if;

  perform public.remove_charges_after(p_tenancy_id, p_move_out_date);

  select coalesce(sum(outstanding), 0) into v_outstanding
  from public.rent_charge_balances where tenancy_id = p_tenancy_id;

  select
    coalesce(sum(amount) filter (where kind = 'advance'), 0)
    - coalesce(sum(amount) filter (where mode = 'from_advance'), 0)
  into v_balance
  from public.payments where tenancy_id = p_tenancy_id and voided_at is null;

  if p_use_advance and v_outstanding > 0 and v_balance > 0 then
    v_used := least(v_outstanding, v_balance);
    perform public.record_payment(p_tenancy_id, v_used, v_today, 'from_advance', null, 'Used advance at move-out');
    v_outstanding := v_outstanding - v_used;
    v_balance := v_balance - v_used;
  end if;

  if p_waive_remaining and v_outstanding > 0 then
    for r in
      select rent_charge_id, outstanding
      from public.rent_charge_balances
      where tenancy_id = p_tenancy_id and outstanding > 0
    loop
      update public.rent_charges
      set waived_amount = waived_amount + r.outstanding, waive_reason = trim(p_waive_reason)
      where id = r.rent_charge_id;
      v_waived := v_waived + r.outstanding;
    end loop;
    v_outstanding := 0;
  end if;

  update public.tenancies
  set status = 'ended', move_out_date = p_move_out_date
  where id = p_tenancy_id;

  update public.move_out_notices
  set status = 'completed', completed_at = now()
  where tenancy_id = p_tenancy_id and status = 'open';

  perform public.add_system_note(
    p_tenancy_id,
    'move_out',
    format(
      'Moved out on %s.%s%s%s%s',
      public.format_day(p_move_out_date, v_today),
      case when v_used > 0 then format(' ₹%s of advance used for rent.', v_used) else '' end,
      case when v_waived > 0 then format(' ₹%s waived: %s.', v_waived, trim(p_waive_reason)) else '' end,
      case when v_outstanding > 0 then format(' ₹%s still owed.', v_outstanding) else '' end,
      case when v_balance > 0 then format(' Refund due to tenant: ₹%s.', v_balance) else '' end
    )
  );

  return jsonb_build_object(
    'outstanding', v_outstanding,
    'refund_due', greatest(v_balance, 0),
    'advance_used', v_used,
    'waived', v_waived
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions: signed-in landlords only, never anonymous visitors.
-- ---------------------------------------------------------------------------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.proname in (
        'landlord_today', 'due_date_in_month', 'format_day', 'add_system_note',
        'remove_charges_after', 'generate_rent_charges', 'create_property_with_units',
        'create_tenant', 'record_payment', 'reschedule_rent_charge', 'waive_rent_charge',
        'reschedule_agreement', 'renew_agreement', 'record_notice', 'change_move_out_date',
        'withdraw_notice', 'end_tenancy'
      )
  loop
    execute format('revoke execute on function %s from public, anon', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;

-- Views: signed-in landlords only (RLS on the tables does the per-landlord filtering).
revoke all on public.rent_charge_balances, public.rent_charge_history,
  public.tenancy_payment_stats, public.tenancy_summaries, public.unit_occupancy
  from anon;
grant select on public.rent_charge_balances, public.rent_charge_history,
  public.tenancy_payment_stats, public.tenancy_summaries, public.unit_occupancy
  to authenticated;
