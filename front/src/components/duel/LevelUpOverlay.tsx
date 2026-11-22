import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { Confetti } from '@/components/fx/Confetti';
import { Fireworks, type BurstSpec } from '@/components/fx/Fireworks';
import { FxLayer } from '@/components/fx/FxLayer';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { haptic, playSound } from '@/lib/duel/feedback';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { CategoryMatchEnd } from '@/types/duel';

type Props = {
  categories: CategoryMatchEnd[];
  onDismiss: () => void;
  testID?: string;
};

const BURSTS: BurstSpec[] = [
  { x: 0.2, y: 0.22, delayMs: 200 },
  { x: 0.8, y: 0.3, delayMs: 550 },
  { x: 0.5, y: 0.12, delayMs: 900 },
  { x: 0.3, y: 0.62, delayMs: 1250 },
];

/** The rain keeps going while the overlay is shown: a fresh shower every few seconds. */
const RAIN_EVERY_MS = 2600;

function Rain({ width, height }: { width: number; height: number }) {
  const [wave, setWave] = useState(0);
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    const timer = setInterval(() => setWave((w) => w + 1), RAIN_EVERY_MS);
    return () => clearInterval(timer);
  }, []);
  return <Confetti key={wave} width={width} height={height} mode="shower" count={32} delayMs={wave === 0 ? 150 : 0} spreadMs={2000} testID={wave === 0 ? 'level-up-confetti' : undefined} />;
}

/** Taps are ignored for this long so the first one does not skip the celebration by accident. */
const LOCK_MS = 400;
const RAYS = 12;
const RAY_SIZE = 460;

/** Twelve soft rays behind the badge, turning slowly: the starburst. */
function Rays({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  const fade = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    fade.value = withTiming(1, { duration: 600 });
    turn.value = withRepeat(withTiming(360, { duration: 22000, easing: Easing.linear }), -1);
  }, [reduced, turn, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ rotate: `${turn.value}deg` }] }));
  const c = RAY_SIZE / 2;
  const wedge = (2 * Math.PI) / RAYS;
  const points = (i: number) => {
    const a0 = i * wedge;
    const a1 = a0 + wedge / 3.2;
    return `${c},${c} ${c + Math.cos(a0) * c},${c + Math.sin(a0) * c} ${c + Math.cos(a1) * c},${c + Math.sin(a1) * c}`;
  };
  return (
    <Animated.View style={[styles.rays, style]} pointerEvents="none" testID="level-up-rays">
      <Svg width={RAY_SIZE} height={RAY_SIZE}>
        {Array.from({ length: RAYS }, (_, i) => (
          <Polygon key={i} points={points(i)} fill={color} fillOpacity={0.09} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** A shockwave ring that grows out of the badge and fades. */
function Shockwave({ delayMs, color }: { delayMs: number; color: string }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    k.value = withDelay(delayMs, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [reduced, delayMs, k]);
  const style = useAnimatedStyle(() => ({ opacity: k.value > 0 ? 0.7 * (1 - k.value) : 0, transform: [{ scale: 1 + 1.2 * k.value }] }));
  if (reduced) return null;
  return <Animated.View style={[styles.shockwave, { borderColor: color }, style]} pointerEvents="none" />;
}

function LevelUpItem({ item, onNext, testID }: { item: CategoryMatchEnd; onNext: () => void; testID: string }) {
  const reduced = useReducedMotion();
  const instant = reduced || process.env.NODE_ENV === 'test';
  const meta = getStoryCategoryMeta(item.story);
  const [canDismiss, setCanDismiss] = useState(instant);

  const badge = useSharedValue(instant ? 1 : 0);
  const wiggle = useSharedValue(0);
  const title = useSharedValue(instant ? 1 : 0);
  const from = useSharedValue(instant ? 1 : 0);
  const flip = useSharedValue(instant ? 1 : 0);
  const bar = useSharedValue(instant ? 1 : 0);
  const hint = useSharedValue(instant ? 1 : 0);

  const target = item.xpForLevelAfter > 0 ? item.xpIntoLevelAfter / item.xpForLevelAfter : 0;

  useEffect(() => {
    playSound('level-up');
    haptic('success');
    // The light tick lands with the new-level chip.
    const tick = setTimeout(() => haptic('light'), instant ? 10 : 900);
    if (instant) return () => clearTimeout(tick);
    // Badge: 0 → 1.15 → 1 spring, with a small wiggle, then a gentle breathing loop.
    badge.value = withSequence(withTiming(1.15, { duration: 300, easing: Easing.out(Easing.cubic) }), withSpring(1, { damping: 7, stiffness: 230 }));
    wiggle.value = withDelay(300, withSequence(withTiming(8, { duration: 100 }), withTiming(-6, { duration: 130 }), withTiming(0, { duration: 110 })));
    title.value = withDelay(350, withSpring(1, { damping: 7, stiffness: 200 }));
    from.value = withDelay(650, withSpring(1, { damping: 12, stiffness: 180 }));
    flip.value = withDelay(900, withSpring(1, { damping: 9, stiffness: 170 }));
    bar.value = withDelay(1150, withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) }));
    hint.value = withDelay(LOCK_MS, withTiming(1, { duration: 300 }));
    const lock = setTimeout(() => setCanDismiss(true), LOCK_MS);
    return () => {
      clearTimeout(lock);
      clearTimeout(tick);
    };
  }, [instant, target, badge, wiggle, title, from, flip, bar, hint]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.value }, { rotate: `${wiggle.value}deg` }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.value, transform: [{ scale: 0.6 + 0.4 * title.value }] }));
  const fromStyle = useAnimatedStyle(() => ({ opacity: from.value, transform: [{ translateX: (1 - from.value) * -24 }] }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: flip.value }));
  const toStyle = useAnimatedStyle(() => ({
    opacity: flip.value > 0 ? 1 : 0,
    transform: [{ perspective: 400 }, { rotateX: `${(1 - flip.value) * 90}deg` }, { scale: 0.8 + 0.2 * flip.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, bar.value)) * 100}%` }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));

  return (
    <Pressable
      style={styles.overlay}
      onPress={() => canDismiss && onNext()}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Level up: ${meta.name}, tap to continue`}
    >
      <FxLayer>
        {({ width, height }) => (
          <>
            <Fireworks width={width} height={height} bursts={BURSTS} sparks={16} testID="level-up-fireworks" />
            <Confetti width={width} height={height} mode="cannons" count={36} delayMs={0} testID="level-up-cannons" />
            <Rain width={width} height={height} />
          </>
        )}
      </FxLayer>

      <View style={styles.content}>
        <View style={styles.badgeArea}>
          <Rays color={colors.brandAccent} />
          <Shockwave delayMs={120} color={colors.brandAccent} />
          <Shockwave delayMs={380} color={colors.textOnBrand} />
          <Animated.View style={[styles.badge, { backgroundColor: meta.accent }, badgeStyle]} testID="level-up-badge">
            <Feather name={meta.icon as keyof typeof Feather.glyphMap} size={56} color={colors.textOnBrand} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleStyle]} testID="level-up-title">
          Level up!
        </Animated.Text>
        <Text style={styles.category} testID="level-up-category">
          {meta.name}
        </Text>

        <View style={styles.levels} testID="level-up-levels">
          <Animated.View style={[styles.chipFrom, fromStyle]}>
            <Text style={styles.chipFromText}>Lv {item.levelBefore}</Text>
          </Animated.View>
          <Animated.View style={arrowStyle}>
            <Feather name="arrow-right" size={20} color={colors.brandAccent} />
          </Animated.View>
          <Animated.View style={[styles.chipTo, toStyle]} testID="level-up-new-chip">
            <Text style={styles.chipToText}>Lv {item.levelAfter}</Text>
          </Animated.View>
        </View>

        <View style={styles.progress}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: meta.accent }, barStyle]} />
          </View>
          <Text style={styles.progressText}>
            {item.xpIntoLevelAfter} / {item.xpForLevelAfter} XP towards Lv {item.levelAfter + 1}
          </Text>
        </View>
      </View>

      <Animated.Text style={[styles.hint, hintStyle]} testID="level-up-tap-hint">
        Tap anywhere to continue
      </Animated.Text>
    </Pressable>
  );
}

/**
 * Full-screen level-up overlay (Figma 166:8235) with the celebration on top: turning rays, a springing badge,
 * fireworks and a confetti rain, chips that flip to the new level, and the XP bar towards the next one.
 * Several categories show one after another; a tap anywhere moves on.
 */
export function LevelUpOverlay({ categories, onDismiss, testID = 'level-up-overlay' }: Props) {
  const [index, setIndex] = useState(0);
  const current = categories[index];
  if (!current) return null;

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onDismiss} testID="level-up-modal">
      <LevelUpItem
        key={`${current.story}-${index}`}
        item={current}
        onNext={() => (index < categories.length - 1 ? setIndex((i) => i + 1) : onDismiss())}
        testID={testID}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { alignItems: 'center', gap: spacing.xl - 0, width: '100%', maxWidth: 350 },
  badgeArea: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  rays: { position: 'absolute', width: RAY_SIZE, height: RAY_SIZE, left: (120 - RAY_SIZE) / 2, top: (120 - RAY_SIZE) / 2 },
  shockwave: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  badge: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors.textOnBrand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, color: colors.textOnBrand, textAlign: 'center', marginTop: -spacing.xs },
  category: { ...type.titleSection, color: colors.onBrandMuted, textAlign: 'center', marginTop: -spacing.md },
  levels: { flexDirection: 'row', alignItems: 'center', gap: spacing.smPlus, marginTop: -spacing.xs },
  chipFrom: { backgroundColor: colors.onBrandSubtle, paddingVertical: spacing.sm, paddingHorizontal: spacing.mdPlus, borderRadius: radii.pill },
  chipFromText: { ...type.titleCard, color: colors.onBrandMuted },
  chipTo: { backgroundColor: colors.brandAccent, paddingVertical: spacing.sm, paddingHorizontal: spacing.mdPlus, borderRadius: radii.pill },
  chipToText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.textOnAccent },
  progress: { alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs },
  track: { width: 180, height: 6, borderRadius: radii.pill, backgroundColor: colors.onBrandChip, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radii.pill },
  progressText: { ...type.labelDefault, color: colors.onBrandMuted, textAlign: 'center' },
  hint: { position: 'absolute', bottom: 56, left: 0, right: 0, ...type.labelStrong, color: colors.onBrandMuted, textAlign: 'center' },
});
