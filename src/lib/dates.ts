import { addMonths, format, lastDayOfMonth } from 'date-fns';

/**
 * Database dates are calendar dates ('YYYY-MM-DD'), not instants. These
 * helpers convert them to local Date objects at midnight and back, so a date
 * never shifts by a day because of the timezone.
 */

export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDay(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The due date in a month: the due day, or the month's last day if shorter. */
export function dueDateInMonth(month: Date, dueDay: number): Date {
  const last = lastDayOfMonth(month).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(dueDay, last));
}

/** The first due date on or after `from` for a monthly due day. */
export function nextDueDate(dueDay: number, from: Date = today()): Date {
  const thisMonth = dueDateInMonth(from, dueDay);
  return thisMonth >= from ? thisMonth : dueDateInMonth(addMonths(from, 1), dueDay);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
