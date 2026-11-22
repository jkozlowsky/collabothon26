import { useSyncExternalStore } from 'react';

/**
 * Shared between the Atlas popup and the Atlas button in the bank nav: the popup flies into the
 * button when it closes, and the button then shows a dot until it is tapped.
 */
export type OrbRect = { x: number; y: number; width: number; height: number };
type Measure = (done: (rect: OrbRect | null) => void) => void;

let measure: Measure | null = null;
let dot = false;
const listeners = new Set<() => void>();

/** The nav registers how to find the Atlas button while it shows it. Returns the unregister function. */
export function registerOrbMeasure(m: Measure) {
  measure = m;
  return () => {
    measure = null;
  };
}

/** Window position of the Atlas button, measured now (the nav may have moved since it laid out). */
export function measureOrb(done: (rect: OrbRect | null) => void) {
  if (measure) measure(done);
  else done(null);
}

export function setAtlasDot(on: boolean) {
  if (dot === on) return;
  dot = on;
  listeners.forEach((l) => l());
}

export function useAtlasDot() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => dot,
  );
}
