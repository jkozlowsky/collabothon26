import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { TransferSheet, type TransferStart } from '@/components/bank/TransferSheet';

type Value = { openTransfer: (start?: TransferStart) => void };

const TransferContext = createContext<Value | null>(null);

/** One transfer flow for the whole bank shell: Home, Payments and contacts all open the same sheet. */
export function TransferSheetProvider({ children }: { children: ReactNode }) {
  const [start, setStart] = useState<TransferStart | null>(null);
  // Bumped on every opening; used as the sheet's key so each flow starts clean.
  const [opening, setOpening] = useState(0);
  const openTransfer = useCallback((s: TransferStart = { kind: 'pick' }) => {
    setOpening((n) => n + 1);
    setStart(s);
  }, []);
  const value = useMemo(() => ({ openTransfer }), [openTransfer]);
  return (
    <TransferContext.Provider value={value}>
      {children}
      <TransferSheet key={opening} start={start} onClose={() => setStart(null)} />
    </TransferContext.Provider>
  );
}

export function useTransferSheet() {
  const ctx = useContext(TransferContext);
  if (!ctx) throw new Error('useTransferSheet must be used inside <TransferSheetProvider>');
  return ctx;
}
