import { between, createRng, depotSeries, pick, time, type Rng } from '@/lib/bank/seed';
import type { BankIconName, BankState, Holding, Transaction } from '@/types/bank';

export const DANIEL_SEED = 7392;

const MAIN = 'Main account';
const DEBIT = 'Card •• 6214';
const CREDIT = 'Card •• 8103';

type Merchant = { title: string; category: string; icon: BankIconName; min: number; max: number; source: string };

const MERCHANTS: readonly Merchant[] = [
  { title: 'Supermarket', category: 'Groceries', icon: 'cart', min: 1500, max: 9500, source: DEBIT },
  { title: 'Bakery', category: 'Groceries', icon: 'cart', min: 350, max: 1400, source: DEBIT },
  { title: 'Espresso Bar', category: 'Eating out', icon: 'coffee', min: 450, max: 1800, source: DEBIT },
  { title: 'Bistro & Lounge', category: 'Eating out', icon: 'coffee', min: 2200, max: 6800, source: CREDIT },
  { title: 'Petrol station', category: 'Transport', icon: 'fuel', min: 4500, max: 8900, source: CREDIT },
  { title: 'Deutsche Bahn', category: 'Transport', icon: 'train', min: 3400, max: 12900, source: CREDIT },
  { title: 'Design Books & Supplies', category: 'Shopping', icon: 'gift', min: 1500, max: 7500, source: DEBIT },
  { title: 'Hardware Store', category: 'Shopping', icon: 'cart', min: 2500, max: 14500, source: DEBIT },
];

/** Client invoices in the current month totaling €5,800. */
const INVOICES: Transaction[] = [
  { id: 't-d1', title: 'Invoice · Fintech App UI', category: 'Income', icon: 'briefcase', daysAgo: 3, time: '14:20', amount: 185000, source: MAIN, status: 'booked' },
  { id: 't-d2', title: 'Invoice · Brand Identity', category: 'Income', icon: 'briefcase', daysAgo: 11, time: '11:05', amount: 220000, source: MAIN, status: 'booked' },
  { id: 't-d3', title: 'Invoice · Design System', category: 'Income', icon: 'briefcase', daysAgo: 22, time: '16:45', amount: 175000, source: MAIN, status: 'booked' },
];

function history(rng: Rng): Transaction[] {
  const rows: Transaction[] = [];
  for (let i = 0; i < 30; i++) {
    const m = pick(rng, MERCHANTS);
    rows.push({
      id: `h-d-${i}`,
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
  rows.push(
    { id: 'h-d-rent', title: 'Studio rent', category: 'Housing', icon: 'home', daysAgo: 19, time: '06:00', amount: -145000, source: MAIN, status: 'booked' },
    { id: 'h-d-cowork', title: 'Co-working desk', category: 'Subscriptions', icon: 'briefcase', daysAgo: 18, time: '06:00', amount: -35000, source: MAIN, status: 'booked' },
    { id: 'h-d-cloud', title: 'Cloud & software tools', category: 'Subscriptions', icon: 'play', daysAgo: 8, time: '09:00', amount: -8900, source: CREDIT, status: 'booked' },
    { id: 'h-d-car', title: 'Car loan instalment', category: 'Credits', icon: 'percent', daysAgo: 20, time: '06:00', amount: -22000, source: MAIN, status: 'booked' },
  );
  return rows.sort((a, b) => a.daysAgo - b.daysAgo || b.time.localeCompare(a.time));
}

const HOLDINGS: Holding[] = [
  {
    id: 'novatech',
    name: 'NovaTech Inc.',
    icon: 'trending',
    meta: '140 units · Stock',
    kind: 'Stock',
    assetClass: 'stocks',
    isin: 'US66989V1098',
    value: 994000,
    change: 14.2,
    units: 140,
    region: 'world',
  },
  {
    id: 'cash',
    name: 'Cash',
    icon: 'cash',
    meta: 'Settlement account',
    kind: 'Cash',
    assetClass: 'cash',
    isin: '—',
    value: 426000,
    change: 0,
    units: null,
  },
];

export function seedDaniel(seed: number = DANIEL_SEED): BankState {
  const rng = createRng(seed);
  const holdings = HOLDINGS.map((h) => ({ ...h }));
  const depotTotal = holdings.reduce((sum, h) => sum + h.value, 0);

  return {
    owner: { name: 'Daniel Okafor', initials: 'DO' },
    account: {
      name: 'Main account',
      iban: 'DE42 3704 0044 0591 8234 10',
      balance: 2140000,
      monthIn: 580000,
      monthOut: 390000,
    },
    cards: [
      { id: 'debit', brand: 'Commerzbank', kind: 'Debit', last4: '6214', holder: 'DANIEL OKAFOR', expiry: '09/28', variant: 'dark' },
      { id: 'credit', brand: 'Commerzbank', kind: 'Credit', last4: '8103', holder: 'DANIEL OKAFOR', expiry: '11/27', variant: 'accent' },
    ],
    transactions: [...INVOICES, ...history(rng)],
    standingOrders: [
      { id: 'so-rent', title: 'Studio rent', icon: 'home', amount: -145000, interval: 'Monthly · on the 1st', next: 'Next: 1 Dec', recipient: 'Landlord' },
      { id: 'so-coworking', title: 'Co-working membership', icon: 'briefcase', amount: -35000, interval: 'Monthly · on the 1st', next: 'Next: 1 Dec', recipient: 'Betahaus Co-working' },
    ],
    pending: [
      { id: 'p-figma', title: 'Design software', icon: 'play', meta: 'Card reservation', amount: -4500, when: 'Card •• 8103' },
    ],
    contacts: [
      { id: 'apex', name: 'Apex Studio (Client)', initials: 'AS', iban: 'DE22 1001 0010 3214 5678 90', tone: 'teal' },
      { id: 'betahaus', name: 'Betahaus Berlin', initials: 'BB', iban: 'DE33 2004 0000 1234 5678 00', tone: 'orange' },
      { id: 'sarah', name: 'Sarah Miller', initials: 'SM', iban: 'DE44 5001 0517 9876 5432 10', tone: 'rose' },
    ],
    loan: { remaining: 960000, paidInstalments: 20, totalInstalments: 48, nextPayment: 22000, nextDate: '1 Dec', apr: 4.9 },
    creditCard: { limit: 500000, used: 0 },
    creditProducts: [
      {
        id: 'credit-card',
        title: 'Credit card limit',
        icon: 'card',
        meta: '€ 0 used of € 5,000',
        amount: 500000,
        amountNote: 'available',
        details: [
          { label: 'Limit', value: '€ 5,000.00' },
          { label: 'Used', value: '€ 0.00' },
          { label: 'Statement', value: 'On the 25th' },
          { label: 'Card', value: 'Credit •• 8103' },
        ],
      },
      {
        id: 'overdraft',
        title: 'Overdraft',
        icon: 'percent',
        meta: '€ 2,000 arranged · 11.9% p.a.',
        amount: 0,
        amountNote: 'used',
        details: [
          { label: 'Arranged', value: '€ 2,000.00' },
          { label: 'Used', value: '€ 0.00' },
          { label: 'Interest', value: '11.9% p.a. on what you use' },
        ],
      },
    ],
    savings: { balance: 300000, rate: 0.5, interestYtd: 1250 },
    holdings,
    depotSeries: depotSeries(rng, depotTotal),
  };
}
