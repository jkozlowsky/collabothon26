import { formatEUR } from '@/lib/bank/money';
import { seedAccount } from '@/lib/bank/seed';
import { fillMetrics, personalizeStep } from '@/lib/lessonMetrics';
import type { ActionStep, SliderChartStep, TextStep } from '@/types/lessons';

const money = (cents: number, opts?: { whole?: boolean }) => formatEUR(cents, opts);
const bank = seedAccount();
const empty = { ...bank, holdings: [], standingOrders: [] };

test('depot metrics come from the seed: spread by region and the monthly savings plan', () => {
  expect(fillMetrics('{worldShare} world, {europeShare} Europe', bank, money)).toBe('64% world, 28% Europe');
  expect(fillMetrics('{largestRegionShare} in {largestRegionName}', bank, money)).toBe('64% in funds spread across the world');
  expect(fillMetrics('{monthlyInvesting}', bank, money)).toBe(money(10000, { whole: true }));
});

test('personalizeStep fills every text field, with fallback words when there is no data', () => {
  const step: TextStep = { type: 'text', id: 't1', title: 'Plan: {monthlyInvesting}', body: 'Invested: {depotTotal}' };
  expect(personalizeStep(step, bank, money)).toMatchObject({ title: `Plan: ${money(10000, { whole: true })}` });
  expect(personalizeStep(step, empty, money)).toMatchObject({ title: 'Plan: a monthly amount', body: 'Invested: your investments' });
});

test('personalizeStep leaves action steps to ActionStep, which falls back to bodyNoData', () => {
  const step: ActionStep = { type: 'action', id: 'a1', body: '{worldShare}', bodyNoData: 'none' };
  expect(personalizeStep(step, bank, money)).toBe(step);
});

test('sliders marked fromBank start at the user\'s own number, snapped to the step and clamped', () => {
  const step: SliderChartStep = {
    type: 'slider-chart', id: 's1', prompt: '{europeShare} in Europe', model: 'countryMix',
    params: {
      homeShare: { label: 'Europe', min: 0, max: 100, step: 5, value: 50, fromBank: 'europeShare' },
      homeMove: { label: 'Move', min: -60, max: 0, step: 5, value: -40 },
      worldMove: { label: 'World', min: -60, max: 0, step: 5, value: -10 },
    },
    output: { label: 'Change', unit: '%' },
    goal: { condition: { of: 'output', min: -100 }, hint: 'h' },
  };
  const mine = personalizeStep(step, bank, money);
  expect(mine.prompt).toBe('28% in Europe');
  expect(mine.params.homeShare.value).toBe(30);
  expect(personalizeStep(step, empty, money).params.homeShare.value).toBe(50);
});
