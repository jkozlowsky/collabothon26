import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes, type CSSAnimationProperties } from 'react-native-reanimated';

import { Globe, GLOBE_PINS } from '@/components/onboarding/Globe';
import { EASE_IN_OUT, EASE_OUT, motion } from '@/components/onboarding/ui';
import { colors, radii, spacing } from '@/constants/theme';

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

/** Pops in once on mount, after `delay` ms. */
function enter(delay: number): CSSAnimationProperties {
  return { animationName: ENTER_POP, animationDuration: 520, animationDelay: delay, animationFillMode: 'backwards' as const, animationTimingFunction: EASE_OUT };
}

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
  bubbleTextDark: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  bubbleTextLight: { fontSize: 12, fontWeight: '600', color: '#fff' },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.feedbackSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  topicText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
});


