import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes, type CSSAnimationProperties } from 'react-native-reanimated';

import { Globe, GLOBE_PINS } from '@/components/onboarding/Globe';
import { EASE_IN_OUT, EASE_OUT, motion, POP_IN } from '@/components/onboarding/ui';
import { colors, elevation, fonts, radii, spacing } from '@/constants/theme';

const FLOAT = { from: { transform: [{ translateY: 0 }] }, to: { transform: [{ translateY: -7 }] } };
const SWAY = {
  from: { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
  to: { transform: [{ translateY: -8 }, { rotate: '4deg' }] },
};
const PULSE = { from: { opacity: 0.25, transform: [{ scale: 0.96 }] }, to: { opacity: 0.45, transform: [{ scale: 1.06 }] } };
const SPIN = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } };
const ENTER_POP = {
  from: { opacity: 0, transform: [{ scale: 0.8 }] },
  '65%': { opacity: 1, transform: [{ scale: 1.06 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};

/** An endless, slow back-and-forth (or spin). Off when the system asks for reduced motion. */
function loop(name: CSSAnimationKeyframes, duration: number, delay = 0, alternate = true): CSSAnimationProperties {
  return {
    animationName: name,
    animationDuration: duration,
    animationDelay: delay,
    animationDirection: alternate ? ('alternate' as const) : ('normal' as const),
    animationIterationCount: 'infinite' as const,
    animationTimingFunction: alternate ? EASE_IN_OUT : ('linear' as const),
  };
}

const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const RISE_IN = { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } };

/** Plays `name` once, `delay` ms after mount; until then the element holds the first keyframe. */
function once(name: CSSAnimationKeyframes, duration: number, delay: number): CSSAnimationProperties {
  return { animationName: name, animationDuration: duration, animationDelay: delay, animationFillMode: 'backwards' as const, animationTimingFunction: EASE_OUT };
}

/** Pops in once on mount, after `delay` ms. */
const enter = (delay: number) => once(ENTER_POP, 520, delay);

/**
 * Welcome hero: the brand tile and lesson/reward bubbles pop in one after another, then keep
 * drifting slowly, each on its own rhythm. Decorative only; nothing here is tappable.
 */
export function WelcomeHero() {
  const reduced = useReducedMotion();
  const bubbles = [
    { pos: { top: 26, right: 0 }, light: true, icon: <View style={hero.check}><Feather name="check" size={11} color="#fff" /></View>, text: 'Correct!' },
    { pos: { top: 64, left: 0 }, light: true, icon: <Ionicons name="flame" size={13} color={colors.feedbackStreak} />, text: '5 day streak' },
    { pos: { bottom: 40, right: 6 }, light: true, icon: <Feather name="zap" size={13} color={colors.feedbackXp} />, text: '+40 XP' },
    { pos: { bottom: 22, left: 14 }, light: false, icon: <Feather name="book-open" size={13} color={colors.brandAccent} />, text: '3 min lesson' },
  ];
  return (
    <View style={hero.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[hero.glow, !reduced && loop(PULSE, 2800)]} />
      <Animated.View style={[hero.ring, !reduced && loop(SPIN, 40000, 0, false)]} />
      <Animated.View style={[hero.tileSlot, reduced ? motion.fade : enter(100)]}>
        <Animated.View style={!reduced && loop(SWAY, 3200, 600)}>
          <View style={hero.tile}>
            <Feather name="trending-up" size={58} color={colors.brandPrimary} />
          </View>
        </Animated.View>
      </Animated.View>
      {bubbles.map((b, i) => (
        <Animated.View key={b.text} style={[hero.bubbleSlot, b.pos, reduced ? motion.fade : enter(450 + i * 140)]}>
          <Animated.View style={!reduced && loop(FLOAT, 2200 + i * 260, i * 300)}>
            <View style={[hero.bubble, b.light ? hero.bubbleLight : hero.bubbleDark]}>
              {b.icon}
              <Text style={b.light ? hero.bubbleTextDark : hero.bubbleTextLight}>{b.text}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      ))}
    </View>
  );
}

/** When each beat of the quick-check hero starts (ms): the rows 80 ms apart, the pick, the reveal, the bubble. */
const BEAT = { card: 100, rows: 420, rowGap: 80, pick: 1100, reveal: 1600, bubble: 1750 };
const ROW_BARS = ['62%', '74%', '48%'] as const;
const PICKED_ROW = 1;

/**
 * Quick-check intro: a question card whose answers arrive one by one; one gets picked, turns out right, and a
 * "Right" bubble pops in beside it. One sequence of about two seconds. Decorative only.
 */
export function QuickCheckHero() {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[check.stage, reduced && motion.fade]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="quick-check-hero"
    >
      <Animated.View style={[check.card, !reduced && enter(BEAT.card)]}>
        <View style={[check.bar, check.promptLong]} />
        <View style={[check.bar, check.promptShort]} />
        {ROW_BARS.map((width, i) => (
          <Animated.View key={width} style={[check.row, !reduced && once(RISE_IN, 300, BEAT.rows + i * BEAT.rowGap)]}>
            <View style={[check.skin, check.skinIdle]} />
            {/* The colour change is two skins fading in over the idle one, so only opacity animates. */}
            {i === PICKED_ROW && (
              <>
                <Animated.View style={[check.skin, check.skinPicked, !reduced && once(FADE_IN, 200, BEAT.pick)]} />
                <Animated.View style={[check.skin, check.skinRight, !reduced && once(FADE_IN, 240, BEAT.reveal)]} />
              </>
            )}
            <View style={[check.bar, { width }]} />
            <View style={check.ring}>
              {i === PICKED_ROW && (
                <Animated.View style={[check.mark, !reduced && once(POP_IN, 260, BEAT.reveal)]}>
                  <Feather name="check" size={11} color={colors.textOnBrand} />
                </Animated.View>
              )}
            </View>
          </Animated.View>
        ))}
      </Animated.View>
      <Animated.View style={[check.bubbleSlot, !reduced && enter(BEAT.bubble)]}>
        <Animated.View style={!reduced && loop(FLOAT, 2600, BEAT.bubble + 520)}>
          <View style={[hero.bubble, check.bubble]}>
            <Feather name="check" size={13} color={colors.textOnBrand} />
            <Text style={hero.bubbleTextLight}>Right</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** The lesson in progress, highlighted on the globe and shown on its card. */
const CURRENT = GLOBE_PINS.findIndex((p) => p.state === 'active');

/** Intro 1: a globe of lesson paths, one pin per topic. Illustration only. */
export function LessonGlobeIllustration() {
  const pin = GLOBE_PINS[CURRENT];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={globe.stage}>
        <View style={globe.orbit} />
        <View style={globe.shadow} />
        <View style={globe.sphere}>
          <Globe size={GLOBE_SIZE} selected={CURRENT} />
        </View>
        <Animated.View style={[globe.card, enter(350)]} testID="globe-card">
          <View style={globe.cityRow}>
            <View style={[globe.dot, { backgroundColor: pin.color }]} />
            <Text style={card.overline}>{pin.city.toUpperCase()}</Text>
          </View>
          <Text style={globe.cardTitle}>{pin.title}</Text>
          <Text style={card.meta}>{pin.meta}</Text>
          <View style={globe.cardButton}>
            <Text style={globe.cardButtonText}>Continue</Text>
            <Feather name="arrow-right" size={13} color={colors.brandPrimary} />
          </View>
        </Animated.View>
      </View>
      <View style={globe.topics}>
        {GLOBE_PINS.map((p) => (
          <View key={p.topic} style={globe.topic}>
            <View style={[globe.dot, { backgroundColor: p.color }]} />
            <Text style={globe.topicText}>{p.topic}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  stage: { width: 280, height: 280, alignSelf: 'center' },
  glow: {
    position: 'absolute',
    inset: 20,
    borderRadius: 140,
    backgroundColor: colors.globeOceanLight,
    opacity: 0.35,
  },
  ring: {
    position: 'absolute',
    inset: 30,
    borderRadius: 110,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tileSlot: { position: 'absolute', left: 80, top: 80 },
  bubbleSlot: { position: 'absolute' },
  tile: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  bubbleLight: { backgroundColor: colors.bgSurface, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' },
  bubbleDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  bubbleTextDark: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textPrimary },
  bubbleTextLight: { fontFamily: fonts.semiBold, fontSize: 12, color: '#fff' },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const RING = 18;

const check = StyleSheet.create({
  stage: { width: 280, height: 230, alignSelf: 'center' },
  card: {
    position: 'absolute',
    left: 16,
    top: 12,
    width: 216,
    padding: spacing.lg,
    gap: spacing.smPlus,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    ...elevation.mid,
  },
  bar: { height: 8, borderRadius: radii.pill, backgroundColor: colors.borderStrong },
  promptLong: { width: '86%' },
  promptShort: { width: '58%', marginBottom: spacing.xs },
  row: {
    height: 36,
    paddingHorizontal: spacing.smPlus,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skin: { position: 'absolute', inset: 0, borderRadius: radii.button, borderWidth: 2 },
  skinIdle: { borderColor: colors.borderDefault, backgroundColor: colors.bgSurface },
  skinPicked: { borderColor: colors.brandPrimary, backgroundColor: colors.brandAccentSoft },
  skinRight: { borderColor: colors.feedbackSuccess, backgroundColor: colors.bgSurface },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSlot: { position: 'absolute', right: 0, top: 118 },
  bubble: { backgroundColor: colors.feedbackSuccess, ...elevation.mid },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.sheet,
    padding: 20,
    gap: 10,
    boxShadow: '0 6px 20px rgba(0, 46, 60, 0.08)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overline: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.feedbackXp },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
});


const GLOBE_SIZE = 250;

const globe = StyleSheet.create({
  stage: { width: 330, maxWidth: '100%', height: 300, alignSelf: 'center' },
  orbit: {
    position: 'absolute',
    left: 0,
    top: 12,
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  shadow: {
    position: 'absolute',
    left: 88,
    bottom: 4,
    width: 110,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 46, 60, 0.08)',
  },
  sphere: { position: 'absolute', left: 18, top: 30 },
  card: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 3,
    boxShadow: '0 8px 24px rgba(0, 46, 60, 0.16)',
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary },
  cardButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.button,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandPrimary },
  topics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  topicText: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textPrimary },
});


