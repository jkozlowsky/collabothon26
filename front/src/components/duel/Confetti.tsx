import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const DEFAULT_CONFETTI_COLORS = [
  colors.brandAccent,
  colors.feedbackSuccess,
  colors.storyTeal,
  colors.storyOrange,
  colors.storyRose,
  colors.storyViolet,
  '#FFFFFF',
];

type Particle = {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
  size: number;
  isCircle: boolean;
  color: string;
  delayMs: number;
  durationMs: number;
};

function generateParticles(count: number, palette: string[], origin: 'top' | 'center'): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const isBurst = origin === 'center' || i % 2 === 0;

    let startX = 0;
    let startY = 0;
    let targetX = 0;
    let targetY = 0;

    if (isBurst) {
      // Radial burst outwards from center
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 160;
      startX = Math.cos(angle) * 20;
      startY = Math.sin(angle) * 20 + (origin === 'center' ? 100 : 40);
      targetX = Math.cos(angle) * distance;
      targetY = startY + Math.sin(angle) * distance + 80;
    } else {
      // Falling rain from top
      startX = Math.random() * 340 - 170;
      startY = -20;
      targetX = startX + (Math.random() * 80 - 40);
      targetY = 120 + Math.random() * 260;
    }

    const targetRotation = (Math.random() - 0.5) * 1080;
    const size = 6 + Math.random() * 7;
    const isCircle = i % 4 === 0;
    const color = palette[i % palette.length];
    const delayMs = Math.random() * 250;
    const durationMs = 1200 + Math.random() * 400;

    list.push({
      id: i,
      startX,
      startY,
      targetX,
      targetY,
      targetRotation,
      size,
      isCircle,
      color,
      delayMs,
      durationMs,
    });
  }
  return list;
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delayMs,
      withTiming(1, {
        duration: particle.durationMs,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [particle.delayMs, particle.durationMs, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = particle.startX + (particle.targetX - particle.startX) * p;
    const translateY = particle.startY + (particle.targetY - particle.startY) * p;
    const rotate = `${particle.targetRotation * p}deg`;
    const opacity = p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35);

    return {
      transform: [{ translateX }, { translateY }, { rotate }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: particle.size,
          height: particle.isCircle ? particle.size : particle.size * 0.65,
          borderRadius: particle.isCircle ? particle.size / 2 : 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

type Props = {
  count?: number;
  colorsList?: string[];
  origin?: 'top' | 'center';
  testID?: string;
};

/**
 * Reanimated generous confetti burst (~90 pieces, burst + rain).
 * Respects reduced motion (returns null).
 */
export function Confetti({
  count = 90,
  colorsList = DEFAULT_CONFETTI_COLORS,
  origin = 'center',
  testID = 'confetti-container',
}: Props) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return null;
  }

  // Pre-generate stable particles based on count & palette
  const particles = generateParticles(count, colorsList, origin);

  return (
    <View style={styles.container} pointerEvents="none" testID={testID}>
      {particles.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  piece: {
    position: 'absolute',
  },
});
