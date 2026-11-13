import type { StampTone } from '@/components/ui/stamp';
import type { ChargeStatus, RentChargeBalance, TenancySummary } from '@/lib/db-types';
import { parseDay } from '@/lib/dates';
import { formatDate, formatINR } from '@/lib/format';

export type StampInfo = { label: string; tone: StampTone };

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** The rent stamp for a tenant in lists and on their screen. */
export function rentStamp(t: TenancySummary): StampInfo {
  if (t.status === 'ended') return { label: 'Moved out', tone: 'neutral' };
  switch (t.rent_status) {
    case 'overdue':
      return { label: `${days(t.days_overdue)} late`, tone: 'late' };
    case 'due_today':
      return { label: 'Due today', tone: 'due' };
    case 'partly_paid':
      return { label: 'Partly paid', tone: 'due' };
    case 'upcoming':
      return {
        label: t.next_due_date ? `Due ${formatDate(parseDay(t.next_due_date))}` : 'Upcoming',
        tone: 'neutral',
      };
    default:
      return { label: 'Paid', tone: 'paid' };
  }
}

/** The amount that matters right now: what's owed, else the next rent. */
export function headlineAmount(t: TenancySummary): { amount: number; caption: string } {
  if (t.outstanding > 0) return { amount: t.outstanding, caption: t.rent_status === 'overdue' ? 'overdue' : 'due today' };
  if (t.next_due_amount) return { amount: t.next_due_amount, caption: 'next rent' };
  return { amount: t.monthly_rent, caption: 'a month' };
}

export function chargeStamp(c: RentChargeBalance): StampInfo {
  const map: Record<ChargeStatus, StampInfo> = {
    overdue: { label: `${days(c.days_overdue)} late`, tone: 'late' },
    due_today: { label: 'Due today', tone: 'due' },
    partly_paid: { label: `${formatINR(c.outstanding)} left`, tone: 'due' },
    upcoming: { label: 'Upcoming', tone: 'neutral' },
    paid: { label: 'Paid', tone: 'paid' },
    waived: { label: 'Waived', tone: 'neutral' },
  };
  return map[c.status];
}

/** "+91 98765 43210" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/^\+91/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

/** Days until a date (negative if past). */
export function daysUntil(day: string, asOf: string): number {
  return Math.round((parseDay(day).getTime() - parseDay(asOf).getTime()) / 86_400_000);
}
