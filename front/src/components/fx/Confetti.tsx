import { useMemo } from 'react';

import { ParticleField } from '@/components/fx/ParticleField';
import { cannonParticles, popParticles, showerParticles } from '@/lib/fx/particles';

type Props = {
  width: number;
  height: number;
  /** cannons: both bottom corners fire up and inwards; shower: pieces fall over the width; pop: a small burst at (x, y). */
  mode: 'cannons' | 'shower' | 'pop';
  count?: number;
  delayMs?: number;
  /** Shower only: how long new pieces keep starting. */
  spreadMs?: number;
  /** Pop only: centre, as a fraction of the layer. */
  at?: { x: number; y: number };
  palette?: string[];
  clip?: boolean;
  testID?: string;
};

/** Confetti in three shapes. Reduced motion and tests draw nothing (ParticleField). */
export function Confetti({ width, height, mode, count = 30, delayMs = 0, spreadMs = 1500, at, palette, clip, testID }: Props) {
  const particles = useMemo(() => {
    if (mode === 'cannons') {
      const each = Math.round(count / 2);
      return [
        ...cannonParticles(0, height, 'left', each, delayMs),
        ...cannonParticles(width, height, 'right', each, delayMs),
      ];
    }
    if (mode === 'shower') return showerParticles(width, count, delayMs, spreadMs);
    return popParticles((at?.x ?? 0.5) * width, (at?.y ?? 0.5) * height, count, delayMs, palette);
  }, [mode, width, height, count, delayMs, spreadMs, at?.x, at?.y, palette]);

  return <ParticleField particles={particles} clip={clip} testID={testID} />;
}
