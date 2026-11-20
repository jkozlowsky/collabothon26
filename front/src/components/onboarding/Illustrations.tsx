import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes, type CSSAnimationProperties } from 'react-native-reanimated';

import { Globe, GLOBE_PINS, GlobeSphere } from '@/components/onboarding/Globe';
import { EASE_IN_OUT, EASE_OUT, haptic, motion, Tappable } from '@/components/onboarding/ui';
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

/** Intro 1: a globe of lesson paths, one pin per topic. Tap a pin or a topic to highlight it. */
export function LessonGlobeIllustration() {
  const [selected, setSelected] = useState(GLOBE_PINS.findIndex((p) => p.state === 'active'));
  const pin = GLOBE_PINS[selected];
  const action = pin.state === 'done' ? 'Review' : pin.state === 'locked' ? 'Locked' : pin.state === 'active' ? 'Continue' : 'Start';
  return (
    <View>
      <View style={globe.stage}>
        <View style={globe.orbit} />
        <View style={globe.shadow} />
        <View style={globe.sphere}>
          <Globe size={GLOBE_SIZE} selected={selected} onSelect={setSelected} />
        </View>
        <Animated.View key={pin.city} style={[globe.card, motion.swap]} testID="globe-card">
          <View style={globe.cityRow}>
            <View style={[globe.dot, { backgroundColor: pin.color }]} />
            <Text style={card.overline}>{pin.city.toUpperCase()}</Text>
          </View>
          <Text style={globe.cardTitle}>{pin.title}</Text>
          <Text style={card.meta}>{pin.meta}</Text>
          <View style={[globe.cardButton, pin.state === 'locked' && globe.cardButtonLocked]}>
            {pin.state === 'locked' && <Feather name="lock" size={12} color={colors.textMuted} />}
            <Text style={[globe.cardButtonText, pin.state === 'locked' && { color: colors.textMuted }]}>{action}</Text>
            {pin.state !== 'locked' && <Feather name="arrow-right" size={13} color={colors.brandPrimary} />}
          </View>
        </Animated.View>
      </View>
      <View style={globe.topics}>
        {GLOBE_PINS.map((p, i) => {
          const on = i === selected;
          return (
            <Tappable
              key={p.topic}
              testID={`topic-${i}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              haptic="selection"
              pressedScale={0.93}
              onPress={() => setSelected(i)}
              style={[globe.topic, motion.colors, on && { borderColor: p.color, backgroundColor: `${p.color}22` }]}
            >
              <Animated.View style={[globe.dot, motion.lift, { backgroundColor: p.color, transform: [{ scale: on ? 1.5 : 1 }] }]} />
              <Text style={globe.topicText}>{p.topic}</Text>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

const PERSONAL_LESSONS = {
  out: { overline: 'BUDGETING', title: 'Where did your €1,268 go?', meta: 'Lesson 2 of 5 · 4 min', progress: '40%' },
  in: { overline: 'SAVING', title: 'Saving €215 a month?', meta: 'Lesson 1 of 4 · 3 min', progress: '12%' },
} as const;

/** Intro 2: your account becomes a lesson made for you. Tap a number to see its lesson. */
export function PersonalIllustration() {
  const [focus, setFocus] = useState<'in' | 'out'>('out');
  const [hidden, setHidden] = useState(false);
  const lesson = PERSONAL_LESSONS[focus];
  const pill = (key: 'in' | 'out', label: string, value: string, color?: string) => (
    <Tappable
      testID={`account-${key}`}
      accessibilityRole="button"
      accessibilityState={{ selected: focus === key }}
      haptic="selection"
      pressedScale={0.95}
      onPress={() => setFocus(key)}
      containerStyle={{ flex: 1 }}
      style={[personal.pill, motion.colors, focus === key && personal.pillOn]}
    >
      <Text style={personal.pillLabel}>{label}</Text>
      <Text style={[personal.pillValue, color ? { color } : null]}>{hidden ? '€ •••••' : value}</Text>
    </Tappable>
  );
  return (
    <View style={[card.wrap, { gap: 12 }]}>
      <View style={personal.account}>
        <View style={card.headerRow}>
          <Text style={personal.accountLabel}>Main account · available</Text>
          <Tappable
            testID="account-eye"
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            hitSlop={12}
            pressedScale={0.85}
            haptic="selection"
            onPress={() => setHidden((h) => !h)}
          >
            <Animated.View key={String(hidden)} style={motion.pop}>
              <Feather name={hidden ? 'eye-off' : 'eye'} size={16} color="rgba(255,255,255,0.75)" />
            </Animated.View>
          </Tappable>
        </View>
        <Animated.Text key={String(hidden)} style={[personal.amount, motion.fade]}>
          {hidden ? '€ ••••••' : '€ 4,280.52'}
        </Animated.Text>
        <Text style={personal.iban}>DE89 3704 •••• •••• 4821</Text>
        <View style={personal.pills}>
          {pill('in', 'In this month', '+€ 2,150.00', '#7FD9A8')}
          {pill('out', 'Out this month', '−€ 1,268.40')}
        </View>
      </View>
      <View style={personal.becomes}>
        <Animated.View key={focus} style={{ animationName: { from: { transform: [{ rotate: '-180deg' }] }, to: { transform: [{ rotate: '0deg' }] } }, animationDuration: 420, animationTimingFunction: EASE_OUT }}>
          <Feather name="repeat" size={13} color={colors.textMuted} />
        </Animated.View>
        <Text style={card.meta}>Tap a number — it becomes a lesson</Text>
      </View>
      <View style={personal.lesson}>
        <GlobeSphere size={52} />
        <Animated.View key={focus} style={[{ flex: 1, gap: 3 }, motion.swap]}>
          <Text style={card.overline}>FINANCE QUEST · {lesson.overline}</Text>
          <Text style={path.title} numberOfLines={1}>
            {lesson.title}
          </Text>
          <Text style={path.meta}>{lesson.meta}</Text>
        </Animated.View>
        <Feather name="chevron-right" size={18} color={colors.brandPrimary} />
      </View>
      <View style={[path.track, { marginTop: -4 }]}>
        <Animated.View style={[path.fill, motion.size, { width: lesson.progress, backgroundColor: colors.brandPrimary }]} />
      </View>
    </View>
  );
}

const GROW = { from: { opacity: 0, transform: [{ scaleX: 0.3 }] }, to: { opacity: 1, transform: [{ scaleX: 1 }] } };

/** Intro 3: confidence before vs. after a lesson. The bars fill in; tap the next step to tick it off. */
export function ConfidenceIllustration() {
  const reduced = useReducedMotion();
  const [stepDone, setStepDone] = useState(false);
  const rows = [
    { label: 'Before lesson', value: 2, color: colors.borderStrong, valueColor: colors.textMuted },
    { label: 'After lesson', value: 4, color: colors.feedbackSuccess, valueColor: colors.feedbackSuccess },
  ];
  return (
    <View style={[card.wrap, { gap: 14 }]}>
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
      <Tappable
        testID="next-step"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: stepDone }}
        pressedScale={0.97}
        onPress={() => {
          if (!stepDone) haptic('success');
          setStepDone((d) => !d);
        }}
        style={[conf.step, motion.colors, stepDone && conf.stepDone]}
      >
        <Animated.View style={[conf.tick, motion.colors, stepDone && conf.tickDone]}>
          {stepDone && (
            <Animated.View style={motion.pop}>
              <Feather name="check" size={13} color="#fff" />
            </Animated.View>
          )}
        </Animated.View>
        <Text style={[path.title, { flex: 1 }, stepDone && { color: colors.feedbackSuccess }]}>
          {stepDone ? 'Done! Monthly savings transfer set' : 'Next step: set up a monthly savings transfer'}
        </Text>
        {stepDone && (
          <Animated.View style={[conf.xp, motion.pop]}>
            <Feather name="zap" size={11} color={colors.feedbackXp} />
            <Text style={conf.xpText}>+10 XP</Text>
          </Animated.View>
        )}
      </Tappable>
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
  cardButtonLocked: { backgroundColor: colors.bgTint },
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
  stepDone: { backgroundColor: 'rgba(30, 138, 94, 0.12)' },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: { backgroundColor: colors.feedbackSuccess, borderColor: colors.feedbackSuccess },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bgSurface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xpText: { fontSize: 11, fontWeight: '700', color: colors.feedbackXp },
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
