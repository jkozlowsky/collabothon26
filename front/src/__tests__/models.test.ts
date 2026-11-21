import {
  chainReturns,
  concentratedChange,
  countryMixChange,
  formatValue,
  hiddenYearlyRate,
  leveragedReturn,
  MODELS,
  realValueChange,
  requiredGainToRecover,
  sweep,
} from '@/lib/models';

test('a −50% loss needs +100% to recover', () => {
  expect(requiredGainToRecover(-50)).toBe(100);
});

test('+40% then −40% ends at −16%', () => {
  expect(chainReturns(40, -40)).toBe(-16);
});

test('with as much borrowed as owned, a −50% move wipes out your own money', () => {
  expect(leveragedReturn(-50, 100)).toBe(-100);
});

test('one company with 15% of the money falling 60% costs 9% in total', () => {
  expect(concentratedChange(15, -60)).toBe(-9);
  expect(MODELS.oneCompanyCrash.y({ share: 15 })).toBe(-9);
});

test('sweep walks the x param over its range', () => {
  const points = sweep('leverage', { move: { label: 'm', min: -10, max: 10, step: 10, value: 0 } }, { move: 0, borrowed: 100 });
  expect(points).toEqual([
    { x: -10, y: -20 },
    { x: 0, y: 0 },
    { x: 10, y: 20 },
  ]);
});

test('formatValue puts currency symbols in front and the sign first', () => {
  expect(formatValue(100, '%', { signed: true })).toBe('+100%');
  expect(formatValue(-16, '%')).toBe('−16%');
  expect(formatValue(-4, '₩M')).toBe('−₩4M');
  expect(formatValue(1000, 'R$')).toBe('R$1,000');
  expect(formatValue(13.1, '€k')).toBe('€13.1k');
  expect(formatValue(3, ' months')).toBe('3 months');
});

test('0.5% interest against 3% inflation loses about 22% of buying power in 10 years', () => {
  expect(realValueChange(10, 0.5, 3)).toBe(-21.8);
  expect(realValueChange(10, 3, 3)).toBe(0);
  expect(MODELS.realValue.y({ years: 10, interest: 0.5, inflation: 3 })).toBe(-21.8);
});

test('"12 payments, no interest" with 15% off for cash hides about 36% a year', () => {
  expect(hiddenYearlyRate(15, 12)).toBeCloseTo(36, 0);
  expect(hiddenYearlyRate(0, 12)).toBe(0);
  expect(hiddenYearlyRate(5, 12)).toBeLessThanOrEqual(10);
  expect(hiddenYearlyRate(6, 12)).toBeGreaterThan(10);
});

test('15% at home falling 40% and the rest falling 10% is −14.5% in total', () => {
  expect(countryMixChange(15, -40, -10)).toBe(-14.5);
  expect(MODELS.countryMix.y({ homeShare: 100, homeMove: -40, worldMove: -10 })).toBe(-40);
});
