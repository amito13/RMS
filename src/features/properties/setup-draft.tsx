import 'expo-sqlite/localStorage/install';

import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import type { NewProperty, NewUnit, UnitType } from '@/lib/db-types';
import { useAuth } from '@/providers/auth-provider';

import { unitTypeLabel } from './unit-types';

/** One row on the "rooms and rent" screen: a type, how many, and their rent. */
export type UnitGroup = {
  key: string;
  unit_type: UnitType | null;
  type_label: string;
  count: number;
  /** Digits only, as typed. */
  rent: string;
};

export type SetupDraft = {
  property: NewProperty;
  groups: UnitGroup[];
  /** Units as shown on the review screen (renamable). */
  units: NewUnit[];
  /** Signature of the groups the units were generated from. */
  unitsFrom: string;
};

export function newGroup(): UnitGroup {
  return {
    key: Math.random().toString(36).slice(2),
    unit_type: null,
    type_label: '',
    count: 1,
    rent: '',
  };
}

const emptyDraft = (): SetupDraft => ({
  property: { name: '', address_line: '', locality: '', city: '', pincode: '' },
  groups: [newGroup()],
  units: [],
  unitsFrom: '',
});

export function groupsSignature(groups: UnitGroup[]): string {
  return JSON.stringify(groups.map((g) => [g.unit_type, g.type_label.trim(), g.count, g.rent]));
}

/**
 * One unit per count, named "<type> <n>" and numbered per type across groups:
 * 1BHK × 3 then 1BHK × 2 gives 1BHK 1–5.
 */
export function generateUnits(groups: UnitGroup[]): NewUnit[] {
  const counters = new Map<string, number>();
  const units: NewUnit[] = [];
  for (const g of groups) {
    if (!g.unit_type) continue;
    const label = unitTypeLabel(g.unit_type, g.type_label);
    for (let i = 0; i < g.count; i++) {
      const n = (counters.get(label) ?? 0) + 1;
      counters.set(label, n);
      units.push({
        name: `${label} ${n}`,
        unit_type: g.unit_type,
        type_label: g.unit_type === 'other' ? g.type_label.trim() : undefined,
        monthly_rent: Number(g.rent),
      });
    }
  }
  return units;
}

type DraftContext = {
  draft: SetupDraft;
  update: (patch: Partial<SetupDraft>) => void;
  reset: () => void;
  /** True when the draft has anything typed in it (to offer "Continue setup"). */
  hasProgress: boolean;
};

const Context = createContext<DraftContext | null>(null);

function storageKey(userId: string | undefined) {
  return `rms-property-setup-draft:${userId ?? 'anon'}`;
}

function load(key: string): SetupDraft {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...emptyDraft(), ...(JSON.parse(raw) as SetupDraft) };
  } catch {
    // A broken or missing draft just starts fresh.
  }
  return emptyDraft();
}

/**
 * Draft of the property being set up, kept on the device so closing the app
 * mid-way resumes where the landlord left off (PRD PROP-1).
 */
export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const key = storageKey(session?.user.id);
  const [draft, setDraft] = useState<SetupDraft>(() => load(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Not being able to save the draft shouldn't block setup.
    }
  }, [key, draft]);

  const value: DraftContext = {
    draft,
    update: (patch) => setDraft((d) => ({ ...d, ...patch })),
    reset: () => setDraft(emptyDraft()),
    hasProgress:
      Object.values(draft.property).some((v) => !!v?.trim()) ||
      draft.groups.some((g) => g.unit_type !== null || !!g.rent),
  };

  return <Context value={value}>{children}</Context>;
}

export function useSetupDraft() {
  const ctx = use(Context);
  if (!ctx) throw new Error('useSetupDraft must be used inside SetupDraftProvider');
  return ctx;
}
