-- Derived money values, computed in one place so the app and any server job
-- use the same rules. All views use security_invoker, so Row Level Security on
-- the underlying tables still applies to whoever queries them.

-- Today's date for a landlord, in their timezone.
create or replace function public.landlord_today(p_landlord_id uuid default auth.uid())
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = p_landlord_id),
    'Asia/Kolkata'
  ))::date;
$$;

-- The rent due date for a month: the due day, or the month's last day if the
-- month is shorter (due day 31 in November → 30 Nov).
create or replace function public.due_date_in_month(p_month date, p_due_day integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    extract(year from p_month)::int,
    extract(month from p_month)::int,
    least(
      p_due_day,
      extract(day from (date_trunc('month', p_month) + interval '1 month - 1 day'))::int
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Per charge: paid, outstanding and status
-- ---------------------------------------------------------------------------

create view public.rent_charge_balances
with (security_invoker = true) as
select
  c.id as rent_charge_id,
  c.landlord_id,
  c.tenancy_id,
  c.period_month,
  c.amount_due,
  c.waived_amount,
  c.original_due_date,
  c.due_date,
  coalesce(p.paid, 0)::integer as paid,
  greatest(c.amount_due - c.waived_amount - coalesce(p.paid, 0), 0)::integer as outstanding,
  case
    when c.amount_due - c.waived_amount - coalesce(p.paid, 0) <= 0 then
      case when c.waived_amount > 0 then 'waived' else 'paid' end
    when c.due_date < t.today then 'overdue'
    when c.due_date = t.today then 'due_today'
    when coalesce(p.paid, 0) > 0 then 'partly_paid'
    else 'upcoming'
  end as status,
  case when c.due_date < t.today then t.today - c.due_date else 0 end as days_overdue,
  t.today as as_of
from public.rent_charges c
cross join lateral (select public.landlord_today(c.landlord_id) as today) t
left join lateral (
  select sum(pay.amount) as paid
  from public.payments pay
  where pay.rent_charge_id = c.id and pay.voided_at is null
) p on true;

-- ---------------------------------------------------------------------------
-- Per charge: how reliably it was paid (PRD 7.5, Payment history)
-- ---------------------------------------------------------------------------

create view public.rent_charge_history
with (security_invoker = true) as
with running as (
  select
    pay.rent_charge_id,
    pay.paid_on,
    sum(pay.amount) over (
      partition by pay.rent_charge_id
      order by pay.paid_on, pay.created_at, pay.id
    ) as running_total
  from public.payments pay
  where pay.voided_at is null and pay.rent_charge_id is not null
),
settled as (
  select
    b.*,
    (
      select min(r.paid_on)
      from running r
      where r.rent_charge_id = b.rent_charge_id
        and r.running_total >= b.amount_due - b.waived_amount
        and b.amount_due - b.waived_amount > 0
    ) as settled_on,
    (
      select count(*)::integer
      from public.payments pay
      where pay.rent_charge_id = b.rent_charge_id and pay.voided_at is null
    ) as payment_count,
    b.due_date <> b.original_due_date as was_rescheduled
  from public.rent_charge_balances b
)
select
  s.*,
  case
    when s.waived_amount > 0 and s.outstanding = 0 then 'waived'
    when s.settled_on is not null and s.settled_on <= s.original_due_date then 'on_time'
    when s.settled_on is not null and s.was_rescheduled and s.settled_on <= s.due_date then 'late_promise_kept'
    when s.settled_on is not null then 'late'
    -- Rescheduled and the promised date hasn't passed: not judged yet.
    when s.was_rescheduled and s.due_date >= s.as_of then 'promised'
    when s.original_due_date < s.as_of then 'unpaid'
    else 'not_due'
  end as result,
  case
    when s.settled_on is not null then greatest(s.settled_on - s.original_due_date, 0)
    when s.outstanding > 0 and s.original_due_date < s.as_of then s.as_of - s.original_due_date
    else 0
  end as days_late,
  case
    when not s.was_rescheduled then null
    when s.settled_on is not null then s.settled_on <= s.due_date
    when s.due_date < s.as_of then false
    else null -- promised date not reached yet
  end as promise_kept
from settled s;

-- ---------------------------------------------------------------------------
-- Per tenancy: payment reliability summary (last 12 months and totals)
-- ---------------------------------------------------------------------------

create view public.tenancy_payment_stats
with (security_invoker = true) as
with base as (
  select
    h.*,
    h.period_month >= (date_trunc('month', h.as_of) - interval '11 months')::date as in_last_12,
    h.period_month >= (date_trunc('month', h.as_of) - interval '5 months')::date as in_last_6
  from public.rent_charge_history h
),
fy as (
  select
    t.id as tenancy_id,
    make_date(
      case when extract(month from public.landlord_today(t.landlord_id)) >= 4
        then extract(year from public.landlord_today(t.landlord_id))::int
        else extract(year from public.landlord_today(t.landlord_id))::int - 1
      end, 4, 1
    ) as fy_start
  from public.tenancies t
)
select
  t.id as tenancy_id,
  t.landlord_id,
  count(*) filter (where b.in_last_12 and b.result in ('on_time', 'late', 'late_promise_kept', 'unpaid'))::integer
    as months_counted,
  count(*) filter (where b.in_last_12 and b.result = 'on_time')::integer as months_on_time,
  count(*) filter (where b.in_last_12 and b.result in ('late', 'late_promise_kept', 'unpaid'))::integer
    as months_late,
  coalesce(round(avg(b.days_late) filter (
    where b.in_last_12 and b.result in ('late', 'late_promise_kept')
  )), 0)::integer as average_days_late,
  coalesce(max(b.days_late) filter (
    where b.in_last_12 and b.result in ('late', 'late_promise_kept', 'unpaid')
  ), 0)::integer as longest_days_late,
  (array_agg(b.period_month order by b.days_late desc, b.period_month desc) filter (
    where b.in_last_12 and b.result in ('late', 'late_promise_kept', 'unpaid')
  ))[1] as longest_delay_month,
  count(*) filter (where b.promise_kept is not null)::integer as promises_made,
  count(*) filter (where b.promise_kept)::integer as promises_kept,
  (
    select coalesce(sum(pay.amount), 0)::integer
    from public.payments pay
    where pay.tenancy_id = t.id and pay.kind = 'rent' and pay.voided_at is null
  ) as total_paid,
  (
    select coalesce(sum(pay.amount), 0)::integer
    from public.payments pay
    where pay.tenancy_id = t.id and pay.kind = 'rent' and pay.voided_at is null
      and pay.paid_on >= fy.fy_start
  ) as total_paid_this_financial_year,
  coalesce(sum(b.waived_amount), 0)::integer as total_waived,
  case
    when count(*) filter (where b.in_last_6 and b.result in ('on_time', 'late', 'late_promise_kept', 'unpaid')) < 3
      then null
    when count(*) filter (where b.in_last_6 and b.result = 'on_time')::numeric
       / count(*) filter (where b.in_last_6 and b.result in ('on_time', 'late', 'late_promise_kept', 'unpaid'))
       >= 0.8 then 'usually_on_time'
    when count(*) filter (where b.in_last_6 and b.result in ('late', 'late_promise_kept', 'unpaid'))::numeric
       / count(*) filter (where b.in_last_6 and b.result in ('on_time', 'late', 'late_promise_kept', 'unpaid'))
       >= 0.5 then 'often_late'
    else 'sometimes_late'
  end as payment_habit
from public.tenancies t
join fy on fy.tenancy_id = t.id
left join base b on b.tenancy_id = t.id
group by t.id, t.landlord_id, fy.fy_start;

-- ---------------------------------------------------------------------------
-- Per tenancy: everything the tenant list, tenant screen and Today screen need
-- ---------------------------------------------------------------------------

create view public.tenancy_summaries
with (security_invoker = true) as
select
  t.id as tenancy_id,
  t.landlord_id,
  t.status,
  t.tenant_id,
  tn.full_name as tenant_name,
  tn.phone as tenant_phone,
  tn.member_count,
  t.unit_id,
  u.name as unit_name,
  u.unit_type,
  u.property_id,
  pr.name as property_name,
  t.shift_date,
  t.move_out_date,
  t.monthly_rent,
  t.rent_due_day,
  t.notice_period_days,
  today.d as as_of,

  -- Rent
  coalesce(due.outstanding, 0)::integer as outstanding,
  coalesce(due.overdue_amount, 0)::integer as overdue_amount,
  due.oldest_overdue_date,
  case when due.oldest_overdue_date is not null then today.d - due.oldest_overdue_date else 0 end
    as days_overdue,
  coalesce(due.due_today_amount, 0)::integer as due_today_amount,
  nxt.due_date as next_due_date,
  nxt.outstanding as next_due_amount,
  nxt.original_due_date as next_original_due_date,
  last_pay.paid_on as last_paid_on,
  last_pay.amount as last_paid_amount,
  case
    when coalesce(due.overdue_amount, 0) > 0 then 'overdue'
    when coalesce(due.due_today_amount, 0) > 0 then 'due_today'
    when nxt.status = 'partly_paid' then 'partly_paid'
    when nxt.due_date is not null then 'upcoming'
    else 'paid'
  end as rent_status,

  -- Advance rent
  t.advance_agreed,
  adv.received::integer as advance_received,
  greatest(t.advance_agreed - adv.received, 0)::integer as advance_pending,
  adv.used::integer as advance_used,
  (adv.received - adv.used)::integer as advance_balance,

  -- Agreement
  ag.id as agreement_id,
  ag.start_date as agreement_start_date,
  ag.term_months as agreement_term_months,
  ag.end_date as agreement_end_date,
  ag.reminder_date as agreement_reminder_date,

  -- Notice
  n.id as notice_id,
  n.given_by as notice_given_by,
  n.notice_date,
  n.planned_move_out_date,
  n.is_short_notice,
  n.short_by_days,

  -- Verification and latest note
  exists (
    select 1 from public.documents d
    where d.tenant_id = t.tenant_id
      and d.doc_type in ('aadhaar_front', 'aadhaar_back', 'aadhaar_pdf')
      and d.upload_status = 'uploaded'
  ) as has_aadhaar,
  latest_note.body as latest_note,
  latest_note.created_at as latest_note_at
from public.tenancies t
join public.tenants tn on tn.id = t.tenant_id
join public.units u on u.id = t.unit_id
join public.properties pr on pr.id = u.property_id
cross join lateral (select public.landlord_today(t.landlord_id) as d) today
left join lateral (
  select
    sum(b.outstanding) filter (where b.due_date <= today.d) as outstanding,
    sum(b.outstanding) filter (where b.due_date < today.d) as overdue_amount,
    min(b.due_date) filter (where b.due_date < today.d and b.outstanding > 0) as oldest_overdue_date,
    sum(b.outstanding) filter (where b.due_date = today.d) as due_today_amount
  from public.rent_charge_balances b
  where b.tenancy_id = t.id
) due on true
left join lateral (
  select b.due_date, b.original_due_date, b.outstanding, b.status
  from public.rent_charge_balances b
  where b.tenancy_id = t.id and b.outstanding > 0 and b.due_date > today.d
  order by b.due_date
  limit 1
) nxt on true
left join lateral (
  select pay.paid_on, pay.amount
  from public.payments pay
  where pay.tenancy_id = t.id and pay.kind = 'rent' and pay.voided_at is null
    and pay.mode <> 'from_advance'
  order by pay.paid_on desc, pay.created_at desc
  limit 1
) last_pay on true
cross join lateral (
  select
    coalesce(sum(pay.amount) filter (where pay.kind = 'advance'), 0) as received,
    coalesce(sum(pay.amount) filter (where pay.mode = 'from_advance'), 0) as used
  from public.payments pay
  where pay.tenancy_id = t.id and pay.voided_at is null
) adv
left join lateral (
  select a.*
  from public.agreements a
  where a.tenancy_id = t.id
  order by a.start_date desc, a.created_at desc
  limit 1
) ag on true
left join lateral (
  select mn.*
  from public.move_out_notices mn
  where mn.tenancy_id = t.id and mn.status = 'open'
  limit 1
) n on true
left join lateral (
  select nt.body, nt.created_at
  from public.notes nt
  where nt.tenant_id = t.tenant_id
  order by nt.pinned desc, nt.created_at desc
  limit 1
) latest_note on true;

-- ---------------------------------------------------------------------------
-- Per unit: occupancy for the property screens
-- ---------------------------------------------------------------------------

create view public.unit_occupancy
with (security_invoker = true) as
select
  u.id as unit_id,
  u.landlord_id,
  u.property_id,
  u.name,
  u.unit_type,
  u.type_label,
  u.floor,
  u.monthly_rent,
  u.archived_at,
  t.id as tenancy_id,
  tn.full_name as tenant_name,
  case when t.id is null then 'vacant' else 'occupied' end as occupancy,
  coalesce(n.planned_move_out_date, null) as planned_move_out_date,
  case when n.planned_move_out_date is not null then n.planned_move_out_date + 1 end as available_from
from public.units u
left join public.tenancies t on t.unit_id = u.id and t.status in ('active', 'on_notice')
left join public.tenants tn on tn.id = t.tenant_id
left join public.move_out_notices n on n.tenancy_id = t.id and n.status = 'open';
