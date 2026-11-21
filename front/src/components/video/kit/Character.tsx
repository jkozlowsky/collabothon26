import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { CANVAS } from '@/components/video/kit/canvas';
import { useLoop } from '@/components/video/kit/useLoop';
import { scenePalette } from '@/constants/theme';

type Props = {
  pose: 'sit' | 'stand' | 'phone';
  /** Horizontal centre, 0–1 of the canvas. */
  x: number;
  color: string;
  ambient: boolean;
};

const WIDTH = 80;

/** A faceless flat silhouette in the story colour: round head, soft body. `phone` holds a lit phone. Breathes. */
export const Character = memo(function Character({ pose, x, color, ambient }: Props) {
  const breath = useLoop(ambient, 4000);
  const breathing = useAnimatedStyle(() => ({ transform: [{ scaleY: interpolate(breath.get(), [0, 1], [1, 1.015]) }] }));
  const sitting = pose === 'sit';
  const height = sitting ? 120 : 160;
  // Seated characters sit behind the desk line; standing ones stand on the floor.
  const bottom = sitting ? CANVAS.desk + 30 : CANVAS.floor;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.box, { left: x * CANVAS.width - WIDTH / 2, top: bottom - height, height }, breathing]}
    >
      <Svg width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Circle cx={40} cy={18} r={14} fill={color} />
        {sitting ? (
          <Path d="M17 42 Q40 30 63 42 L66 120 L14 120 Z" fill={color} />
        ) : (
          <>
            <Path d="M18 42 Q40 30 62 42 L66 108 Q40 114 14 108 Z" fill={color} />
            <Rect x={22} y={104} width={15} height={56} rx={6} fill={color} />
            <Rect x={43} y={104} width={15} height={56} rx={6} fill={color} />
          </>
        )}
        {pose === 'phone' && (
          <>
            <Line x1={58} y1={48} x2={66} y2={74} stroke={color} strokeWidth={9} strokeLinecap="round" />
            <Line x1={66} y1={74} x2={54} y2={40} stroke={color} strokeWidth={8} strokeLinecap="round" />
            <Circle cx={52} cy={32} r={12} fill={scenePalette.phoneLight} opacity={0.25} />
            <Rect x={46} y={22} width={11} height={18} rx={2} fill={scenePalette.phoneLight} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: { position: 'absolute', width: WIDTH, transformOrigin: 'bottom' },
});
