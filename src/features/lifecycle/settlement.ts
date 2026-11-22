type Charge = { original_due_date: string; outstanding: number };

export type SettlementPreview = {
  /** Rent owed for months up to the move-out date. */
  owed: number;
  advanceBalance: number;
  /** Advance used against the rent owed. */
  advanceUsed: number;
  /** Still owed after using the advance (before any waiver). */
  remaining: number;
  /** Advance left over, to give back to the tenant. */
  refundDue: number;
};

/**
 * Mirrors end_tenancy in the database: months whose normal due date is after
 * the move-out date are dropped, then the advance pays what's left.
 */
export function previewSettlement(
  charges: Charge[],
  moveOutDay: string,
  advanceBalance: number,
  useAdvance: boolean
): SettlementPreview {
  const owed = charges
    .filter((c) => c.original_due_date <= moveOutDay)
    .reduce((s, c) => s + c.outstanding, 0);
  const advanceUsed = useAdvance ? Math.min(owed, Math.max(0, advanceBalance)) : 0;
  return {
    owed,
    advanceBalance,
    advanceUsed,
    remaining: owed - advanceUsed,
    refundDue: Math.max(0, advanceBalance - advanceUsed),
  };
}
