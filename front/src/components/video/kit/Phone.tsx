import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { CANVAS, PHONE_X, POP } from '@/components/video/kit/canvas';
import { colors, radii, scenePalette, spacing, type } from '@/constants/theme';
import { layerProgress } from '@/lib/sceneClock';
import type { ChatMessage } from '@/types/lessons';

type Message = ChatMessage & { at: number };

type Props = {
  messages: Message[];
  /** Centre, 0–1 of the canvas. */
  x?: number;
  t: SharedValue<number>;
  reducedMotion: boolean;
};

const WIDTH = 132;
const HEIGHT = 176;
const BUZZ = 0.35;

/** A small phone with chat bubbles in the ChatStep look. Bubbles pop in at their `at`; the phone buzzes. Not narrated. */
export const Phone = memo(function Phone({ messages, x = PHONE_X, t, reducedMotion }: Props) {
  const times = messages.map((m) => m.at);
  const buzz = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    const now = t.get();
    let since = Infinity;
    for (const at of times) if (now >= at) since = Math.min(since, now - at);
    const k = since < BUZZ ? 1 - since / BUZZ : 0;
    return { transform: [{ rotate: `${Math.sin(since * 70) * 3 * k}deg` }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.body, { left: x * CANVAS.width - WIDTH / 2, top: CANVAS.desk - HEIGHT + 24 }, buzz]}
    >
      <View style={styles.screen}>
        {messages.map((m, i) => (
          <Bubble key={i} message={m} t={t} reducedMotion={reducedMotion} />
        ))}
      </View>
    </Animated.View>
  );
});

function Bubble({ message, t, reducedMotion }: { message: Message; t: SharedValue<number>; reducedMotion: boolean }) {
  const pop = useAnimatedStyle(() => {
    const p = layerProgress(t.get(), message.at, POP);
    return reducedMotion ? { opacity: p } : { opacity: p, transform: [{ translateY: (1 - p) * 6 }, { scale: 0.94 + 0.06 * p }] };
  });
  return (
    <Animated.View style={[styles.row, message.me && styles.rowMe, pop]}>
      {!message.me && <Text style={styles.from}>{message.from}</Text>}
      <View style={[styles.bubble, message.me ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.text, message.me && styles.textMe]} numberOfLines={2}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: {
    position: 'absolute',
    width: WIDTH,
    height: HEIGHT,
    padding: spacing.xs,
    borderRadius: radii.card,
    backgroundColor: scenePalette.phoneBody,
  },
  screen: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.tile,
    backgroundColor: scenePalette.phoneScreen,
    overflow: 'hidden',
  },
  row: { alignItems: 'flex-start' },
  rowMe: { alignItems: 'flex-end' },
  // Text inside the drawn phone is part of the illustration, sized to the drawing, not to the type scale.
  from: { ...type.labelTab, fontSize: 9, lineHeight: 11, color: colors.textMuted },
  bubble: { maxWidth: '92%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radii.button },
  bubbleThem: { backgroundColor: scenePalette.bubble, borderTopLeftRadius: spacing.xxs },
  bubbleMe: { backgroundColor: colors.brandPrimary, borderTopRightRadius: spacing.xxs },
  text: { ...type.labelTab, fontSize: 10, lineHeight: 13, color: colors.textPrimary },
  textMe: { color: colors.textOnBrand },
});
