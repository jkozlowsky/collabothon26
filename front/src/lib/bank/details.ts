/** Builds the DetailSheet content for each kind of bank item. Pure, so screens stay thin. */
import { formatPercent } from '@/lib/bank/money';
import type { CreditProduct, Detail, Holding, InstalmentLoan, PaymentCard, SavingsAccount, StandingOrder, Transaction } from '@/types/bank';

type Money = (cents: number, opts?: { signed?: boolean }) => string;

export function dayLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
}

export function transactionDetail(t: Transaction, money: Money): Detail {
  return {
    title: t.title,
    subtitle: `${dayLabel(t.daysAgo)} · ${t.time}`,
    icon: t.icon,
    amount: money(t.amount, { signed: true }),
    amountTone: t.amount > 0 ? 'positive' : 'default',
    rows: [
      { label: 'Category', value: t.category },
      { label: 'Paid with', value: t.source },
      { label: 'Status', value: t.status === 'pending' ? 'Processing' : 'Booked' },
    ],
  };
}

export function cardDetail(c: PaymentCard, limit: { limit: number; used: number }, money: Money): Detail {
  const rows = [
    { label: 'Number', value: `•••• •••• •••• ${c.last4}` },
    { label: 'Holder', value: c.holder },
    { label: 'Valid until', value: c.expiry },
  ];
  if (c.kind === 'Credit') rows.push({ label: 'Limit', value: `${money(limit.used)} used of ${money(limit.limit)}` });
  else rows.push({ label: 'Linked to', value: 'Main account' });
  return { title: `${c.brand} ${c.kind}`, subtitle: 'Card details', icon: 'card', rows };
}

export function holdingDetail(h: Holding, money: Money): Detail {
  const rows = [
    { label: 'Type', value: h.kind },
    { label: 'Change · 1Y', value: formatPercent(h.change) },
  ];
  if (h.units !== null) rows.unshift({ label: 'Units', value: String(h.units) });
  if (h.isin !== '—') rows.push({ label: 'ISIN', value: h.isin });
  return {
    title: h.name,
    subtitle: h.meta,
    icon: h.icon,
    amount: money(h.value),
    rows,
    note: 'Past performance does not tell you how a position will do next. Prices can fall as well as rise.',
  };
}

export function creditProductDetail(p: CreditProduct, money: Money): Detail {
  return { title: p.title, subtitle: p.meta, icon: p.icon, amount: money(p.amount), rows: [{ label: 'Shown amount', value: p.amountNote }, ...p.details] };
}

export function loanDetail(l: InstalmentLoan, money: Money): Detail {
  return {
    title: 'Instalment loan',
    subtitle: `${l.paidInstalments} of ${l.totalInstalments} instalments paid`,
    icon: 'percent',
    amount: money(l.remaining),
    rows: [
      { label: 'Next payment', value: `${money(l.nextPayment)} · ${l.nextDate}` },
      { label: 'Instalments left', value: String(l.totalInstalments - l.paidInstalments) },
      { label: 'Interest rate', value: `${l.apr}% APR` },
    ],
    note: 'APR is the yearly cost of the loan, interest and fees included. It lets you compare loans of the same size and length.',
  };
}

export function savingsDetail(s: SavingsAccount, money: Money): Detail {
  return {
    title: 'Savings account',
    subtitle: `${s.rate}% p.a. · daily access`,
    icon: 'safe',
    amount: money(s.balance),
    rows: [
      { label: 'Interest this year', value: money(s.interestYtd, { signed: true }) },
      { label: 'Interest rate', value: `${s.rate}% p.a.` },
      { label: 'Access', value: 'Any day, no notice' },
    ],
  };
}

export function standingOrderDetail(o: StandingOrder, money: Money): Detail {
  return {
    title: o.title,
    subtitle: o.interval,
    icon: o.icon,
    amount: money(o.amount, { signed: true }),
    rows: [
      { label: 'To', value: o.recipient },
      { label: 'Next run', value: o.next.replace('Next: ', '') },
      { label: 'From', value: 'Main account' },
    ],
  };
}

