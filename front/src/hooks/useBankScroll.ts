import { createContext, useContext } from 'react';

/** Lets something inside a bank page scroll the page, e.g. to bring a spotlighted feature into view. */
export const BankScrollContext = createContext<{ scrollBy: (dy: number) => void } | null>(null);

export const useBankScroll = () => useContext(BankScrollContext);
