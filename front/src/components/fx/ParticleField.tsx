import { memo, useEffect, useEffectEvent } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { endOf, type Particle } from '@/lib/fx/particles';

type Props = {
  particles: Particle[];
  /** Called once when the last particle has faded (JS timer, not the UI thread). */
  onDone?: () => void;
  /** false lets pieces fly past the layer's edges (a burst out of a small row). */
  clip?: boolean;
  testID?: string;
};

type PieceProps = { p: Particle; clock: SharedValue<number> };

function pieceShape({ shape, size, color }: Particle): ViewStyle {
  if (shape === 'ring') {
    return { width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color, marginLeft: -size / 2, marginTop: -size / 2 };
  }
  if (shape === 'circle') return { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  return { width: size, height: size * 0.6, borderRadius: 2, backgroundColor: color };
}

/** One piece. Only transform and opacity change, and all of it is computed on the UI thread from the shared clock. */
const Piece = memo(function Piece({ p, clock }: PieceProps) {
  const style = useAnimatedStyle(() => {
    const t = (clock.value - p.delay) / 1000;
    const k = t / (p.life / 1000);
    if (t <= 0 || k >= 1) return { opacity: 0 };
    // Launch speed fades with drag; gravity pulls straight down.
    const travel = (1 - Math.exp(-p.drag * t)) / p.drag;
    const x = p.x0 + p.vx * travel + (p.sway ? Math.sin(t * p.swayHz) * p.sway : 0);
    const y = p.y0 + p.vy * travel + 0.5 * p.g * t * t;
    const scale = p.s0 + (p.s1 - p.s0) * k;
    return {
      opacity: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p.spin * t}deg` },
        { scaleX: scale },
        { scaleY: p.flip ? scale * Math.cos(t * p.flip) : scale },
      ],
    };
  });

  return <Animated.View style={[styles.piece, pieceShape(p), style]} />;
});

/**
 * Draws every particle from one linear clock, so a field of 100 pieces costs one animation, not 100.
 * Nothing is drawn under reduced motion. Tests get the empty container (Reanimated is mocked there).
 */
export function ParticleField({ particles, onDone, clip = true, testID }: Props) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);
  const skip = reduced || process.env.NODE_ENV === 'test' || particles.length === 0;
  // An Effect Event: a parent that re-renders with a new `onDone` must not restart the field.
  const done = useEffectEvent(() => onDone?.());

  // A new set of particles restarts the clock.
  useEffect(() => {
    if (skip) return;
    const total = endOf(particles);
    clock.value = 0;
    clock.value = withTiming(total, { duration: total, easing: Easing.linear });
    const timer = setTimeout(() => done(), total);
    return () => clearTimeout(timer);
  }, [particles, skip, clock]);

  return (
    <View style={[styles.field, !clip && styles.open]} pointerEvents="none" testID={testID}>
      {!skip && particles.map((p, i) => <Piece key={i} p={p} clock={clock} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  open: { overflow: 'visible' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
