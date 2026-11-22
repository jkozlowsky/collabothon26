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
  withTiming,
} from 'react-native-reanimated';

import { Confetti } from '@/components/duel/Confetti';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { haptic, playSound } from '@/lib/duel/feedback';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { CategoryMatchEnd } from '@/types/duel';

type Props = {
  categories: CategoryMatchEnd[];
  onDismiss: () => void;
  testID?: string;
};

// Shockwave ring component expanding around badge
function ShockwaveRing({ delayMs, color }: { delayMs: number; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.75);

  useEffect(() => {
    scale.value = withDelay(
      delayMs,
      withTiming(2.1, { duration: 1100, easing: Easing.out(Easing.quad) })
    );
    opacity.value = withDelay(
      delayMs,
      withTiming(0, { duration: 1100, easing: Easing.out(Easing.quad) })
    );
  }, [delayMs, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.shockwave, { borderColor: color }, style]} />;
}

// Sparkle star component twinkling around badge
function Sparkle({
  top,
  left,
  delayMs,
}: {
  top: number;
  left: number;
  delayMs: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 350, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(0.8, { duration: 450 })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 500 })
        ),
        -1,
        true
      )
    );
  }, [delayMs, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.sparkle, { top, left }, style]}>
      <Feather name="star" size={16} color={colors.brandAccent} />
    </Animated.View>
  );
}

function LevelUpItem({
  item,
  onNext,
  testID,
}: {
  item: CategoryMatchEnd;
  onNext: () => void;
  testID: string;
}) {
  const reducedMotion = useReducedMotion();
  const isTest = process.env.NODE_ENV === 'test';

  const [canDismiss, setCanDismiss] = useState(reducedMotion || isTest);
  const [displayedLevel, setDisplayedLevel] = useState(
    reducedMotion ? item.levelAfter : item.levelBefore
  );
  const [isNewLevelShown, setIsNewLevelShown] = useState(reducedMotion);

  // Animations
  const badgeScale = useSharedValue(reducedMotion ? 1 : 0);
  const badgeRotate = useSharedValue(reducedMotion ? 0 : -10);
  const titleScale = useSharedValue(reducedMotion ? 1 : 1.4);
  const titleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const newChipScale = useSharedValue(reducedMotion ? 1 : 0);
  const xpBarWidth = useSharedValue(reducedMotion ? 1 : 0);
  const hintOpacity = useSharedValue(reducedMotion || isTest ? 1 : 0);

  useEffect(() => {
    // Initial sound & haptic at pop
    playSound('level-up');
    haptic('success');

    if (reducedMotion) {
      badgeScale.value = 1;
      badgeRotate.value = 0;
      titleScale.value = 1;
      titleOpacity.value = 1;
      newChipScale.value = 1;
      xpBarWidth.value = 1;
      hintOpacity.value = 1;
      return;
    }

    // 1. Badge pop-in: scale 0 -> 1.15 -> 1.0, rotate wobble -10 -> 8 -> 0
    badgeScale.value = 0;
    badgeRotate.value = -10;
    badgeScale.value = withSequence(
      withTiming(1.15, { duration: 320, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1.0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    badgeRotate.value = withSequence(
      withTiming(8, { duration: 250 }),
      withTiming(-4, { duration: 180 }),
      withTiming(0, { duration: 150 })
    );

    // 2. Title slam: scale 1.4 -> 1.0, opacity 0 -> 1
    titleScale.value = 1.4;
    titleOpacity.value = 0;
    titleScale.value = withTiming(1.0, { duration: 350, easing: Easing.out(Easing.back(1.2)) });
    titleOpacity.value = withTiming(1.0, { duration: 250 });

    // 3. XP bar: fills to 100% first, flashes, then resets and fills to new progress
    xpBarWidth.value = 0.8;
    xpBarWidth.value = withSequence(
      withTiming(1.0, { duration: 400, easing: Easing.out(Easing.quad) }),
      withDelay(120, withTiming(0, { duration: 100 })),
      withTiming(
        item.xpForLevelAfter > 0 ? item.xpIntoLevelAfter / item.xpForLevelAfter : 0.4,
        { duration: 550, easing: Easing.out(Easing.quad) }
      )
    );

    // 4. Level tick & landing at ~550ms: chip pops in and light haptic triggers
    const tickTimer = setTimeout(() => {
      setDisplayedLevel(item.levelAfter);
      setIsNewLevelShown(true);
      newChipScale.value = withTiming(1.0, {
        duration: 350,
        easing: Easing.out(Easing.back(1.6)),
      });
      haptic('light');
    }, isTest ? 10 : 550);

    // 5. Unlock tap to dismiss & show hint after ~1.2s (10ms in tests)
    const lockDuration = isTest ? 10 : 1200;
    const lockTimer = setTimeout(() => {
      setCanDismiss(true);
      hintOpacity.value = withTiming(1.0, { duration: 300 });
    }, lockDuration);

    return () => {
      clearTimeout(tickTimer);
      clearTimeout(lockTimer);
    };
  }, [
    item,
    reducedMotion,
    isTest,
    badgeScale,
    badgeRotate,
    titleScale,
    titleOpacity,
    newChipScale,
    xpBarWidth,
    hintOpacity,
  ]);

  const meta = getStoryCategoryMeta(item.story);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));

  const newChipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isNewLevelShown ? newChipScale.value : 0 }],
    opacity: isNewLevelShown ? 1 : 0,
  }));

  const xpBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, xpBarWidth.value * 100))}%`,
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  return (
    <Pressable
      style={styles.overlay}
      onPress={() => {
        if (canDismiss) {
          onNext();
        }
      }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Level up: ${meta.name}, tap to continue`}
    >
      {/* Generous confetti burst from badge + rain from top */}
      <Confetti
        count={90}
        colorsList={[
          meta.accent,
          colors.brandAccent,
          colors.brandAccentSoft,
          colors.feedbackSuccess,
          '#FFFFFF',
        ]}
        origin="center"
        testID="level-up-confetti"
      />

      <View style={styles.content}>
        {/* Badge Area with shockwaves & sparkles */}
        <View style={styles.badgeContainer}>
          {/* Expanding shockwaves */}
          {!reducedMotion && (
            <>
              <ShockwaveRing delayMs={40} color={meta.accent} />
              <ShockwaveRing delayMs={240} color={colors.brandAccent} />
              <ShockwaveRing delayMs={440} color="#FFFFFF" />
            </>
          )}

          {/* Sparkles around badge */}
          {!reducedMotion && (
            <>
              <Sparkle top={-12} left={10} delayMs={100} />
              <Sparkle top={-6} left={96} delayMs={280} />
              <Sparkle top={88} left={-10} delayMs={200} />
              <Sparkle top={92} left={104} delayMs={360} />
              <Sparkle top={-20} left={54} delayMs={450} />
            </>
          )}

          {/* 120 px category badge */}
          <Animated.View
            style={[styles.badge, { backgroundColor: meta.accent }, badgeAnimatedStyle]}
            testID="level-up-badge"
          >
            <Feather
              name={meta.icon as keyof typeof Feather.glyphMap}
              size={56}
              color="#FFFFFF"
            />
          </Animated.View>
        </View>

        {/* Slamming Title & Category name */}
        <View style={styles.titleWrap}>
          <Animated.Text style={[styles.title, titleAnimatedStyle]} testID="level-up-title">
            Level up!
          </Animated.Text>
          <Text style={styles.categoryName} testID="level-up-category">
            {meta.name}
          </Text>
        </View>

        {/* Level change chips with transition */}
        <View style={styles.levelRow} testID="level-up-levels">
          {/* Old level chip */}
          <View style={styles.levelChipMuted}>
            <Text style={styles.levelChipMutedText}>Lv {item.levelBefore}</Text>
          </View>

          <Feather name="arrow-right" size={20} color={colors.onBrandMuted} />

          {/* New level yellow chip popping in */}
          <Animated.View
            style={[styles.levelChipAccent, newChipAnimatedStyle]}
            testID="level-up-new-chip"
          >
            <Text style={styles.levelChipAccentText}>Lv {displayedLevel}</Text>
          </Animated.View>
        </View>

        {/* Category XP Progress Bar */}
        <View style={styles.xpCard}>
          <View style={styles.xpTrack}>
            <Animated.View
              style={[styles.xpBarFill, { backgroundColor: meta.accent }, xpBarAnimatedStyle]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.xpIntoLevelAfter} / {item.xpForLevelAfter} XP towards Lv {item.levelAfter + 1}
          </Text>
        </View>

        {/* Bottom hint (fades in after lock period) */}
        <Animated.Text style={[styles.tapHint, hintAnimatedStyle]} testID="level-up-tap-hint">
          Tap anywhere to continue
        </Animated.Text>
      </View>
    </Pressable>
  );
}

/**
 * Full-screen max-celebration level-up overlay.
 * Big animated celebration: spring pop, rotation wobble, pulse, shockwaves, sparkles,
 * generous confetti, slamming title, level counter tick, XP bar fill/flash/refill,
 * and tap-lock until animation lands.
 */
export function LevelUpOverlay({ categories, onDismiss, testID = 'level-up-overlay' }: Props) {
  const [index, setIndex] = useState(0);
  const current = categories[index];

  if (!current) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="level-up-modal"
    >
      <LevelUpItem
        key={`${current.story}-${index}`}
        item={current}
        onNext={() => {
          if (index < categories.length - 1) {
            setIndex((i) => i + 1);
          } else {
            onDismiss();
          }
        }}
        testID={testID}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    flex: 1,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 340,
    zIndex: 20,
  },
  badgeContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  shockwave: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...type.displayAmount,
    color: colors.textOnBrand,
    textAlign: 'center',
    fontSize: 34,
  },
  categoryName: {
    ...type.titleSection,
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  levelChipMuted: {
    backgroundColor: colors.onBrandChip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  levelChipMutedText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.onBrandMuted,
  },
  levelChipAccent: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  levelChipAccentText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textOnAccent,
  },
  xpCard: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  xpTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.onBrandChip,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  progressText: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
  tapHint: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
