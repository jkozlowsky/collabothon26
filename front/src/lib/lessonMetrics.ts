/**
 * Named numbers from the mock bank for lesson text. Lesson text says "{largestPlaceShare}"; the value comes
 * from the user's own (mock) accounts, here in the frontend, so the backend never sees bank data.
 * Keep the names in sync with TEXT_METRICS in back/.../lesson/LessonRules.java.
 */
import {
  depotTotal,
  largestPlace,
  largestPosition,
  largestRegion,
  monthlyInvesting,
  regionShare,
  savingsShare,
  totalAssets,
} from '@/lib/bank/selectors';
import type { BankState, HoldingRegion } from '@/types/bank';
import type { Step } from '@/types/lessons';

type Money = (cents: number, opts?: { whole?: boolean }) => string;

const PLACE_NAME = { account: 'your current account', savings: 'your savings account', depot: 'your depot' } as const;
const REGION_NAME: Record<HoldingRegion, string> = { world: 'funds spread across the world', europe: 'Europe only' };

const percent = (share: number) => `${Math.round(share * 100)}%`;
const invested = (s: BankState) => s.holdings.some((h) => h.assetClass !== 'cash');

/** Amounts in cents, usable as a rule's `appliesTo`. */
export const AMOUNTS: Record<string, (s: BankState) => number> = {
  savingsBalance: (s) => s.savings.balance,
  totalAssets,
  depotTotal,
  monthlySpending: (s) => s.account.monthOut,
  monthlyIncome: (s) => s.account.monthIn,
};

/**
 * Plain numbers for sliders that start from the user's own data (`fromBank` on a slider param):
 * percents as whole numbers, euros as whole euros. Null when there is no data.
 */
const NUMBERS: Record<string, (s: BankState) => number | null> = {
  worldShare: (s) => (invested(s) ? Math.round(regionShare(s, 'world') * 100) : null),
  europeShare: (s) => (invested(s) ? Math.round(regionShare(s, 'europe') * 100) : null),
  largestPositionShare: (s) => (invested(s) ? Math.round(largestPosition(s).share * 100) : null),
  monthlyInvesting: (s) => (monthlyInvesting(s) ? Math.round(monthlyInvesting(s) / 100) : null),
  savingsBalance: (s) => Math.round(s.savings.balance / 100),
  savingsRate: (s) => s.savings.rate,
};

/** Inflation assumed in "your situation" facts: the ECB's target, so the numbers stay neutral, not a forecast. */
const ASSUMED_INFLATION = 2;

/** Income minus spending last month, in cents; null without income. */
const leftover = (s: BankState) => (s.account.monthIn ? s.account.monthIn - s.account.monthOut : null);

/** Months of spending the savings account covers, rounded down. */
const bufferMonths = (s: BankState) => (s.account.monthOut ? Math.floor(s.savings.balance / s.account.monthOut) : null);

const METRICS: Record<string, (s: BankState, money: Money) => string | null> = {
  savingsBalance: (s, money) => money(s.savings.balance, { whole: true }),
  totalAssets: (s, money) => (totalAssets(s) ? money(totalAssets(s), { whole: true }) : null),
  largestPlaceShare: (s) => (totalAssets(s) ? percent(largestPlace(s).share) : null),
  largestPlaceName: (s) => (totalAssets(s) ? PLACE_NAME[largestPlace(s).place] : null),
  largestPositionShare: (s) => (invested(s) ? percent(largestPosition(s).share) : null),
  depotTotal: (s, money) => (depotTotal(s) ? money(depotTotal(s), { whole: true }) : null),
  monthlySpending: (s, money) => (s.account.monthOut ? money(s.account.monthOut, { whole: true }) : null),
  monthlyIncome: (s, money) => (s.account.monthIn ? money(s.account.monthIn, { whole: true }) : null),
  monthlyLeftover: (s, money) => { const l = leftover(s); return l === null ? null : money(l, { whole: true }); },
  leftoverShare: (s) => { const l = leftover(s); return l === null ? null : percent(l / s.account.monthIn); },
  accountBalance: (s, money) => money(s.account.balance, { whole: true }),
  accountInflationCost: (s, money) => (s.account.balance > 0 ? money(Math.round((s.account.balance * ASSUMED_INFLATION) / 100), { whole: true }) : null),
  realRate: (s) => {
    const r = Math.round((s.savings.rate - ASSUMED_INFLATION) * 100) / 100;
    return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}%`;
  },
  savingsReal3y: (s, money) =>
    money(Math.round(s.savings.balance * ((1 + s.savings.rate / 100) / (1 + ASSUMED_INFLATION / 100)) ** 3), { whole: true }),
  bufferMonths: (s) => { const m = bufferMonths(s); return m === null ? null : String(m); },
  savingsRate: (s) => `${s.savings.rate}%`,
  savingsShareOfAssets: (s) => (totalAssets(s) ? percent(savingsShare(s)) : null),
  depotAfterFall: (s, money) => (depotTotal(s) ? money(Math.round(depotTotal(s) * 0.8), { whole: true }) : null),
  monthlyInvesting: (s, money) => (monthlyInvesting(s) ? money(monthlyInvesting(s), { whole: true }) : null),
  worldShare: (s) => (invested(s) ? percent(regionShare(s, 'world')) : null),
  europeShare: (s) => (invested(s) ? percent(regionShare(s, 'europe')) : null),
  largestRegionShare: (s) => { const r = largestRegion(s); return r ? percent(r.share) : null; },
  largestRegionName: (s) => { const r = largestRegion(s); return r ? REGION_NAME[r.region] : null; },
};

/**
 * Words used when a metric has no data, so ordinary lesson text still reads well ("{depotTotal} invested"
 * → "your investments invested" would not; write text that works both ways). `action` steps don't use these:
 * they switch to `bodyNoData` instead.
 */
const FALLBACK: Record<string, string> = {
  savingsBalance: 'your savings',
  totalAssets: 'everything you own here',
  largestPlaceShare: 'most',
  largestPlaceName: 'one place',
  largestPositionShare: 'a big part',
  depotTotal: 'your investments',
  monthlySpending: 'your monthly costs',
  monthlyIncome: 'your income',
  monthlyLeftover: 'what is left',
  leftoverShare: 'part',
  accountBalance: 'your current account',
  accountInflationCost: 'some',
  realRate: 'about zero',
  savingsReal3y: 'a little less',
  bufferMonths: 'a few',
  savingsRate: 'its rate',
  savingsShareOfAssets: 'part',
  depotAfterFall: 'less',
  monthlyInvesting: 'a monthly amount',
  worldShare: 'part',
  europeShare: 'part',
  largestRegionShare: 'a big part',
  largestRegionName: 'one region',
};

const METRIC = /\{(\w+)\}/g;

/** Fills every {metric} in `text`; null when one is unknown or has no data, so the caller falls back. */
export function fillMetrics(text: string, state: BankState, money: Money): string | null {
  let missing = false;
  const filled = text.replace(METRIC, (_, name: string) => {
    const value = METRICS[name]?.(state, money) ?? null;
    if (value === null) missing = true;
    return value ?? '';
  });
  return missing ? null : filled;
}

/** Fills {metric} in `text`, using the fallback words for metrics without data. Unknown names stay as they are. */
export function fillMetricsOrFallback(text: string, state: BankState, money: Money): string {
  return text.replace(METRIC, (whole, name: string) => METRICS[name]?.(state, money) ?? FALLBACK[name] ?? whole);
}

function fillDeep<T>(value: T, fill: (text: string) => string): T {
  if (typeof value === 'string') return fill(value) as T;
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, fill)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillDeep(item, fill)])) as T;
  }
  return value;
}

/**
 * The step with the user's numbers in every text field, and sliders marked `fromBank` starting at the user's value. `action` steps are returned as they are: ActionStep
 * fills them itself and shows `bodyNoData` when data is missing. Steps without "{" are returned unchanged.
 */
export function personalizeStep<S extends Step>(step: S, state: BankState, money: Money): S {
  if (step.type === 'action') return step;
  let out = JSON.stringify(step).includes('{') ? fillDeep(step, (text) => fillMetricsOrFallback(text, state, money)) : step;
  if (out.type === 'slider-chart' && Object.values(out.params).some((p) => p.fromBank)) {
    const params = Object.fromEntries(
      Object.entries(out.params).map(([key, p]) => {
        const mine = p.fromBank ? NUMBERS[p.fromBank]?.(state) ?? null : null;
        if (mine === null) return [key, p];
        const snapped = Math.round(mine / p.step) * p.step;
        return [key, { ...p, value: Math.min(p.max, Math.max(p.min, snapped)) }];
      }),
    );
    out = { ...out, params };
  }
  return out;
}
