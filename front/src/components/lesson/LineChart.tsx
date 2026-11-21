import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { colors, radii, spacing, type } from '@/constants/theme';

type Point = { x: number; y: number };

export type ChartSeries = { points: Point[]; tone: 'primary' | 'muted' };

type Props = {
  series: ChartSeries[];
  /** Highlighted point, e.g. the current slider value. */
  marker?: Point;
  /** Horizontal guide lines (always includes y = 0 when it is in range). */
  guides?: { y: number; label?: string }[];
  /** Fixed axis ranges, so a line drawn bit by bit doesn't rescale the chart. */
  domain?: { x: [number, number]; y: [number, number] };
  formatY: (y: number) => string;
  accessibilityLabel: string;
  testID?: string;
};

const HEIGHT = 180;
const PAD = 10;

const TONE = { primary: colors.brandPrimary, muted: colors.borderStrong } as const;

function bounds(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

/** Minimal SVG line chart. The caller always shows the key number next to it, so the chart is never the only source. */
export function LineChart({ series, marker, guides = [], domain, formatY, accessibilityLabel, testID }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const all = series.flatMap((s) => s.points);
  const [x0, x1] = domain?.x ?? bounds(all.map((p) => p.x));
  const [y0, y1] = domain?.y ?? bounds([...all.map((p) => p.y), ...guides.map((g) => g.y)]);
  const sx = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (width - 2 * PAD);
  const sy = (y: number) => PAD + (1 - (y - y0) / (y1 - y0)) * (HEIGHT - 2 * PAD);
  const lines: { y: number; label?: string }[] = [...guides, ...(y0 <= 0 && y1 >= 0 && !guides.some((g) => g.y === 0) ? [{ y: 0 }] : [])];

  return (
    <View style={styles.box} onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} testID={testID}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          {lines.map((g) => (
            <Line key={g.y} x1={PAD} x2={width - PAD} y1={sy(g.y)} y2={sy(g.y)} stroke={colors.borderDefault} strokeWidth={1} strokeDasharray="4 4" />
          ))}
          {series.map((s, i) => (
            <Polyline
              key={i}
              points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
              fill="none"
              stroke={TONE[s.tone]}
              strokeWidth={s.tone === 'primary' ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {marker && <Circle cx={sx(marker.x)} cy={sy(marker.y)} r={7} fill={colors.brandAccent} stroke={colors.brandPrimary} strokeWidth={2} />}
        </Svg>
      )}
      <Text style={[styles.axis, styles.top]}>{formatY(y1)}</Text>
      <Text style={[styles.axis, styles.bottom]}>{formatY(y0)}</Text>
      {lines
        .filter((g) => g.label)
        .map((g) => (
          <Text key={`l${g.y}`} style={[styles.axis, styles.guideLabel, { top: sy(g.y) - 16 }]}>
            {g.label}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: HEIGHT,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  axis: { ...type.labelTab, color: colors.textMuted, position: 'absolute', left: spacing.sm },
  top: { top: spacing.xs },
  bottom: { bottom: spacing.xs },
  guideLabel: { right: spacing.sm, left: undefined },
});
