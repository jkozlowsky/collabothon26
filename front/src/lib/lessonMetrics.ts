/**
 * Named numbers from the mock bank for "Your turn" steps. Lesson text says "{largestPlaceShare}"; the value
 * comes from the user's own (mock) accounts, here in the frontend, so the backend never sees bank data.
 */
import { largestPlace, largestPosition, totalAssets } from '@/lib/bank/selectors';
import type { BankState } from '@/types/bank';

type Money = (cents: number, opts?: { whole?: boolean }) => string;

const PLACE_NAME = { account: 'your current account', savings: 'your savings account', depot: 'your depot' } as const;

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** Amounts in cents, usable as a rule's `appliesTo`. */
export const AMOUNTS: Record<string, (s: BankState) => number> = {
  savingsBalance: (s) => s.savings.balance,
  totalAssets,
};

const METRICS: Record<string, (s: BankState, money: Money) => string | null> = {
  savingsBalance: (s, money) => money(s.savings.balance, { whole: true }),
  totalAssets: (s, money) => (totalAssets(s) ? money(totalAssets(s), { whole: true }) : null),
  largestPlaceShare: (s) => (totalAssets(s) ? percent(largestPlace(s).share) : null),
  largestPlaceName: (s) => (totalAssets(s) ? PLACE_NAME[largestPlace(s).place] : null),
  largestPositionShare: (s) => (s.holdings.some((h) => h.assetClass !== 'cash') ? percent(largestPosition(s).share) : null),
};

/** Fills every {metric} in `text`; null when one is unknown or has no data, so the caller falls back. */
export function fillMetrics(text: string, state: BankState, money: Money): string | null {
  let missing = false;
  const filled = text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = METRICS[name]?.(state, money) ?? null;
    if (value === null) missing = true;
    return value ?? '';
  });
  return missing ? null : filled;
}
