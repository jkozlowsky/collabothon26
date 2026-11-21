import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { SpotlightOverlay } from '@/components/spotlight/SpotlightOverlay';
import type { Spot, SpotRect } from '@/types/spotlight';

type SpotlightValue = {
  /** The spot waiting to be shown or on screen. */
  active: Spot | null;
  show: (spot: Spot) => void;
  close: () => void;
  /** Called by the matching SpotTarget once it is on screen and measured. */
  setRect: (rect: SpotRect) => void;
};

const SpotlightContext = createContext<SpotlightValue | null>(null);

/**
 * "Here it is": dims the app and cuts a hole around one feature in the bank, with a short note and a close
 * button. Atlas uses it after the user picked a bank offer at the end of a story.
 */
export function SpotlightProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Spot | null>(null);
  const [rect, setRectState] = useState<SpotRect | null>(null);

  const show = useCallback((spot: Spot) => {
    setRectState(null);
    setActive(spot);
  }, []);
  const close = useCallback(() => {
    setActive(null);
    setRectState(null);
  }, []);

  const value = useMemo(() => ({ active, show, close, setRect: setRectState }), [active, show, close]);
  return (
    <SpotlightContext.Provider value={value}>
      {children}
      {active && rect && <SpotlightOverlay spot={active} rect={rect} onClose={close} />}
    </SpotlightContext.Provider>
  );
}

export function useSpotlight() {
  const ctx = useContext(SpotlightContext);
  if (!ctx) throw new Error('useSpotlight must be used inside <SpotlightProvider>');
  return ctx;
}

/** Null outside the provider, so bank components still render alone (tests, previews). */
export const useSpotlightIfAny = () => useContext(SpotlightContext);
