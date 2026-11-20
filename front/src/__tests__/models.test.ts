import {
  chainReturns,
  concentratedChange,
  formatValue,
  leveragedReturn,
  MODELS,
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
});
