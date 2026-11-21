import { amountUntil, captionAt, formatAmount, formatClock, layerProgress, resolveScene, type ResolvedAmount } from '@/lib/sceneClock';
import type { Scene } from '@/types/lessons';

const captions = [
  { at: 0.5, text: 'One' },
  { at: 4, text: 'Two' },
  { at: 8, text: 'Three' },
];

test('captionAt: before the first, between, after the last', () => {
  expect(captionAt(captions, 0)).toBe(-1);
  expect(captionAt(captions, 0.5)).toBe(0);
  expect(captionAt(captions, 5)).toBe(1);
  expect(captionAt(captions, 30)).toBe(2);
});

test('layerProgress clamps to 0–1 and switches on at `at` without a length', () => {
  expect(layerProgress(0, 1, 2)).toBe(0);
  expect(layerProgress(2, 1, 2)).toBe(0.5);
  expect(layerProgress(9, 1, 2)).toBe(1);
  expect(layerProgress(0.9, 1)).toBe(0);
  expect(layerProgress(1, 1)).toBe(1);
});

const base: Scene = {
  type: 'scene',
  id: 'v4',
  title: 'June',
  desc: 'Base',
  duration: 10,
  camera: 'push',
  setting: { place: 'home', time: 'night' },
  layers: [{ kind: 'amount', at: 0.5, len: 2, metric: 'savingsBalance', label: 'Your savings', fallback: { to: 10_000_000, currency: 'KRW', label: "Ji-woo's savings" } }],
  captions: [{ at: 0.5, text: 'This is your savings account today.' }, { at: 4, text: 'Two' }],
  noData: { captions: [{ at: 0.5, text: "Ji-woo's savings today." }, { at: 4, text: 'Two' }] },
};

test('resolveScene fills the metric from the bank, rolling up from 0', () => {
  const scene = resolveScene(base, {}, () => ({ value: 12_450, currency: 'EUR' }));
  expect(scene.usedFallback).toBe(false);
  expect(scene.layers[0]).toMatchObject({ kind: 'amount', from: 0, to: 12_450, currency: 'EUR', label: 'Your savings' });
  expect(scene.captions[0].text).toBe('This is your savings account today.');
  expect('metric' in scene.layers[0]).toBe(false);
});

test('resolveScene applies noData and the fallback when the metric has no data', () => {
  const scene = resolveScene(base, {}, () => null);
  expect(scene.usedFallback).toBe(true);
  expect(scene.layers[0]).toMatchObject({ to: 10_000_000, currency: 'KRW', label: "Ji-woo's savings" });
  expect(scene.captions[0].text).toBe("Ji-woo's savings today.");
});

test('resolveScene picks the byChoice override for the user’s scenario choice', () => {
  const scene: Scene = {
    ...base,
    layers: [{ kind: 'tag', at: 1, text: 'Base', tone: 'neutral', x: 0.5, y: 0.5 }],
    noData: undefined,
    byChoice: {
      step: 'sc1',
      '0': { desc: 'All in', layers: [{ kind: 'tag', at: 1, text: 'In debt', tone: 'bad', x: 0.5, y: 0.5 }] },
      '1': { desc: 'Only 1M' },
    },
  };
  expect(resolveScene(scene, { sc1: 0 }, () => null)).toMatchObject({ desc: 'All in', layers: [{ text: 'In debt' }] });
  expect(resolveScene(scene, { sc1: 1 }, () => null)).toMatchObject({ desc: 'Only 1M', layers: [{ text: 'Base' }] });
  // No override for the choice (or no choice yet): the base scene.
  expect(resolveScene(scene, { sc1: 2 }, () => null).desc).toBe('Base');
  expect(resolveScene(scene, {}, () => null).desc).toBe('Base');
});

test('amounts hand over to the next one; money and time format like the lessons', () => {
  const layers = [
    { kind: 'amount', at: 1, len: 3, to: 14, currency: 'KRW' },
    { kind: 'tag', at: 3, text: 'x', tone: 'good', x: 0, y: 0 },
    { kind: 'amount', at: 6, len: 3, to: 8, currency: 'KRW' },
  ] as ResolvedAmount[];
  expect(amountUntil(layers, 0, 12)).toBe(6);
  expect(amountUntil(layers, 2, 12)).toBe(12);
  expect(formatAmount(14_000_000, 'KRW')).toBe('₩14,000,000');
  expect(formatAmount(-4_000_000, 'KRW')).toBe('−₩4,000,000');
  expect(formatAmount(6800.4, 'EUR')).toBe('€6,800');
  expect(formatClock(7.2)).toBe('0:08');
  expect(formatClock(0)).toBe('0:00');
});
