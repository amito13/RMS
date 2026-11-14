import { format } from 'date-fns';

import { parseDay } from '@/lib/dates';
import { formatINR } from '@/lib/format';

type Charge = { rent_charge_id: string; period_month: string; outstanding: number };

export type Allocation = {
  parts: { chargeId: string; month: string; amount: number; settles: boolean }[];
  /** Amount left after every unpaid month is covered. */
  excess: number;
};

/**
 * Mirrors record_payment in the database: oldest unpaid month first, or only
 * the given month. Used to preview a payment before it's saved.
 */
export function allocate(amount: number, charges: Charge[], onlyChargeId?: string): Allocation {
  let left = Math.max(0, Math.floor(amount));
  const parts: Allocation['parts'] = [];
  const open = charges
    .filter((c) => c.outstanding > 0 && (!onlyChargeId || c.rent_charge_id === onlyChargeId))
    .sort((a, b) => a.period_month.localeCompare(b.period_month));

  for (const c of open) {
    if (left === 0) break;
    const take = Math.min(left, c.outstanding);
    parts.push({
      chargeId: c.rent_charge_id,
      month: format(parseDay(c.period_month), 'MMMM'),
      amount: take,
      settles: take === c.outstanding,
    });
    left -= take;
  }
  return { parts, excess: left };
}

/** "Pays October in full and ₹2,000 of November." */
export function describeAllocation(a: Allocation): string {
  if (!a.parts.length) return a.excess > 0 ? 'No rent is unpaid right now.' : '';
  const phrases = a.parts.map((p) => (p.settles ? `${p.month} in full` : `${formatINR(p.amount)} of ${p.month}`));
  const list = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}`;
  return `Pays ${list}.`;
}
