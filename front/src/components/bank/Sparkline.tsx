import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = { points: number[]; height?: number };

const PAD = 6;

/** Smoothed line through the points (Catmull-Rom → cubic Bézier), so the chart reads calm, not jagged. */
function smoothPath(xy: [number, number][]): string {
  let d = `M ${xy[0][0]} ${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [p0, p1, p2, p3] = [xy[i - 1] ?? xy[i], xy[i], xy[i + 1], xy[i + 2] ?? xy[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Depot chart: petrol line, yellow fade under it, yellow dot on today's value. */
export function Sparkline({ points, height = 64 }: Props) {
  const [width, setWidth] = useState(0);
  const gradientId = `spark-${useId().replace(/:/g, '')}`;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy: [number, number][] = points.map((p, i) => [
    PAD + (i / (points.length - 1)) * (width - PAD * 2),
    PAD + (1 - (p - min) / span) * (height - PAD * 2),
  ]);
  const line = width ? smoothPath(xy) : '';
  const last = xy[xy.length - 1];

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brandAccent} stopOpacity={0.45} />
              <Stop offset="1" stopColor={colors.brandAccent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L ${last[0]} ${height} L ${xy[0][0]} ${height} Z`} fill={`url(#${gradientId})`} />
          <Path d={line} stroke={colors.brandPrimary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={last[0]} cy={last[1]} r={4.5} fill={colors.brandAccent} stroke={colors.brandPrimary} strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
