import { useEffect, useState } from 'react';
import { Circle, Line } from 'react-native-svg';

import type { LineEndpoints } from '@/components/duel/questions/matchGeometry';

type Props = LineEndpoints & {
  color: string;
  reducedMotion: boolean;
};

const DRAW_MS = 200;
const STROKE_WIDTH = 3;
const END_DOT_RADIUS = 3.5;

/** The line between two paired tiles, drawn from the left tile to the right one when the pair is made. */
export function MatchPairLine({ x1, y1, x2, y2, color, reducedMotion }: Props) {
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const startTime = Date.now();

    const animate = () => {
      const p = Math.min(1, (Date.now() - startTime) / DRAW_MS);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const tipX = x1 + (x2 - x1) * progress;
  const tipY = y1 + (y2 - y1) * progress;

  return (
    <>
      <Line x1={x1} y1={y1} x2={tipX} y2={tipY} stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx={x1} cy={y1} r={END_DOT_RADIUS} fill={color} />
      <Circle cx={tipX} cy={tipY} r={END_DOT_RADIUS} fill={color} />
    </>
  );
}
