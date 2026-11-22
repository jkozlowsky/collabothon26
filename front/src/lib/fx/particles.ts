import { colors } from '@/constants/theme';

/** One piece of a celebration. Units: px, seconds, degrees; `delay` and `life` are in ms. */
export type Particle = {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** Gravity, px/s². */
  g: number;
  /** Air drag: the launch speed fades out like exp(-drag·t). */
  drag: number;
  /** Rotation, deg/s. */
  spin: number;
  /** Confetti flutter: the piece flips about its own axis at this rate (rad/s); 0 = flat. */
  flip: number;
  /** Side-to-side sway of falling confetti: amplitude px, frequency rad/s. */
  sway: number;
  swayHz: number;
  size: number;
  shape: 'rect' | 'circle' | 'ring';
  color: string;
  delay: number;
  life: number;
  /** Scale at birth and at death. */
  s0: number;
  s1: number;
};

/** The confetti palette: yellow, green, the story colours and white. */
export const CONFETTI_PALETTE = [
  colors.brandAccent,
  colors.feedbackSuccess,
  colors.storyTeal,
  colors.storyOrange,
  colors.storyRose,
  colors.storyViolet,
  '#FFFFFF',
];

/** Gold sparks and coins for the XP count-up. */
export const COIN_PALETTE = [colors.brandAccent, colors.feedbackXp, colors.brandAccentSoft, '#FFFFFF'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[], i: number) => list[i % list.length];

const base: Particle = {
  x0: 0, y0: 0, vx: 0, vy: 0, g: 0, drag: 0.0001, spin: 0, flip: 0, sway: 0, swayHz: 0,
  size: 8, shape: 'rect', color: '#FFFFFF', delay: 0, life: 1000, s0: 1, s1: 1,
};

/** A firework: a quick flash ring plus `count` sparks flying out radially, pulled down by gravity. */
export function fireworkParticles(cx: number, cy: number, delay: number, count: number, palette: string[]): Particle[] {
  const sparks: Particle[] = [];
  const offset = Math.random() * Math.PI;
  for (let i = 0; i < count; i++) {
    const angle = offset + (i / count) * Math.PI * 2 + rand(-0.12, 0.12);
    const speed = rand(150, 270);
    sparks.push({
      ...base,
      x0: cx, y0: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      g: 260, drag: 1.9,
      size: rand(4, 7), shape: 'circle',
      color: pick(palette, i),
      delay, life: rand(950, 1250), s0: 1, s1: 0.35,
    });
  }
  sparks.push({ ...base, x0: cx, y0: cy, size: 56, shape: 'ring', color: pick(palette, 0), delay, life: 380, s0: 0.2, s1: 1.5 });
  return sparks;
}

/** A confetti cannon in a corner: pieces shoot up and inwards, then flutter down. */
export function cannonParticles(x: number, y: number, side: 'left' | 'right', count: number, delay: number): Particle[] {
  const dir = side === 'left' ? 1 : -1;
  return Array.from({ length: count }, (_, i) => {
    const angle = (rand(48, 78) * Math.PI) / 180;
    const speed = rand(520, 900);
    return {
      ...base,
      x0: x, y0: y,
      vx: Math.cos(angle) * speed * dir, vy: -Math.sin(angle) * speed,
      g: 760, drag: 1.5,
      spin: rand(-540, 540), flip: rand(6, 12),
      size: rand(7, 12), shape: i % 4 === 0 ? 'circle' : 'rect',
      color: pick(CONFETTI_PALETTE, i + (side === 'left' ? 0 : 3)),
      delay: delay + rand(0, 160), life: rand(1500, 2000), s0: 1, s1: 1,
    };
  });
}

/** Confetti falling over the whole width, starting over `spreadMs`. */
export function showerParticles(width: number, count: number, delay: number, spreadMs: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    x0: rand(0, width), y0: rand(-30, -10),
    vx: rand(-20, 20), vy: rand(150, 260),
    g: 40, drag: 0.15,
    spin: rand(-360, 360), flip: rand(5, 11),
    sway: rand(8, 22), swayHz: rand(2, 4.5),
    size: rand(7, 12), shape: i % 5 === 0 ? 'circle' : 'rect',
    color: pick(CONFETTI_PALETTE, i),
    delay: delay + (i / count) * spreadMs + rand(0, 140), life: rand(2000, 2800), s0: 1, s1: 1,
  }));
}

/** A small confetti pop at one point (the finale after the last bar fills). */
export function popParticles(cx: number, cy: number, count: number, delay: number, palette = CONFETTI_PALETTE): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(180, 420);
    return {
      ...base,
      x0: cx, y0: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 120,
      g: 620, drag: 1.7,
      spin: rand(-540, 540), flip: rand(6, 12),
      size: rand(6, 10), shape: i % 3 === 0 ? 'circle' : 'rect',
      color: pick(palette, i),
      delay: delay + rand(0, 80), life: rand(1000, 1400), s0: 1, s1: 1,
    };
  });
}

/** Total time (ms) until the last particle is gone. */
export function endOf(particles: Particle[]): number {
  return particles.reduce((end, p) => Math.max(end, p.delay + p.life), 0);
}
