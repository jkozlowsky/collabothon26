/** Pure state changes for the mock bank. Validation lives next to the action so the UI and tests share it. */
import { groupIban, isValidIban, normaliseIban } from '@/lib/bank/money';
import type { BankState, Contact, OrderInput, TransferInput } from '@/types/bank';

export type BankAction =
  | { type: 'transfer'; input: TransferInput; time: string }
  | { type: 'order'; input: OrderInput };

/** The contact a transfer goes to: an existing one, or a new one built from name + IBAN. */
export function resolveRecipient(state: BankState, input: TransferInput): Contact | null {
  const r = input.recipient;
  if ('contactId' in r) return state.contacts.find((c) => c.id === r.contactId) ?? null;
  const name = r.name.trim();
  if (!name || !isValidIban(r.iban)) return null;
  const existing = state.contacts.find((c) => normaliseIban(c.iban) === normaliseIban(r.iban));
  if (existing) return existing;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return { id: `c-${normaliseIban(r.iban)}`, name, initials, iban: groupIban(r.iban), tone: 'slate' };
}

/** Returns a user-facing error, or null when the transfer can go ahead. */
export function validateTransfer(state: BankState, input: TransferInput): string | null {
  const r = input.recipient;
  if ('name' in r) {
    if (!r.name.trim()) return 'Enter the recipient’s name.';
    if (!isValidIban(r.iban)) return 'Enter a German IBAN: DE followed by 20 digits.';
  } else if (!resolveRecipient(state, input)) {
    return 'Pick a recipient.';
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Enter an amount above € 0.';
  if (input.amount > state.account.balance) return 'That is more than your available balance.';
  return null;
}

/** Returns a user-facing error, or null when the demo order can be placed from the depot's cash. */
export function validateOrder(state: BankState, input: OrderInput): string | null {
  const holding = state.holdings.find((h) => h.id === input.holdingId);
  if (!holding || holding.assetClass === 'cash') return 'Pick a position to buy.';
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Enter an amount above € 0.';
  const cash = state.holdings.find((h) => h.assetClass === 'cash')?.value ?? 0;
  if (input.amount > cash) return 'Your depot cash does not cover this order.';
  return null;
}

export function bankReducer(state: BankState, action: BankAction): BankState {
  switch (action.type) {
    case 'transfer': {
      // Invalid input is a no-op; the UI shows the validation message before it gets here.
      if (validateTransfer(state, action.input)) return state;
      const contact = resolveRecipient(state, action.input)!;
      const { amount } = action.input;
      const id = `tx-${state.transactions.length + 1}-${action.time}`;
      const title = `Transfer to ${contact.name}`;
      const known = state.contacts.some((c) => c.id === contact.id);
      return {
        ...state,
        account: {
          ...state.account,
          balance: state.account.balance - amount,
          monthOut: state.account.monthOut + amount,
        },
        transactions: [
          { id, title, category: 'Transfer', icon: 'transfer', daysAgo: 0, time: action.time, amount: -amount, source: 'Main account', status: 'pending' },
          ...state.transactions,
        ],
        pending: [
          { id: `p-${id}`, title, icon: 'transfer', meta: 'Processing · instant', amount: -amount, when: `Today ${action.time}` },
          ...state.pending,
        ],
        contacts: known ? state.contacts : [...state.contacts, contact],
      };
    }
    case 'order': {
      if (validateOrder(state, action.input)) return state;
      const { holdingId, amount } = action.input;
      return {
        ...state,
        holdings: state.holdings.map((h) => {
          if (h.assetClass === 'cash') return { ...h, value: h.value - amount };
          if (h.id !== holdingId) return h;
          const units = h.units === null ? null : Math.round((h.units + (h.units * amount) / h.value) * 10) / 10;
          return { ...h, value: h.value + amount, units, meta: units === null ? h.meta : `${units} units · ${h.kind}` };
        }),
      };
    }
  }
}
