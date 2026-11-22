import { Confetti } from '@/components/fx/Confetti';
import { Fireworks, type BurstSpec } from '@/components/fx/Fireworks';
import { FxLayer } from '@/components/fx/FxLayer';

/** Four bursts at staggered spots in the navy header, 0–1.2 s (the last pops before 1.5 s). */
const HEADER_BURSTS: BurstSpec[] = [
  { x: 0.22, y: 0.3, delayMs: 0 },
  { x: 0.78, y: 0.24, delayMs: 380 },
  { x: 0.5, y: 0.14, delayMs: 760 },
  { x: 0.3, y: 0.62, delayMs: 1200 },
];

/** Fireworks and the two confetti cannons, over the navy header. Counts stay well under the 140-piece budget. */
export function HeaderFx() {
  return (
    <FxLayer>
      {({ width, height }) => (
        <>
          <Fireworks width={width} height={height} bursts={HEADER_BURSTS} sparks={18} testID="result-fireworks" />
          <Confetti width={width} height={height} mode="cannons" count={44} delayMs={500} />
        </>
      )}
    </FxLayer>
  );
}

/** The confetti shower over the whole screen after the cannons, about 2.5 s of falling pieces. */
export function ScreenShower() {
  return (
    <FxLayer>
      {({ width, height }) => <Confetti width={width} height={height} mode="shower" count={56} delayMs={1000} spreadMs={1200} testID="result-confetti" />}
    </FxLayer>
  );
}

/** The second wave when the last bar finishes: a pop from the middle, cannons again and a few more falling pieces. */
export function Finale({ at }: { at: { x: number; y: number } }) {
  return (
    <FxLayer>
      {({ width, height }) => (
        <>
          <Confetti width={width} height={height} mode="pop" count={36} at={at} testID="result-finale" />
          <Confetti width={width} height={height} mode="cannons" count={24} delayMs={150} />
          <Confetti width={width} height={height} mode="shower" count={20} delayMs={300} spreadMs={800} />
        </>
      )}
    </FxLayer>
  );
}
