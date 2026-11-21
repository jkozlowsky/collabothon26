/**
 * Deterministic mock bank data. Every number visible in the Figma bank frames (Home 11:452,
 * Payments 26:725, Credits 26:932, Invest 26:1128) is fixed here so the demo matches the design;
 * a seeded PRNG only fills what Figma does not show (older history, chart series).
 * One seed = one account, so more demo accounts later means more seeds.
 */
import type { BankIconName, BankState, ChartRange, DepotSeries, Holding, Transaction } from '@/types/bank';

export const DEFAULT_SEED = 4821;

/** mulberry32: tiny, fast, good enough for mock data, and the same output on every platform. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = ReturnType<typeof createRng>;

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const between = (rng: Rng, min: number, max: number) => Math.round(min + rng() * (max - min));
const time = (rng: Rng) => `${String(between(rng, 7, 21)).padStart(2, '0')}:${String(between(rng, 0, 59)).padStart(2, '0')}`;

const MAIN = 'Main account';
const DEBIT = 'Card •• 4821';
const CREDIT = 'Card •• 9034';

/** The four rows of "Recent activity" in Figma. */
const RECENT: Transaction[] = [
  { id: 't-1', title: 'Supermarket', category: 'Groceries', icon: 'cart', daysAgo: 0, time: '12:08', amount: -4218, source: DEBIT, status: 'booked' },
  { id: 't-2', title: 'Salary', category: 'Income', icon: 'briefcase', daysAgo: 0, time: '06:30', amount: 215000, source: MAIN, status: 'booked' },
  { id: 't-3', title: 'Streaming subscription', category: 'Subscriptions', icon: 'play', daysAgo: 1, time: '09:14', amount: -1399, source: CREDIT, status: 'booked' },
  { id: 't-4', title: 'Transfer to Anna', category: 'Transfer', icon: 'transfer', daysAgo: 1, time: '19:42', amount: -2500, source: MAIN, status: 'booked' },
];

type Merchant = { title: string; category: string; icon: BankIconName; min: number; max: number; source: string };

const MERCHANTS: readonly Merchant[] = [
  { title: 'Supermarket', category: 'Groceries', icon: 'cart', min: 1200, max: 8900, source: DEBIT },
  { title: 'Bakery', category: 'Groceries', icon: 'cart', min: 280, max: 1150, source: DEBIT },
  { title: 'Café Central', category: 'Eating out', icon: 'coffee', min: 340, max: 1680, source: DEBIT },
  { title: 'Pizzeria Roma', category: 'Eating out', icon: 'coffee', min: 1490, max: 4200, source: CREDIT },
  { title: 'Petrol station', category: 'Transport', icon: 'fuel', min: 3800, max: 7900, source: DEBIT },
  { title: 'Deutsche Bahn', category: 'Transport', icon: 'train', min: 1990, max: 8990, source: CREDIT },
  { title: 'Pharmacy', category: 'Health', icon: 'heart', min: 450, max: 3200, source: DEBIT },
  { title: 'Online store', category: 'Shopping', icon: 'cart', min: 1999, max: 12990, source: CREDIT },
  { title: 'Gift shop', category: 'Shopping', icon: 'gift', min: 990, max: 4500, source: DEBIT },
];

/** ~35 older rows over 60 days, plus the monthly fixed costs, newest first. */
function history(rng: Rng): Transaction[] {
  const rows: Transaction[] = [];
  for (let i = 0; i < 34; i++) {
    const m = pick(rng, MERCHANTS);
    rows.push({
      id: `h-${i}`,
      title: m.title,
      category: m.category,
      icon: m.icon,
      daysAgo: between(rng, 2, 60),
      time: time(rng),
      amount: -between(rng, m.min, m.max),
      source: m.source,
      status: 'booked',
    });
  }
  // Last month's fixed costs and salary, so "See all" reads like a real statement.
  rows.push(
    { id: 'h-rent', title: 'Rent', category: 'Housing', icon: 'home', daysAgo: 19, time: '06:00', amount: -85000, source: MAIN, status: 'booked' },
    { id: 'h-power', title: 'Electricity', category: 'Utilities', icon: 'zap', daysAgo: 5, time: '06:00', amount: -6400, source: MAIN, status: 'booked' },
    { id: 'h-etf', title: 'Savings plan ETF', category: 'Investing', icon: 'trending', daysAgo: 17, time: '06:00', amount: -10000, source: MAIN, status: 'booked' },
    { id: 'h-salary', title: 'Salary', category: 'Income', icon: 'briefcase', daysAgo: 30, time: '06:30', amount: 215000, source: MAIN, status: 'booked' },
  );
  return rows.sort((a, b) => a.daysAgo - b.daysAgo || b.time.localeCompare(a.time));
}

const RANGES: Record<ChartRange, { points: number; change: number; volatility: number }> = {
  '1W': { points: 7, change: 0.8, volatility: 0.003 },
  '1M': { points: 30, change: 1.9, volatility: 0.004 },
  '1Y': { points: 52, change: 3.2, volatility: 0.005 },
  Max: { points: 60, change: 18.4, volatility: 0.009 },
};

/** A noisy walk that starts at `end / (1 + change)` and lands exactly on `end` (a Brownian bridge). */
function series(rng: Rng, end: number, points: number, change: number, volatility: number): number[] {
  const start = end / (1 + change / 100);
  let walk = 0;
  const raw = [0];
  for (let i = 1; i < points; i++) {
    walk += (rng() - 0.5) * 2 * volatility * end;
    raw.push(walk);
  }
  const last = raw[points - 1];
  return raw.map((w, i) => {
    const t = i / (points - 1);
    return Math.round(start + (end - start) * t + (w - last * t));
  });
}

function depotSeries(rng: Rng, total: number): DepotSeries {
  const out = {} as DepotSeries;
  for (const key of Object.keys(RANGES) as ChartRange[]) {
    const r = RANGES[key];
    out[key] = { points: series(rng, total, r.points, r.change, r.volatility), change: r.change };
  }
  return out;
}

const HOLDINGS: Holding[] = [
  { id: 'world-etf', name: 'World Equity ETF', icon: 'globe', meta: '12.4 units · ETF', kind: 'ETF', assetClass: 'etfs', isin: 'IE00B4L5Y983', value: 381240, change: 8.1, units: 12.4, region: 'world' },
  // Figma's allocation counts these two as "Stocks 25%": single-company dividend and theme exposure.
  { id: 'europe-dividend', name: 'Europe Dividend ETF', icon: 'trending', meta: '20 units · ETF', kind: 'ETF', assetClass: 'stocks', isin: 'DE000A0H0744', value: 112080, change: 2.4, units: 20, region: 'europe' },
  { id: 'clean-energy', name: 'Clean Energy Fund', icon: 'leaf', meta: '8 units · Fund', kind: 'Fund', assetClass: 'stocks', isin: 'LU0405846410', value: 64250, change: -2.3, units: 8, region: 'world' },
  { id: 'gov-bond', name: 'Government Bond 2030', icon: 'bond', meta: '€ 800 nominal · Bond', kind: 'Bond', assetClass: 'bonds', isin: 'DE0001102507', value: 81200, change: 0.6, units: null, region: 'europe' },
  { id: 'cash', name: 'Cash', icon: 'cash', meta: 'Settlement account', kind: 'Cash', assetClass: 'cash', isin: '—', value: 55240, change: 0, units: null },
];

export function seedAccount(seed: number = DEFAULT_SEED): BankState {
  const rng = createRng(seed);
  const holdings = HOLDINGS.map((h) => ({ ...h }));
  const depotTotal = holdings.reduce((sum, h) => sum + h.value, 0);

  return {
    owner: { name: 'Alex Krause', initials: 'AK', age: 29 },
    account: {
      name: 'Main account',
      iban: 'DE89 3704 0044 0532 0148 21',
      balance: 428052,
      monthIn: 215000,
      monthOut: 126840,
    },
    cards: [
      { id: 'debit', brand: 'Commerzbank', kind: 'Debit', last4: '4821', holder: 'ALEX KRAUSE', expiry: '12/29', variant: 'dark' },
      { id: 'credit', brand: 'Commerzbank', kind: 'Credit', last4: '9034', holder: 'ALEX KRAUSE', expiry: '08/28', variant: 'accent' },
    ],
    transactions: [...RECENT, ...history(rng)],
    standingOrders: [
      { id: 'so-rent', title: 'Rent', icon: 'home', amount: -85000, interval: 'Monthly · on the 1st', next: 'Next: 1 Dec', recipient: 'Landlord' },
      { id: 'so-power', title: 'Electricity', icon: 'zap', amount: -6400, interval: 'Monthly · on the 15th', next: 'Next: 15 Dec', recipient: 'Stadtwerke' },
      { id: 'so-etf', title: 'Savings plan ETF', icon: 'trending', amount: -10000, interval: 'Monthly · on the 3rd', next: 'Next: 3 Dec', recipient: 'Depot · World Equity ETF' },
    ],
    pending: [
      { id: 'p-mark', title: 'Transfer to Mark', icon: 'transfer', meta: 'Processing · instant', amount: -6000, when: 'Today 16:42' },
      { id: 'p-store', title: 'Online store', icon: 'cart', meta: 'Card reservation', amount: -12990, when: 'Card •• 4821' },
    ],
    contacts: [
      { id: 'anna', name: 'Anna', initials: 'AS', iban: 'DE12 5001 0517 0648 4898 90', tone: 'rose' },
      { id: 'mark', name: 'Mark', initials: 'MW', iban: 'DE44 1001 1001 2620 0153 37', tone: 'violet' },
      { id: 'mom', name: 'Mom', initials: 'MK', iban: 'DE71 3702 0500 0008 3172 01', tone: 'teal' },
      { id: 'landlord', name: 'Landlord', initials: 'LH', iban: 'DE02 1203 0000 0000 2020 51', tone: 'orange' },
    ],
    loan: { remaining: 840000, paidInstalments: 31, totalInstalments: 48, nextPayment: 17500, nextDate: '1 Dec', apr: 5.9 },
    creditCard: { limit: 300000, used: 164000 },
    creditProducts: [
      {
        id: 'credit-card',
        title: 'Credit card limit',
        icon: 'card',
        meta: '€ 1,640 used of € 3,000',
        amount: 136000,
        amountNote: 'available',
        details: [
          { label: 'Limit', value: '€ 3,000.00' },
          { label: 'Used', value: '€ 1,640.00' },
          { label: 'Statement', value: 'On the 28th' },
          { label: 'Card', value: 'Credit •• 9034' },
        ],
      },
      {
        id: 'overdraft',
        title: 'Overdraft',
        icon: 'percent',
        meta: '€ 500 arranged · 11.9% p.a.',
        amount: 0,
        amountNote: 'used',
        details: [
          { label: 'Arranged', value: '€ 500.00' },
          { label: 'Used', value: '€ 0.00' },
          { label: 'Interest', value: '11.9% p.a. on what you use' },
        ],
      },
      {
        id: 'pay-in-3',
        title: 'Pay in 3',
        icon: 'calendar',
        meta: '2 purchases split',
        amount: 24000,
        amountNote: 'next: 5 Dec',
        details: [
          { label: 'Open purchases', value: '2' },
          { label: 'Next instalment', value: '€ 80.00 · 5 Dec' },
          { label: 'Interest', value: '0% if paid on time' },
        ],
      },
    ],
    savings: { balance: 1250000, rate: 2.25, interestYtd: 2340 },
    holdings,
    depotSeries: depotSeries(rng, depotTotal),
  };
}
