import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes, type CSSAnimationProperties } from 'react-native-reanimated';

import { Globe, GLOBE_PINS, GlobeSphere } from '@/components/onboarding/Globe';
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

/** Intro 2: your account becomes a lesson made for you. Illustration only. */
export function PersonalIllustration() {
  return (
    <View style={[card.wrap, { gap: 12 }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={personal.account}>
        <View style={card.headerRow}>
          <Text style={personal.accountLabel}>Main account · available</Text>
          <Feather name="eye" size={16} color="rgba(255,255,255,0.75)" />
        </View>
        <Text style={personal.amount}>€ 4,280.52</Text>
        <Text style={personal.iban}>DE89 3704 •••• •••• 4821</Text>
        <View style={personal.pills}>
          <View style={[personal.pill, { flex: 1 }]}>
            <Text style={personal.pillLabel}>In this month</Text>
            <Text style={[personal.pillValue, { color: '#7FD9A8' }]}>+€ 2,150.00</Text>
          </View>
          <View style={[personal.pill, personal.pillOn, { flex: 1 }]}>
            <Text style={personal.pillLabel}>Out this month</Text>
            <Text style={personal.pillValue}>−€ 1,268.40</Text>
          </View>
        </View>
      </View>
      <View style={personal.becomes}>
        <Feather name="repeat" size={13} color={colors.textMuted} />
        <Text style={card.meta}>becomes a lesson made for you</Text>
      </View>
      <Animated.View style={[personal.lesson, enter(300)]}>
        <GlobeSphere size={52} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={card.overline}>FINANCE QUEST · BUDGETING</Text>
          <Text style={path.title} numberOfLines={1}>
            Where did your €1,268 go?
          </Text>
          <Text style={path.meta}>Lesson 2 of 5 · 4 min</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.brandPrimary} />
      </Animated.View>
      <View style={[path.track, { marginTop: -4 }]}>
        <View style={[path.fill, { width: '40%', backgroundColor: colors.brandPrimary }]} />
      </View>
    </View>
  );
}

const GROW = { from: { opacity: 0, transform: [{ scaleX: 0.3 }] }, to: { opacity: 1, transform: [{ scaleX: 1 }] } };

/** Intro 3: confidence before vs. after a lesson. The bars fill in one by one. Illustration only. */
export function ConfidenceIllustration() {
  const reduced = useReducedMotion();
  const rows = [
    { label: 'Before lesson', value: 2, color: colors.borderStrong, valueColor: colors.textMuted },
    { label: 'After lesson', value: 4, color: colors.feedbackSuccess, valueColor: colors.feedbackSuccess },
  ];
  return (
    <View style={[card.wrap, { gap: 14 }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Text style={[card.overline, { color: colors.textMuted }]}>YOUR CONFIDENCE · SAVING</Text>
      {rows.map((r, row) => (
        <View key={r.label} style={{ gap: 8 }}>
          <View style={card.headerRow}>
            <Text style={path.title}>{r.label}</Text>
            <Text style={[path.title, { color: r.valueColor }]}>{r.value} / 5</Text>
          </View>
          <View style={conf.scale}>
            {[1, 2, 3, 4, 5].map((i) => {
              const filled = i <= r.value;
              return (
                <Animated.View
                  key={i}
                  style={[
                    conf.seg,
                    { backgroundColor: filled ? r.color : colors.borderDefault },
                    filled && !reduced && {
                      animationName: GROW,
                      animationDuration: 320,
                      animationDelay: 150 + row * 450 + i * 90,
                      animationFillMode: 'backwards',
                      animationTimingFunction: EASE_OUT,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ))}
      <View style={conf.step}>
        <Feather name="check" size={16} color={colors.brandPrimary} />
        <Text style={[path.title, { flex: 1 }]}>Next step: set up a monthly savings transfer</Text>
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

const path = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowActive: { backgroundColor: colors.brandAccentSoft, borderColor: colors.brandPrimary, borderWidth: 2, padding: 11 },
  rowLocked: { opacity: 0.55 },
  title: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 11, color: colors.textMuted },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.borderDefault, overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', backgroundColor: colors.feedbackSuccess },
  status: { fontSize: 12, fontWeight: '700', color: colors.brandPrimary },
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

const personal = StyleSheet.create({
  account: { backgroundColor: colors.brandPrimary, borderRadius: radii.card, padding: spacing.lg, gap: 4 },
  accountLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  amount: { fontSize: 28, fontWeight: '700', color: '#fff' },
  iban: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.button,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillOn: { backgroundColor: 'rgba(255,204,0,0.16)', borderColor: colors.brandAccent },
  pillLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  pillValue: { fontSize: 12, fontWeight: '600', color: '#fff' },
  becomes: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: colors.brandAccentSoft,
    borderWidth: 1,
    borderColor: colors.brandAccent,
  },
});

const conf = StyleSheet.create({
  scale: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 12, borderRadius: 6 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.tile,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
