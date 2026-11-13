import type { UnitType } from '@/lib/db-types';

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'single_room', label: 'Single room' },
  { value: '1rk', label: '1RK' },
  { value: '1bhk', label: '1BHK' },
  { value: '2bhk', label: '2BHK' },
  { value: '3bhk', label: '3BHK' },
  { value: '4bhk_plus', label: '4BHK+' },
  { value: 'shop', label: 'Shop' },
  { value: 'other', label: 'Other' },
];

const LABELS = Object.fromEntries(UNIT_TYPES.map((t) => [t.value, t.label])) as Record<
  UnitType,
  string
>;

/** "1BHK", or the landlord's own label for "Other" (e.g. "Godown"). */
export function unitTypeLabel(type: UnitType, typeLabel?: string | null): string {
  if (type === 'other' && typeLabel?.trim()) return typeLabel.trim();
  return LABELS[type];
}

/** "3 × 1BHK, 2 × 2BHK" from a list of units, in the standard type order. */
export function summariseUnitTypes(
  units: { unit_type: UnitType; type_label?: string | null }[]
): string {
  const counts = new Map<string, number>();
  const order = UNIT_TYPES.map((t) => t.value);
  const sorted = [...units].sort(
    (a, b) => order.indexOf(a.unit_type) - order.indexOf(b.unit_type)
  );
  for (const u of sorted) {
    const label = unitTypeLabel(u.unit_type, u.type_label);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, n]) => `${n} × ${label}`).join(', ');
}
