/**
 * Pure helpers for lesson video scenes (.plans/lesson-video-mode-spec.md §4, §7.1). The functions marked
 * 'worklet' run on the UI thread, inside animated styles and reactions driven by the scene clock `t`.
 */
import type { Scene, SceneCaption, SceneLayer, SceneOverride } from '@/types/lessons';

/** Index of the caption on screen at `t` (the last one that started), or -1 before the first. */
export function captionAt(captions: readonly SceneCaption[], t: number): number {
  'worklet';
  let index = -1;
  for (let i = 0; i < captions.length; i++) {
    if (captions[i].at <= t) index = i;
  }
  return index;
}

/** 0–1 progress of a timed element at `t`, clamped. Without `len` it switches on at `at`. */
export function layerProgress(t: number, at = 0, len = 0): number {
  'worklet';
  if (len <= 0) return t >= at ? 1 : 0;
  return Math.min(1, Math.max(0, (t - at) / len));
}

/** A number the device knows for a metric (the user's own, from the mock bank), or null when there is no data. */
export type MetricValue = { value: number; currency: string } | null;

export type AmountLayer = Extract<SceneLayer, { kind: 'amount' }>;

/** An amount ready to draw: the metric filled in, or replaced by its fallback. */
export type ResolvedAmount = Omit<AmountLayer, 'metric' | 'fallback' | 'to' | 'currency'> & { to: number; currency: string };

export type ResolvedLayer = Exclude<SceneLayer, AmountLayer> | ResolvedAmount;

export type ResolvedScene = Omit<Scene, 'byChoice' | 'noData' | 'layers'> & {
  layers: ResolvedLayer[];
  /** True when a metric had no data and the scene switched to its `noData` version. */
  usedFallback: boolean;
};

const withOverride = (scene: Scene, override: SceneOverride | undefined): Scene => (override ? { ...scene, ...override } : scene);

/**
 * The scene as it plays for this user: the `byChoice` override for their scenario choice, the metric amount
 * filled from the bank (the counter rolls up from 0), and the `noData` version when the metric has no data.
 */
export function resolveScene(scene: Scene, choices: Record<string, number>, metric: (name: string) => MetricValue): ResolvedScene {
  let base = scene;
  if (scene.byChoice) {
    const choice = choices[scene.byChoice.step];
    if (choice !== undefined) base = withOverride(base, scene.byChoice[`${choice}`]);
  }

  const missing = base.layers.some((l) => l.kind === 'amount' && !!l.metric && !metric(l.metric));
  const { byChoice, noData, ...fields } = missing ? withOverride(base, scene.noData) : base;

  const layers = fields.layers.map((layer): ResolvedLayer => {
    if (layer.kind !== 'amount') return layer;
    const { metric: name, fallback, ...rest } = layer;
    if (!name) return { ...rest, to: layer.to ?? 0, currency: layer.currency ?? '' };
    const value = metric(name);
    if (value) return { ...rest, from: 0, to: value.value, currency: value.currency };
    return { ...rest, from: 0, to: fallback?.to ?? 0, currency: fallback?.currency ?? '', label: fallback?.label ?? rest.label };
  });
  return { ...fields, layers, usedFallback: missing };
}

/** Seconds an amount stays on screen: until the next amount starts, else to the end. */
export function amountUntil(layers: readonly ResolvedLayer[], index: number, length: number): number {
  const startOf = (layer: ResolvedLayer) => (layer.kind === 'amount' ? (layer.at ?? 0) : 0);
  const at = startOf(layers[index]);
  const later = layers.filter((l, i) => i !== index && l.kind === 'amount').map(startOf);
  return Math.min(length, ...later.filter((start) => start > at));
}

const SYMBOLS: Record<string, string> = { KRW: '₩', EUR: '€', BRL: 'R$', JPY: '¥', USD: '$' };
const MINUS = '−';

/** "₩14,000,000", "−₩4,000,000", "€6,800": whole units, like the lessons write them. */
export function formatAmount(value: number, currency: string): string {
  const whole = Math.round(Math.abs(value));
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 && whole > 0 ? MINUS : ''}${SYMBOLS[currency] ?? `${currency} `}${grouped}`;
}

/** "0:07": time left in the scene. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
