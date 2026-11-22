import { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { ParticleField } from '@/components/fx/ParticleField';
import { haptic, playSound } from '@/lib/duel/feedback';
import { CONFETTI_PALETTE, fireworkParticles } from '@/lib/fx/particles';

export type BurstSpec = {
  /** Position as a fraction of the layer (0..1). */
  x: number;
  y: number;
  delayMs: number;
};

type Props = {
  width: number;
  height: number;
  bursts: BurstSpec[];
  palette?: string[];
  /** Sparks per burst (16–24). */
  sparks?: number;
  /** One firework sound per burst, at most `bursts.length` times. */
  sound?: boolean;
  testID?: string;
};

/** Several radial firework bursts, each with its own pop. One ParticleField draws all of them. */
export function Fireworks({ width, height, bursts, palette = CONFETTI_PALETTE, sparks = 20, sound = true, testID }: Props) {
  const reduced = useReducedMotion();
  const particles = useMemo(
    () => bursts.flatMap((b) => fireworkParticles(b.x * width, b.y * height, b.delayMs, sparks, palette)),
    [bursts, width, height, sparks, palette]
  );

  useEffect(() => {
    if (reduced || !sound) return;
    const timers = bursts.map((b) =>
      setTimeout(() => {
        playSound('firework');
        haptic('light');
      }, b.delayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [bursts, reduced, sound]);

  return <ParticleField particles={particles} testID={testID} />;
}
