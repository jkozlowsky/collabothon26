import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { CANVAS, POP } from '@/components/video/kit/canvas';
import { colors, radii, scenePalette, spacing, type } from '@/constants/theme';
import { layerProgress } from '@/lib/sceneClock';

type Props = {
  series: number[];
  labels?: string[];
  unit: string;
  at?: number;
  len?: number;
  t: SharedValue<number>;
};

const WIDTH = 300;
const HEIGHT = 84;
const PAD = 10;
const LABEL = 80;

/** A line chart in the lower half, dots on the points, drawn left to right by a widening clip. */
export const Chart = memo(function Chart({ series, labels, unit, at = 0, len = 0, t }: Props) {
  const lo = Math.min(0, ...series);
  const hi = Math.max(...series);
  const x = (i: number) => PAD + (i * (WIDTH - 2 * PAD)) / Math.max(1, series.length - 1);
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo || 1)) * (HEIGHT - 2 * PAD);
  const last = series[series.length - 1];
  const trend = last > series[0] ? colors.feedbackSuccess : last < series[0] ? colors.feedbackDanger : scenePalette.onScene;

  const labelPlace = (i: number) =>
    i === 0 ? styles.labelFirst : i === series.length - 1 ? styles.labelLast : { left: x(i) - LABEL / 2 };

  const fade = useAnimatedStyle(() => ({ opacity: layerProgress(t.get(), at, POP) }));
  // Width, not scaleX: the clip reveals the line without stretching it (web and Android).
  const reveal = useAnimatedStyle(() => ({ width: `${layerProgress(t.get(), at, len) * 100}%` }));

  return (
    <Animated.View pointerEvents="none" style={[styles.box, fade]}>
      <Text style={styles.unit}>{unit}</Text>
      <Animated.View style={[styles.clip, reveal]}>
        <View style={styles.inner}>
          <Svg width={WIDTH} height={HEIGHT}>
            {lo < 0 && <Line x1={0} x2={WIDTH} y1={y(0)} y2={y(0)} stroke={scenePalette.segmentTodo} strokeDasharray="4 4" />}
            <Polyline
              points={series.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={scenePalette.onScene}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {series.map((v, i) => (
              <Circle key={i} cx={x(i)} cy={y(v)} r={4.5} fill={i === series.length - 1 ? trend : scenePalette.onScene} />
            ))}
          </Svg>
          {labels && (
            <View style={styles.labels}>
              {labels.map((label, i) => (
                // The end labels sit flush with the chart's edges, so they are never clipped.
                <Text key={i} style={[styles.label, labelPlace(i)]} numberOfLines={1}>
                  {label}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: (CANVAS.width - WIDTH) / 2 - spacing.sm,
    top: 124,
    width: WIDTH + 2 * spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    backgroundColor: scenePalette.captionPill,
  },
  unit: { ...type.labelTab, color: scenePalette.onSceneMuted },
  clip: { overflow: 'hidden' },
  inner: { width: WIDTH },
  labels: { height: 14 },
  label: { ...type.labelTab, position: 'absolute', width: LABEL, textAlign: 'center', color: scenePalette.onSceneMuted },
  labelFirst: { left: 0, textAlign: 'left' },
  labelLast: { right: 0, textAlign: 'right' },
});
