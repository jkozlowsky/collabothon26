import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { CANVAS, POP } from '@/components/video/kit/canvas';
import { colors, radii, scenePalette, spacing, type } from '@/constants/theme';
import { layerProgress } from '@/lib/sceneClock';
import type { TagTone } from '@/types/lessons';

type Props = {
  text: string;
  tone: TagTone;
  /** Centre, 0–1 of the canvas. */
  x: number;
  y: number;
  at?: number;
  t: SharedValue<number>;
  reducedMotion: boolean;
};

const SLOT = 140;

/** A pill chip ("+40%", "Day 31") that pops in at `at`. */
export const Tag = memo(function Tag({ text, tone, x, y, at = 0, t, reducedMotion }: Props) {
  const pop = useAnimatedStyle(() => {
    const p = layerProgress(t.get(), at, POP);
    return reducedMotion ? { opacity: p } : { opacity: p, transform: [{ translateY: (1 - p) * -10 }, { scale: 0.94 + 0.06 * p }] };
  });
  return (
    <View pointerEvents="none" style={[styles.slot, { left: x * CANVAS.width - SLOT / 2, top: y * CANVAS.height - 16 }]}>
      <Animated.View style={[styles.pill, styles[tone], pop]}>
        <Text style={[styles.text, tone === 'neutral' && styles.textNeutral]}>{text}</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  slot: { position: 'absolute', width: SLOT, alignItems: 'center' },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  good: { backgroundColor: colors.feedbackSuccess },
  bad: { backgroundColor: colors.feedbackDanger },
  neutral: { backgroundColor: scenePalette.onScene },
  text: { ...type.titleCard, color: colors.textOnBrand },
  textNeutral: { color: colors.textOnAccent },
});
