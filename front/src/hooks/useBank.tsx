import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';

import { formatEUR } from '@/lib/bank/money';
import { bankReducer, validateOrder, validateTransfer } from '@/lib/bank/reducer';
import { DEFAULT_SEED, seedAccount } from '@/lib/bank/seed';
import type { BankState, OrderInput, TransferInput } from '@/types/bank';

type Money = (cents: number, opts?: { signed?: boolean; whole?: boolean }) => string;

type BankContextValue = {
  state: BankState;
  /** Eye toggle: hides every amount in the bank shell. */
  amountsHidden: boolean;
  toggleAmountsHidden: () => void;
  /** formatEUR that respects `amountsHidden`. */
  money: Money;
  /** Returns an error message, or null after the transfer was booked. */
  sendTransfer: (input: TransferInput) => string | null;
  /** Demo order paid from depot cash. Returns an error message, or null when placed. */
  placeOrder: (input: OrderInput) => string | null;
};

const BankContext = createContext<BankContextValue | null>(null);

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Mock bank for the host-app shell. In memory only: every reload starts again from the seed,
 * so each demo run looks the same.
 */
export function BankProvider({ children, seed = DEFAULT_SEED }: { children: ReactNode; seed?: number }) {
  const [state, dispatch] = useReducer(bankReducer, seed, seedAccount);
  const [amountsHidden, setAmountsHidden] = useState(false);

  const toggleAmountsHidden = useCallback(() => setAmountsHidden((h) => !h), []);

  const money = useCallback<Money>((cents, opts) => formatEUR(cents, { ...opts, hidden: amountsHidden }), [amountsHidden]);

  const sendTransfer = useCallback(
    (input: TransferInput) => {
      const error = validateTransfer(state, input);
      if (!error) dispatch({ type: 'transfer', input, time: nowHHMM() });
      return error;
    },
    [state],
  );

  const placeOrder = useCallback(
    (input: OrderInput) => {
      const error = validateOrder(state, input);
      if (!error) dispatch({ type: 'order', input });
      return error;
    },
    [state],
  );

  const value = useMemo(
    () => ({ state, amountsHidden, toggleAmountsHidden, money, sendTransfer, placeOrder }),
    [state, amountsHidden, toggleAmountsHidden, money, sendTransfer, placeOrder],
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error('useBank must be used inside <BankProvider>');
  return ctx;
}
