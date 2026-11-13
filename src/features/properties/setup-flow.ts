import { useSyncExternalStore } from 'react';

/**
 * Whether the property-setup screens (src/app/onboarding) are open on purpose:
 * to add another property, or to show the "done" screen after the first one.
 * The root layout lets a landlord who has finished onboarding into those
 * screens only while this is true.
 */
let open = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (open === value) return;
  open = value;
  listeners.forEach((l) => l());
}

export const propertySetup = {
  open: () => set(true),
  close: () => set(false),
};

export function usePropertySetupOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open
  );
}
