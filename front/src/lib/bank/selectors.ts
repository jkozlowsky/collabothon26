/**
 * Read-only views of the bank state. Lessons use these for "A u Ciebie?" moments
 * ("X% of your savings sit in one place"), so keep them pure and cheap.
 */
import type { AssetClass, BankState, ChartRange, HoldingRegion } from '@/types/bank';

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  etfs: 'ETFs',
  stocks: 'Stocks',
  bonds: 'Bonds',
  cash: 'Cash',
};

export const mainBalance = (s: BankState) => s.account.balance;

export const depotTotal = (s: BankState) => s.holdings.reduce((sum, h) => sum + h.value, 0);

/** Investable positions, without the depot's cash. */
export const positionCount = (s: BankState) => s.holdings.filter((h) => h.assetClass !== 'cash').length;

/** Share of each asset class in the depot, in percent, rounded to whole numbers. Order is fixed. */
export function allocation(s: BankState): { assetClass: AssetClass; share: number }[] {
  const total = depotTotal(s);
  return (Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).map((assetClass) => {
    const value = s.holdings.filter((h) => h.assetClass === assetClass).reduce((sum, h) => sum + h.value, 0);
    return { assetClass, share: total ? Math.round((value / total) * 100) : 0 };
  });
}

/** Biggest single position as a share of the depot (0–1), with its name. */
export function largestPosition(s: BankState): { name: string; share: number } {
  const total = depotTotal(s);
  const top = s.holdings.filter((h) => h.assetClass !== 'cash').reduce((a, b) => (b.value > a.value ? b : a));
  return { name: top.name, share: total ? top.value / total : 0 };
}

/** Savings account as a share of everything the user owns here (main account + savings + depot), 0–1. */
export function savingsShare(s: BankState): number {
  const total = s.account.balance + s.savings.balance + depotTotal(s);
  return total ? s.savings.balance / total : 0;
}

/** Everything the user still owes: loan + card balance + used overdraft + open "Pay in 3". */
export function totalCreditOutstanding(s: BankState): number {
  const overdraft = s.creditProducts.find((p) => p.id === 'overdraft')?.amount ?? 0;
  const payIn3 = s.creditProducts.find((p) => p.id === 'pay-in-3')?.amount ?? 0;
  return s.loan.remaining + s.creditCard.used + overdraft + payIn3;
}

/** Chart points for a range, rescaled so the last point is today's depot value (it moves after orders). */
export function depotChart(s: BankState, range: ChartRange): { points: number[]; change: number } {
  const { points, change } = s.depotSeries[range];
  const scale = depotTotal(s) / points[points.length - 1];
  return { points: points.map((p) => p * scale), change };
}

/** Everything the user holds here: main account + savings + depot. */
export const totalAssets = (s: BankState) => s.account.balance + s.savings.balance + depotTotal(s);

/** Which of account, savings and depot holds the most, and its share of `totalAssets` (0–1). */
export function largestPlace(s: BankState): { place: 'account' | 'savings' | 'depot'; share: number } {
  const total = totalAssets(s);
  const places = [
    { place: 'account' as const, value: s.account.balance },
    { place: 'savings' as const, value: s.savings.balance },
    { place: 'depot' as const, value: depotTotal(s) },
  ];
  const top = places.reduce((a, b) => (b.value > a.value ? b : a));
  return { place: top.place, share: total ? top.value / total : 0 };
}

/** Share of the depot (0–1) invested in a region. */
export function regionShare(s: BankState, region: HoldingRegion): number {
  const total = depotTotal(s);
  const value = s.holdings.filter((h) => h.region === region).reduce((sum, h) => sum + h.value, 0);
  return total ? value / total : 0;
}

/** Region holding the biggest share of the depot, or null when nothing is invested. */
export function largestRegion(s: BankState): { region: HoldingRegion; share: number } | null {
  const regions: HoldingRegion[] = ['world', 'europe'];
  const top = regions.map((region) => ({ region, share: regionShare(s, region) })).reduce((a, b) => (b.share > a.share ? b : a));
  return top.share > 0 ? top : null;
}

/** What goes into the depot every month by standing order (savings plans), in cents. */
export const monthlyInvesting = (s: BankState) =>
  s.standingOrders.filter((o) => o.recipient.startsWith('Depot')).reduce((sum, o) => sum - o.amount, 0);
