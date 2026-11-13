import { format, isSameYear } from 'date-fns';

/**
 * Rupees with Indian digit grouping: 100000 → "₹1,00,000".
 * Written by hand so it doesn't depend on the phone's Intl locale data.
 */
export function formatINR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = Math.round(Math.abs(amount)).toString();
  if (digits.length <= 3) return `${sign}₹${digits}`;

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${rest},${lastThree}`;
}

/** "2 Nov" in the current year, "2 Nov 2025" otherwise. */
export function formatDate(date: Date, today: Date = new Date()): string {
  return format(date, isSameYear(date, today) ? 'd MMM' : 'd MMM yyyy');
}

/** "November 2026" */
export function formatMonth(date: Date): string {
  return format(date, 'MMMM yyyy');
}

/** "Tuesday, 2 Dec" for screen headers. */
export function formatDayHeading(date: Date): string {
  return format(date, 'EEEE, d MMM');
}
