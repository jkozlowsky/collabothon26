import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/constants/theme';

const PIECES = 32;
/** Burst origin, as a share of the height: about where the badge sits. */
const ORIGIN = 0.2;
const PALETTE = [colors.brandAccent, colors.storyTeal, colors.feedbackSuccess, colors.storyRose, colors.storyViolet, colors.brandPrimary];

/** Stable pseudo-random numbers, so a re-render never reshuffles the burst. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A one-shot burst of confetti from the centre of the badge. Measures its own box, not the window: on web the
 * app sits in a phone-sized frame, so the window's centre is off to the side. Nothing under reduced motion.
 */
export function Confetti() {
  const reduceMotion = useReducedMotion();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  if (reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      testID="confetti"
    >
      {box && Array.from({ length: PIECES }, (_, i) => <Piece key={i} index={i} width={box.width} height={box.height} />)}
    </View>
  );
}

function Piece({ index, width, height }: { index: number; width: number; height: number }) {
  const t = useSharedValue(0);
  const spreadX = (rand(index, 1) - 0.5) * width * 0.95;
  const fall = height * (0.35 + rand(index, 2) * 0.4);
  const spin = (rand(index, 3) - 0.5) * 900;
  const size = 6 + rand(index, 4) * 6;
  const round = rand(index, 5) > 0.6;

  useEffect(() => {
    t.set(withDelay(rand(index, 6) * 250, withTiming(1, { duration: 1500 + rand(index, 7) * 900, easing: Easing.out(Easing.quad) })));
  }, [index, t]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    // Up and out first, then gravity takes over.
    const lift = Math.sin(Math.min(1, p * 2) * Math.PI) * 60;
    return {
      opacity: p < 0.85 ? 1 : (1 - p) / 0.15,
      transform: [{ translateX: spreadX * p }, { translateY: fall * p * p - lift }, { rotate: `${spin * p}deg` }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: width / 2 - size / 2, top: height * ORIGIN, width: size, height: round ? size : size * 1.8, borderRadius: round ? radii.pill : 2 },
        { backgroundColor: PALETTE[index % PALETTE.length] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
});
