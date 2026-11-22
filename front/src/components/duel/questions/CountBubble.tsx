import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  count: number;
  reducedMotion: boolean;
};

const POP_SCALE = 1.35;
const POP_HALF_MS = 150;

/** The number of cards in a bucket; it pops when a card is added. */
export function CountBubble({ count, reducedMotion }: Props) {
  const scale = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current && !reducedMotion) {
      scale.value = withSequence(withTiming(POP_SCALE, { duration: POP_HALF_MS }), withTiming(1, { duration: POP_HALF_MS }));
    }
    prevCount.current = count;
  }, [count, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.badge, animStyle]}>
      <Text style={styles.text}>{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radii.pill,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...type.labelDefault,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});
