/**
 * Mock banking data shown by the bank shell. All money is in integer euro cents.
 * Frontend only: in the real product this comes from the host banking app.
 */

/** Semantic icon names; `components/bank/Icon.tsx` maps them to glyphs. */
export type BankIconName =
  | 'home'
  | 'edit'
  | 'refresh'
  | 'transfer'
  | 'percent'
  | 'trending'
  | 'globe'
  | 'card'
  | 'book'
  | 'user'
  | 'scan'
  | 'bell'
  | 'plus'
  | 'more'
  | 'eye'
  | 'eye-off'
  | 'search'
  | 'calendar'
  | 'cart'
  | 'briefcase'
  | 'play'
  | 'safe'
  | 'zap'
  | 'phone'
  | 'pie'
  | 'leaf'
  | 'bond'
  | 'cash'
  | 'coffee'
  | 'fuel'
  | 'train'
  | 'heart'
  | 'gift'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'check'
  | 'delete'
  | 'lock'
  | 'swords'
  | 'trophy'
  | 'bot'
  | 'users'
  | 'target'
  | 'timer'
  | 'brain'
  | 'wifi-off'
  | 'coins'
  | 'flame'
  | 'refresh'
  | 'arrow-right'
  | 'film'
  | 'volume-on'
  | 'volume-off'
  | 'transcript'
  | 'watch'
  | 'play-fill'
  | 'pause'
  | 'replay';

export type Account = {
  name: string;
  /** Full IBAN, grouped by 4 with spaces. */
  iban: string;
  balance: number;
  monthIn: number;
  monthOut: number;
};

export type PaymentCard = {
  id: string;
  brand: string;
  kind: 'Debit' | 'Credit';
  last4: string;
  holder: string;
  expiry: string;
  variant: 'dark' | 'accent';
};

export type TransactionStatus = 'booked' | 'pending';

export type Transaction = {
  id: string;
  title: string;
  category: string;
  icon: BankIconName;
  /** Days before "today"; 0 = today. Relative so the demo always reads "Today" / "Yesterday". */
  daysAgo: number;
  /** Local time "HH:MM". */
  time: string;
  /** Signed: negative = money out. */
  amount: number;
  /** "Main account" or "Card •• 4821". */
  source: string;
  status: TransactionStatus;
};

export type StandingOrder = {
  id: string;
  title: string;
  icon: BankIconName;
  amount: number;
  interval: string;
  next: string;
  recipient: string;
};

export type PendingPayment = {
  id: string;
  title: string;
  icon: BankIconName;
  meta: string;
  amount: number;
  when: string;
};

export type Contact = {
  id: string;
  name: string;
  initials: string;
  iban: string;
  /** Theme colour key for the avatar. */
  tone: 'rose' | 'violet' | 'teal' | 'orange' | 'slate';
};

export type InstalmentLoan = {
  remaining: number;
  paidInstalments: number;
  totalInstalments: number;
  nextPayment: number;
  nextDate: string;
  /** Annual percentage rate, e.g. 5.9. */
  apr: number;
};

export type CreditProduct = {
  id: string;
  title: string;
  icon: BankIconName;
  meta: string;
  amount: number;
  amountNote: string;
  details: { label: string; value: string }[];
};

export type SavingsAccount = {
  balance: number;
  rate: number;
  interestYtd: number;
};

export type AssetClass = 'etfs' | 'stocks' | 'bonds' | 'cash';

/** `world`: spread over many countries. `europe`: European countries only. */
export type HoldingRegion = 'world' | 'europe';

export type Holding = {
  id: string;
  name: string;
  icon: BankIconName;
  /** "12.4 units · ETF" style line. */
  meta: string;
  kind: string;
  assetClass: AssetClass;
  isin: string;
  value: number;
  /** 1Y change in percent, shown under the value. */
  change: number;
  /** Where the holding invests; none for depot cash. Lessons use it for "how spread is your depot". */
  region?: HoldingRegion;
  units: number | null;
};

export type ChartRange = '1W' | '1M' | '1Y' | 'Max';

export type DepotSeries = Record<ChartRange, { points: number[]; change: number }>;

export type FqTeaserPlacement = 'home' | 'credits' | 'invest';

/** A Atlas card shown inside the bank. `focus` tells the Map what to open. */
export type FqTeaser = {
  title: string;
  meta: string;
  progress: number;
  focus: string;
};

export type BankState = {
  owner: { name: string; initials: string };
  account: Account;
  cards: PaymentCard[];
  transactions: Transaction[];
  standingOrders: StandingOrder[];
  pending: PendingPayment[];
  contacts: Contact[];
  loan: InstalmentLoan;
  creditProducts: CreditProduct[];
  creditCard: { limit: number; used: number };
  savings: SavingsAccount;
  holdings: Holding[];
  depotSeries: DepotSeries;
  teasers: Record<FqTeaserPlacement, FqTeaser>;
};

export type TransferRecipient = { contactId: string } | { name: string; iban: string };

export type TransferInput = {
  recipient: TransferRecipient;
  amount: number;
  reference: string;
};

export type OrderInput = {
  holdingId: string;
  amount: number;
};

/** Content of the read-only detail sheet (transaction, card, holding, credit product…). */
export type Detail = {
  title: string;
  subtitle: string;
  icon: BankIconName;
  amount?: string;
  amountTone?: 'default' | 'positive' | 'negative';
  rows: { label: string; value: string }[];
  /** Optional educational line, e.g. what APR means. */
  note?: string;
};
