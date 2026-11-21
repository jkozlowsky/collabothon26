/**
 * Products the mock bank lets you open or apply for. The buttons look real and open the product's start
 * sheet; the application itself is not part of the prototype. Atlas offers point at these buttons.
 */
import type { BankIconName } from '@/types/bank';

export type ProductTab = 'home' | 'payments' | 'credits' | 'invest';

export type ProductId =
  | 'etf-plan'
  | 'buy-fund'
  | 'price-alert'
  | 'demo-depot'
  | 'gold'
  | 'fixed-term'
  | 'instant-savings'
  | 'standing-order'
  | 'instalment-loan'
  | 'card-full-repay'
  | 'refinance';

export type BankProduct = {
  id: ProductId;
  icon: BankIconName;
  title: string;
  meta: string;
  /** Label of the row's button: "Apply", "Open", "Start". */
  cta: string;
  tab: ProductTab;
  /** Terms shown on the start sheet. */
  terms: { label: string; value: string }[];
  /** What the next screens would ask, shown on the start sheet. */
  steps: string;
};

export const PRODUCTS: Record<ProductId, BankProduct> = {
  'etf-plan': {
    id: 'etf-plan',
    icon: 'refresh',
    title: 'ETF savings plan',
    meta: 'From € 25 a month · pause any time',
    cta: 'Start',
    tab: 'invest',
    terms: [
      { label: 'Amount', value: 'From € 25 a month' },
      { label: 'Day', value: '1st or 15th of the month' },
      { label: 'Order fee', value: '1.5% of each instalment' },
      { label: 'Change or pause', value: 'Any time, free' },
    ],
    steps: 'Next: choose a fund or ETF yourself, read its key information, set the amount and the day.',
  },
  'buy-fund': {
    id: 'buy-fund',
    icon: 'cart',
    title: 'Buy a fund or ETF',
    meta: 'Whole range · costs shown before you order',
    cta: 'Buy',
    tab: 'invest',
    terms: [
      { label: 'Range', value: '2,400 funds and ETFs' },
      { label: 'Order fee', value: '€ 4.90 + 0.25%' },
      { label: 'Paid from', value: 'Depot cash' },
    ],
    steps: 'Next: search the range, read the key information document (KID) and the costs, then place the order.',
  },
  'price-alert': {
    id: 'price-alert',
    icon: 'bell',
    title: 'Price alert',
    meta: 'A message when a price crosses your line',
    cta: 'Set',
    tab: 'invest',
    terms: [
      { label: 'Alerts', value: 'Up to 20' },
      { label: 'Sent by', value: 'Push message' },
      { label: 'Cost', value: 'Free' },
    ],
    steps: 'Next: pick a position and the price at which you want to hear about it.',
  },
  'demo-depot': {
    id: 'demo-depot',
    icon: 'play',
    title: 'Demo depot',
    meta: 'Practise with € 10,000 of play money',
    cta: 'Open',
    tab: 'invest',
    terms: [
      { label: 'Play money', value: '€ 10,000' },
      { label: 'Prices', value: 'Real, 15 min delayed' },
      { label: 'Cost', value: 'Free' },
    ],
    steps: 'Next: name the demo depot and place practice orders. No real money moves.',
  },
  gold: {
    id: 'gold',
    icon: 'coins',
    title: 'Gold',
    meta: 'Gold ETCs in the depot · no interest',
    cta: 'Buy',
    tab: 'invest',
    terms: [
      { label: 'Form', value: 'Exchange-traded gold (ETC), backed by bars' },
      { label: 'Order fee', value: '€ 4.90 + 0.25%' },
      { label: 'Interest', value: 'None: you gain only if the price rises' },
      { label: 'Price moves', value: '−40% from 2011 to 2015' },
    ],
    steps: 'Next: pick a gold product yourself, read its key information and the costs, then set the amount.',
  },
  'fixed-term': {
    id: 'fixed-term',
    icon: 'lock',
    title: 'Fixed-term deposit',
    meta: '6–24 months · fixed rate',
    cta: 'Open',
    tab: 'home',
    terms: [
      { label: '6 months', value: '2.6% a year' },
      { label: '12 months', value: '2.8% a year' },
      { label: '24 months', value: '2.5% a year' },
      { label: 'Minimum', value: '€ 1,000' },
      { label: 'Access before the end', value: 'Not possible' },
    ],
    steps: 'Next: choose the term and the amount, then confirm from which account it is paid.',
  },
  'instant-savings': {
    id: 'instant-savings',
    icon: 'safe',
    title: 'Instant-access savings',
    meta: '2.25% a year · access any day',
    cta: 'Open',
    tab: 'home',
    terms: [
      { label: 'Interest', value: '2.25% a year, variable' },
      { label: 'Access', value: 'Any day, free' },
      { label: 'Deposit protection', value: 'Up to € 100,000' },
    ],
    steps: 'Next: name the account and choose whether to move money in now.',
  },
  'standing-order': {
    id: 'standing-order',
    icon: 'calendar',
    title: 'New standing order',
    meta: 'A fixed amount on a fixed day',
    cta: 'Set up',
    tab: 'payments',
    terms: [
      { label: 'From', value: 'Main account' },
      { label: 'Interval', value: 'Weekly, monthly or yearly' },
      { label: 'Cost', value: 'Free' },
    ],
    steps: 'Next: choose the receiving account (for example your savings), the amount and the day.',
  },
  'instalment-loan': {
    id: 'instalment-loan',
    icon: 'cash',
    title: 'Instalment loan',
    meta: '€ 1,000–50,000 · fixed rate',
    cta: 'Apply',
    tab: 'credits',
    terms: [
      { label: 'Amount', value: '€ 1,000–50,000' },
      { label: 'Term', value: '12–84 months' },
      { label: 'APR', value: 'From 4.9%, depends on the check' },
      { label: 'Early repayment', value: 'Possible at any time' },
    ],
    steps: 'Next: amount and term, your income and costs, a credit check, then the offer with its total cost.',
  },
  'card-full-repay': {
    id: 'card-full-repay',
    icon: 'card',
    title: 'Pay the card bill in full',
    meta: 'Direct debit of the whole bill',
    cta: 'Set up',
    tab: 'credits',
    terms: [
      { label: 'Card', value: 'Credit •• 9034' },
      { label: 'Debited', value: 'Whole bill, on the 28th' },
      { label: 'Card interest', value: 'None when paid in full' },
    ],
    steps: 'Next: confirm the account the bill is paid from.',
  },
  refinance: {
    id: 'refinance',
    icon: 'transfer',
    title: 'Refinance a loan',
    meta: 'Move a loan to new terms',
    cta: 'Check',
    tab: 'credits',
    terms: [
      { label: 'Loans', value: 'From us or another bank' },
      { label: 'Shown', value: 'Old and new total cost side by side' },
    ],
    steps: 'Next: choose the loan, see the new terms and compare the total cost.',
  },
};

export const productsIn = (tab: ProductTab) => Object.values(PRODUCTS).filter((p) => p.tab === tab);
