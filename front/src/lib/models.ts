/**
 * Pure maths behind the interactive lesson steps. Lesson JSON names a model; the numbers are computed here,
 * so content never carries code. Every model has a test in __tests__/models.test.ts.
 */
import type { SliderModel, SliderParam } from '@/types/lessons';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Gain in % needed to get back to the start after a loss in % (−50 → 100). */
export function requiredGainToRecover(lossPct: number): number {
  return round1((1 / (1 + lossPct / 100) - 1) * 100);
}

/** Total change in % after applying percentage moves one after another (+40, −40 → −16). */
export function chainReturns(...movesPct: number[]): number {
  return round1((movesPct.reduce((acc, m) => acc * (1 + m / 100), 1) - 1) * 100);
}

/** Result in % on your own money when part of the position is borrowed (move −50, borrowed 100% → −100). Interest ignored. */
export function leveragedReturn(movePct: number, borrowedPct: number): number {
  return round1(movePct * (1 + borrowedPct / 100));
}

/** Change of everything you own when one holding with `sharePct` of your money moves `movePct` and the rest stays flat. */
export function concentratedChange(sharePct: number, movePct: number): number {
  return round1((sharePct * movePct) / 100);
}

/** Change in buying power in % after `years` when savings earn `interestPct` and prices rise `inflationPct` a year. */
export function realValueChange(years: number, interestPct: number, inflationPct: number): number {
  return round1((((1 + interestPct / 100) / (1 + inflationPct / 100)) ** years - 1) * 100);
}

/**
 * Yearly interest hidden in "n payments, no interest" when paying at once would get `discountPct` off.
 * Solves price·(1 − d) = price/n · annuity(r, n) for the monthly rate r by bisection, then compounds it.
 */
export function hiddenYearlyRate(discountPct: number, months: number): number {
  const cash = 1 - discountPct / 100;
  const payment = 1 / months;
  const presentValue = (r: number) => (r === 0 ? payment * months : (payment * (1 - (1 + r) ** -months)) / r);
  if (discountPct <= 0 || months < 2) return 0;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (presentValue(mid) > cash) lo = mid;
    else hi = mid;
  }
  return round1(((1 + lo) ** 12 - 1) * 100);
}

/** Value in € after `years` of paying `monthly` € a month at `yearlyPct` a year, compounded monthly. */
export function monthlyPlanValue(monthly: number, years: number, yearlyPct: number): number {
  const r = yearlyPct / 100 / 12;
  const months = Math.round(years * 12);
  return Math.round(r === 0 ? monthly * months : (monthly * ((1 + r) ** months - 1)) / r);
}

/** Value in € of `start` € after `years` at `yearlyPct` a year, compounded yearly. */
export function compoundGrowth(start: number, years: number, yearlyPct: number): number {
  return Math.round(start * (1 + yearlyPct / 100) ** years);
}

/** Change in % in euros when `foreignSharePct` of the money is priced abroad and the euro moves `euroMovePct` against those currencies. */
export function currencyMoveChange(foreignSharePct: number, euroMovePct: number): number {
  return round1((foreignSharePct / 100) * (1 / (1 + euroMovePct / 100) - 1) * 100);
}

/** Total change in % when `homeSharePct` of the money moves `homeMovePct` and the rest moves `worldMovePct`. */
export function countryMixChange(homeSharePct: number, homeMovePct: number, worldMovePct: number): number {
  return round1((homeSharePct * homeMovePct + (100 - homeSharePct) * worldMovePct) / 100);
}

type Values = Record<string, number>;

/**
 * Each model plots its output against one of its params (`x`) and computes the output from all params.
 * Money models also say how much of the output is money paid in (`paidIn`), for the `split` visual.
 */
export const MODELS: Record<SliderModel, { x: string; y: (v: Values) => number; paidIn?: (v: Values) => number }> = {
  drawdownRecovery: { x: 'loss', y: (v) => requiredGainToRecover(v.loss) },
  leverage: { x: 'move', y: (v) => leveragedReturn(v.move, v.borrowed) },
  oneCompanyCrash: { x: 'share', y: (v) => concentratedChange(v.share, -60) },
  realValue: { x: 'years', y: (v) => realValueChange(v.years, v.interest, v.inflation) },
  installmentCost: { x: 'discount', y: (v) => hiddenYearlyRate(v.discount, v.months) },
  countryMix: { x: 'homeShare', y: (v) => countryMixChange(v.homeShare, v.homeMove, v.worldMove) },
  monthlyPlan: { x: 'years', y: (v) => monthlyPlanValue(v.monthly, v.years, v.rate), paidIn: (v) => Math.round(v.monthly * 12 * v.years) },
  currencyMove: { x: 'euroMove', y: (v) => currencyMoveChange(v.foreignShare, v.euroMove) },
  compoundGrowth: { x: 'years', y: (v) => compoundGrowth(v.start, v.years, v.rate), paidIn: (v) => v.start },
};

/** Output over the whole range of the model's x param, the other params held at their current values. */
export function sweep(model: SliderModel, params: Record<string, SliderParam>, values: Values): { x: number; y: number }[] {
  const { x, y } = MODELS[model];
  const { min, max, step } = params[x];
  const points: { x: number; y: number }[] = [];
  for (let i = 0; min + i * step <= max; i++) {
    const at = round1(min + i * step);
    points.push({ x: at, y: y({ ...values, [x]: at }) });
  }
  return points;
}

const MINUS = '−';

/**
 * A number with its unit: "+100%", "−16%", "₩10M", "−₩4M", "R$1,000". A unit that starts with a currency symbol (optionally after up to two capital letters, as in "R$") goes in
 * front of the number; the rest of it (e.g. "M") follows it.
 */
export function formatValue(value: number, unit = '', { signed = false }: { signed?: boolean } = {}): string {
  const sign = value < 0 ? MINUS : signed && value > 0 ? '+' : '';
  const abs = Math.abs(round1(value)).toLocaleString('en-US');
  const currency = /^[A-Z]{0,2}[^\w%\s]/.exec(unit)?.[0] ?? '';
  const suffix = unit.slice(currency.length);
  return `${sign}${currency}${abs}${suffix}`;
}
