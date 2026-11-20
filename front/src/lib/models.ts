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

type Values = Record<string, number>;

/** Each model plots its output against one of its params (`x`) and computes the output from all params. */
export const MODELS: Record<SliderModel, { x: string; y: (v: Values) => number }> = {
  drawdownRecovery: { x: 'loss', y: (v) => requiredGainToRecover(v.loss) },
  leverage: { x: 'move', y: (v) => leveragedReturn(v.move, v.borrowed) },
  oneCompanyCrash: { x: 'share', y: (v) => concentratedChange(v.share, -60) },
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
 * A number with its unit: "+100%", "−16%", "₩10M", "−₩4M". A unit that starts with a currency symbol goes in
 * front of the number; the rest of it (e.g. "M") follows it.
 */
export function formatValue(value: number, unit = '', { signed = false }: { signed?: boolean } = {}): string {
  const sign = value < 0 ? MINUS : signed && value > 0 ? '+' : '';
  const abs = Math.abs(round1(value)).toLocaleString('en-US');
  const currency = /^[^\w%\s]/.test(unit) ? unit[0] : '';
  const suffix = currency ? unit.slice(1) : unit;
  return `${sign}${currency}${abs}${suffix}`;
}
