import type { TenancySummary } from '@/lib/db-types';

import { daysUntil } from '../tenants/status';

export type TodayPlan = {
  /** Owed now (overdue + due today), grouped by building, most overdue first. */
  collect: { property: string; rows: TenancySummary[] }[];
  collectTotal: number;
  collectCount: number;
  /** Rent falling due in the next 7 days and not yet owed. */
  upcoming: TenancySummary[];
  /** Tenants on notice leaving in the next 30 days (or overdue to leave). */
  leaving: TenancySummary[];
  /** Agreements whose renewal date is within 30 days (or passed). */
  renewals: TenancySummary[];
  /** The next rent after today, for the empty state. */
  next: TenancySummary | null;
  advancePending: number;
  hasTenants: boolean;
};

/** Works out what the Today screen shows from the tenancy summaries (PRD 7.11). */
export function planToday(all: TenancySummary[]): TodayPlan {
  const current = all.filter((t) => t.status !== 'ended');

  const owed = current
    .filter((t) => t.outstanding > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue || b.outstanding - a.outstanding);
  const groups = new Map<string, TenancySummary[]>();
  for (const t of owed) groups.set(t.property_name, [...(groups.get(t.property_name) ?? []), t]);

  const upcoming = current
    .filter(
      (t) =>
        t.outstanding === 0 &&
        !!t.next_due_date &&
        daysUntil(t.next_due_date, t.as_of) >= 1 &&
        daysUntil(t.next_due_date, t.as_of) <= 7
    )
    .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!));

  const leaving = current
    .filter((t) => t.status === 'on_notice' && !!t.planned_move_out_date && daysUntil(t.planned_move_out_date, t.as_of) <= 30)
    .sort((a, b) => a.planned_move_out_date!.localeCompare(b.planned_move_out_date!));

  const renewals = current
    .filter(
      (t) =>
        t.status === 'active' &&
        !!t.agreement_reminder_date &&
        daysUntil(t.agreement_reminder_date, t.as_of) <= 30
    )
    .sort((a, b) => a.agreement_reminder_date!.localeCompare(b.agreement_reminder_date!));

  const next =
    current
      .filter((t) => t.outstanding === 0 && t.next_due_date)
      .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))[0] ?? null;

  return {
    collect: [...groups].map(([property, rows]) => ({ property, rows })),
    collectTotal: owed.reduce((s, t) => s + t.outstanding, 0),
    collectCount: owed.length,
    upcoming,
    leaving,
    renewals,
    next,
    advancePending: current.reduce((s, t) => s + t.advance_pending, 0),
    hasTenants: current.length > 0,
  };
}
