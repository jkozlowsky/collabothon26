import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** A number that runs from `from` to `to` over `ms`, eased out; jumps straight to `to` under reduced motion. */
export function useCountUp(to: number, { from = 0, ms = 900, delay = 0 }: { from?: number; ms?: number; delay?: number } = {}) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      setValue(from + (to - from) * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, from, ms, delay, reduceMotion]);

  return reduceMotion ? to : value;
}

/** The one number inside a display string ("€ 12,500", "+41%", "34 years"); null when it has none or several. */
export function parseDisplayNumber(text: string) {
  const matches = [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)];
  if (matches.length !== 1) return null;
  const [raw] = matches[0];
  const index = matches[0].index ?? 0;
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  return { prefix: text.slice(0, index), value: Number(raw.replace(/,/g, '')), decimals, suffix: text.slice(index + raw.length) };
}

/** Formats `value` like the number it replaces: same decimals, thousands separators. */
export function formatLike(value: number, decimals: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
