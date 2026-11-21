import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes, type CSSAnimationProperties } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Globe, GLOBE_PINS } from '@/components/onboarding/Globe';
import { EASE_IN_OUT, EASE_OUT, motion } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

const FLOAT = { from: { transform: [{ translateY: 0 }] }, to: { transform: [{ translateY: -7 }] } };
const PULSE = { from: { opacity: 0.25, transform: [{ scale: 0.96 }] }, to: { opacity: 0.45, transform: [{ scale: 1.06 }] } };
const SPIN = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } };
const BEAT = { from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.1 }] } };
const DRAIN = { from: { width: '100%' }, to: { width: '8%' } };
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

/** Pops in once on mount, after `delay` ms. */
function enter(delay: number): CSSAnimationProperties {
  return { animationName: ENTER_POP, animationDuration: 520, animationDelay: delay, animationFillMode: 'backwards' as const, animationTimingFunction: EASE_OUT };
}

/**
 * Atlas welcome hero: the globe floats inside two orbits while lesson/duel/XP bubbles drift around. Decorative only; nothing here is tappable.
 */
export function AtlasHero() {
  const reduced = useReducedMotion();
  const bubbles = [
    { pos: { top: 18, left: 0 }, light: true, icon: <Feather name="book-open" size={13} color={colors.brandPrimary} />, text: '3 min lesson' },
    { pos: { top: 54, right: 0 }, light: true, icon: <View style={hero.check}><Feather name="check" size={11} color="#fff" /></View>, text: 'Duel won · 4:3' },
    { pos: { bottom: 34, left: 4 }, light: false, icon: <Ionicons name="flame" size={13} color={colors.feedbackStreak} />, text: '5 day streak' },
    { pos: { bottom: 14, right: 12 }, light: true, icon: <Feather name="zap" size={13} color={colors.feedbackXp} />, text: '+40 XP' },
  ];
  return (
    <View style={hero.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[hero.glow, !reduced && loop(PULSE, 3200)]}>
        <HeroGlow />
      </Animated.View>
      <Animated.View style={[hero.orbitOuter, !reduced && loop(SPIN, 60000, 0, false)]} />
      <View style={hero.orbitTilt} />
      <Animated.View style={[hero.globeSlot, reduced ? motion.fade : enter(100)]}>
        <Animated.View style={!reduced && loop(FLOAT, 3400, 400)}>
          <View style={hero.globeShadow}>
            <Globe size={HERO_GLOBE} selected={CURRENT} />
          </View>
        </Animated.View>
      </Animated.View>
      {bubbles.map((b, i) => (
        <Animated.View key={b.text} style={[hero.bubbleSlot, b.pos, reduced ? motion.fade : enter(500 + i * 140)]}>
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

/** Soft ocean light behind the hero globe. */
function HeroGlow() {
  const id = `atlas-glow-${useId().replace(/:/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.globeOceanLight} stopOpacity={0.9} />
          <Stop offset="0.55" stopColor={colors.globeOceanLight} stopOpacity={0.25} />
          <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Duel intro: you and a rival face off over the same question, the clock running. Illustration only. */
export function DuelIllustration() {
  const reduced = useReducedMotion();
  return (
    <View style={duel.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[duel.glow, !reduced && loop(PULSE, 2600)]}>
        <HeroGlow />
      </Animated.View>
      <View style={duel.players}>
        <Animated.View style={[duel.player, reduced ? motion.fade : slideIn(-40, 100)]}>
          <PlayerAvatar avatar="f1" size={84} ring="accent" />
          <Text style={duel.name}>You</Text>
          <Text style={duel.score}>4</Text>
        </Animated.View>
        <Animated.View style={[reduced ? motion.fade : enter(450)]}>
          <Animated.View style={[duel.vs, !reduced && loop(BEAT, 900, 900)]}>
            <Text style={duel.vsText}>VS</Text>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[duel.player, reduced ? motion.fade : slideIn(40, 100)]}>
          <PlayerAvatar avatar="m2" size={84} ring="xp" />
          <Text style={duel.name}>Alex</Text>
          <Text style={[duel.score, duel.scoreRival]}>3</Text>
        </Animated.View>
      </View>
      <Animated.View style={[duel.card, reduced ? motion.fade : enter(650)]}>
        <View style={duel.cardHead}>
          <Text style={card.overline}>ROUND 7 OF 7 · INFLATION</Text>
          <View style={duel.timer}>
            <Feather name="clock" size={11} color={colors.feedbackStreak} />
            <Text style={duel.timerText}>0:08</Text>
          </View>
        </View>
        <Text style={duel.question}>Prices rise 5% a year. What happens to €100 kept in cash?</Text>
        <View style={duel.track}>
          <Animated.View style={[duel.trackFill, !reduced && { animationName: DRAIN, animationDuration: 6000, animationIterationCount: 'infinite', animationTimingFunction: 'linear' }]} />
        </View>
        <View style={duel.answer}>
          <View style={hero.check}><Feather name="check" size={11} color="#fff" /></View>
          <Text style={duel.answerText}>It buys less every year</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** Slides in from the side once on mount (players walking into the arena). */
function slideIn(fromX: number, delay: number): CSSAnimationProperties {
  return {
    animationName: { from: { opacity: 0, transform: [{ translateX: fromX }] }, to: { opacity: 1, transform: [{ translateX: 0 }] } },
    animationDuration: 600,
    animationDelay: delay,
    animationFillMode: 'backwards' as const,
    animationTimingFunction: EASE_OUT,
  };
}

/** The lesson in progress, highlighted on the globe and shown on its card. */
const CURRENT = GLOBE_PINS.findIndex((p) => p.state === 'active');

/** The map, on petrol like the welcome hero: a globe of pins with the open pin's lesson card. Illustration only. */
export function LessonGlobeIllustration() {
  const reduced = useReducedMotion();
  const pin = GLOBE_PINS[CURRENT];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={globe.stage}>
        <Animated.View style={[globe.glow, !reduced && loop(PULSE, 3200)]}>
          <HeroGlow />
        </Animated.View>
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
    </View>
  );
}

const HERO_STAGE = 300;
const HERO_GLOBE = 176;
const ORBIT = 262;

const hero = StyleSheet.create({
  stage: { width: HERO_STAGE, height: HERO_STAGE, alignSelf: 'center' },
  glow: { position: 'absolute', inset: -30 },
  orbitOuter: {
    position: 'absolute',
    left: (HERO_STAGE - ORBIT) / 2,
    top: (HERO_STAGE - ORBIT) / 2,
    width: ORBIT,
    height: ORBIT,
    borderRadius: ORBIT / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.onBrandDashed,
  },
  // A ring seen at an angle: squashed and tilted so the globe reads as 3D.
  orbitTilt: {
    position: 'absolute',
    left: 10,
    top: HERO_STAGE / 2 - 50,
    width: HERO_STAGE - 20,
    height: 100,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: colors.onBrandHairline,
    transform: [{ rotate: '-16deg' }],
  },
  globeSlot: { position: 'absolute', left: (HERO_STAGE - HERO_GLOBE) / 2, top: (HERO_STAGE - HERO_GLOBE) / 2 },
  globeShadow: { borderRadius: HERO_GLOBE / 2, boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)' },
  bubbleSlot: { position: 'absolute' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  bubbleLight: { backgroundColor: colors.bgSurface, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' },
  bubbleDark: { backgroundColor: colors.onBrandChip, borderWidth: 1, borderColor: colors.onBrandHairline },
  bubbleTextDark: { ...type.labelStrong, color: colors.textPrimary },
  bubbleTextLight: { ...type.labelStrong, color: colors.textOnBrand },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const duel = StyleSheet.create({
  stage: { alignSelf: 'stretch', paddingTop: spacing.lg, gap: spacing.xxl },
  glow: { position: 'absolute', left: -40, right: -40, top: -60, height: 300 },
  players: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  player: { alignItems: 'center', gap: spacing.xs },
  name: { ...type.labelStrong, color: colors.onBrandStrong, marginTop: spacing.xs },
  score: { ...type.displayAmount, color: colors.brandAccent },
  scoreRival: { color: colors.onBrandStrong },
  vs: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 8px rgba(255, 204, 0, 0.16), 0 0 32px rgba(255, 204, 0, 0.45)',
  },
  vsText: { ...type.titleSection, color: colors.textOnAccent, letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.smPlus,
    ...elevation.high,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timerText: { ...type.labelStrong, color: colors.feedbackStreak },
  question: { ...type.titleCard, color: colors.textPrimary },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.brandPrimarySoft, overflow: 'hidden' },
  trackFill: { height: 6, width: '40%', borderRadius: radii.bar, backgroundColor: colors.feedbackStreak },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.feedbackSuccess,
    backgroundColor: colors.feedbackSuccessSoft,
  },
  answerText: { ...type.titleCard, color: colors.feedbackSuccess },
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
  overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.feedbackXp },
  meta: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
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
    borderColor: colors.onBrandDashed,
  },
  glow: { position: 'absolute', left: -30, top: -20, width: 350, height: 350 },
  shadow: {
    position: 'absolute',
    left: 88,
    bottom: 4,
    width: 110,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
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
  cardButtonText: { fontSize: 13, fontWeight: '700', color: colors.brandPrimary },
  dot: { width: 8, height: 8, borderRadius: 4 },
});


