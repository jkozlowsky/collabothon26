import { between, createRng, pick, time, type Rng } from '@/lib/bank/seed';
import type { BankIconName, BankState, DepotSeries, Transaction } from '@/types/bank';

export const ELENA_SEED = 1845;

const MAIN = 'Main account';
const DEBIT = 'Card •• 7102';

type Merchant = { title: string; category: string; icon: BankIconName; min: number; max: number; source: string };

const MERCHANTS: readonly Merchant[] = [
  { title: 'Supermarket', category: 'Groceries', icon: 'cart', min: 1200, max: 4800, source: DEBIT },
  { title: 'Bäckerei Hoffmann', category: 'Groceries', icon: 'cart', min: 250, max: 850, source: DEBIT },
  { title: 'Apotheke am Markt', category: 'Health', icon: 'heart', min: 650, max: 3500, source: DEBIT },
  { title: 'Café am Park', category: 'Eating out', icon: 'coffee', min: 380, max: 1200, source: DEBIT },
  { title: 'Buchhandlung Thalia', category: 'Shopping', icon: 'gift', min: 890, max: 2400, source: DEBIT },
];

const RECENT: Transaction[] = [
  { id: 't-e1', title: 'Pension', category: 'Income', icon: 'briefcase', daysAgo: 0, time: '07:00', amount: 138000, source: MAIN, status: 'booked' },
  { id: 't-e2', title: 'Apotheke am Markt', category: 'Health', icon: 'heart', daysAgo: 1, time: '10:15', amount: -3450, source: DEBIT, status: 'booked' },
  { id: 't-e3', title: 'Supermarket', category: 'Groceries', icon: 'cart', daysAgo: 2, time: '11:30', amount: -5820, source: DEBIT, status: 'booked' },
  { id: 't-e4', title: 'Transfer to Sofia', category: 'Transfer', icon: 'gift', daysAgo: 3, time: '15:00', amount: -2500, source: MAIN, status: 'booked' },
];

function history(rng: Rng): Transaction[] {
  const rows: Transaction[] = [];
  for (let i = 0; i < 26; i++) {
    const m = pick(rng, MERCHANTS);
    rows.push({
      id: `h-e-${i}`,
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
    { id: 'h-e-rent', title: 'Apartment rent', category: 'Housing', icon: 'home', daysAgo: 19, time: '06:00', amount: -62000, source: MAIN, status: 'booked' },
    { id: 'h-e-util', title: 'Electricity & heating', category: 'Utilities', icon: 'zap', daysAgo: 6, time: '06:00', amount: -11500, source: MAIN, status: 'booked' },
    { id: 'h-e-pension-prev', title: 'Pension', category: 'Income', icon: 'briefcase', daysAgo: 30, time: '07:00', amount: 138000, source: MAIN, status: 'booked' },
  );
  return rows.sort((a, b) => a.daysAgo - b.daysAgo || b.time.localeCompare(a.time));
}

const ZERO_SERIES: DepotSeries = {
  '1W': { points: [0, 0, 0, 0, 0, 0, 0], change: 0 },
  '1M': { points: Array(30).fill(0), change: 0 },
  '1Y': { points: Array(52).fill(0), change: 0 },
  Max: { points: Array(60).fill(0), change: 0 },
};

export function seedElena(seed: number = ELENA_SEED): BankState {
  const rng = createRng(seed);

  return {
    owner: { name: 'Elena Petrova', initials: 'EP' },
    account: {
      name: 'Main account',
      iban: 'DE56 3704 0044 0872 1945 63',
      balance: 215000,
      monthIn: 138000,
      monthOut: 125000,
    },
    cards: [
      { id: 'debit', brand: 'Commerzbank', kind: 'Debit', last4: '7102', holder: 'ELENA PETROVA', expiry: '05/28', variant: 'dark' },
    ],
    transactions: [...RECENT, ...history(rng)],
    standingOrders: [
      { id: 'so-savings', title: 'Monthly savings', icon: 'safe', amount: -4000, interval: 'Monthly · on the 1st', next: 'Next: 1 Dec', recipient: 'Savings account' },
      { id: 'so-rent', title: 'Apartment rent', icon: 'home', amount: -62000, interval: 'Monthly · on the 1st', next: 'Next: 1 Dec', recipient: 'Landlord' },
      { id: 'so-power', title: 'Electricity & heating', icon: 'zap', amount: -11500, interval: 'Monthly · on the 15th', next: 'Next: 15 Dec', recipient: 'Stadtwerke' },
    ],
    pending: [],
    contacts: [
      { id: 'mikhail', name: 'Mikhail (Grandson)', initials: 'MP', iban: 'DE18 1005 0000 0123 4567 89', tone: 'teal' },
      { id: 'sofia', name: 'Sofia (Granddaughter)', initials: 'SP', iban: 'DE29 2005 0000 9876 5432 10', tone: 'rose' },
      { id: 'weber', name: 'Frau Weber (Neighbour)', initials: 'HW', iban: 'DE35 1007 0000 5544 3322 11', tone: 'orange' },
    ],
    loan: { remaining: 0, paidInstalments: 0, totalInstalments: 0, nextPayment: 0, nextDate: '—', apr: 0 },
    creditCard: { limit: 0, used: 0 },
    creditProducts: [],
    savings: { balance: 1860000, rate: 0.25, interestYtd: 3875 },
    holdings: [],
    depotSeries: ZERO_SERIES,
  };
}
