import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationProperties, type CSSStyle } from 'react-native-reanimated';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { CheckDot } from '@/components/onboarding/illustrations/CheckDot';
import { HeroGlow } from '@/components/onboarding/illustrations/HeroGlow';
import { enter, loop, once, PULSE } from '@/components/onboarding/illustrations/keyframes';
import { EASE_IN_OUT, EASE_OUT, motion, POP_IN } from '@/components/onboarding/ui';
import { colors, elevation, fonts, illustrationShadow, radii, spacing, type } from '@/constants/theme';

const BEAT = { from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.1 }] } };

/** The two rounds the duel illustration plays in turn; `right` is the answer that lights up green. */
const DUEL_ROUNDS = [
  {
    label: 'ROUND 6 OF 7 · INVESTING',
    question: 'Which one usually spreads the risk more?',
    options: ['A fund of 500 companies', "One company's shares"],
    right: 0,
    score: [2, 3],
  },
  {
    label: 'ROUND 7 OF 7 · INFLATION',
    question: 'Prices rise 5% a year. What happens to €100 kept in cash?',
    options: ['It keeps its value', 'It buys less every year'],
    right: 1,
    score: [3, 3],
  },
] as const;
/** Seconds on the round clock. */
const DUEL_CLOCK = 10;
/** The answer is picked when the clock shows this many seconds. */
const DUEL_PICK_AT = 5;
/** The loop moves in half seconds: 10 for the countdown, 4 holding the answer, 1 fading to the next round. */
const DUEL_BEAT_MS = 500;
const DUEL_COUNT = (DUEL_CLOCK - DUEL_PICK_AT) * 2;
const DUEL_HOLD = 4;
const DUEL_BEATS = DUEL_COUNT + DUEL_HOLD + 1;
const DUEL_FADE_MS = 350;
/** Transitions stay out of StyleSheet.create: its types do not know Reanimated's CSS properties. */
const TRACK_DRAIN = { transitionProperty: 'width', transitionTimingFunction: 'linear' } satisfies CSSStyle;
const ANSWER_FADE = { transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: 250 } satisfies CSSStyle;
const CHECK_FADE = { transitionProperty: 'opacity', transitionDuration: 250 } satisfies CSSStyle;
const ROUND_FADE = { transitionProperty: 'opacity', transitionDuration: DUEL_FADE_MS, transitionTimingFunction: EASE_IN_OUT } satisfies CSSStyle;

/**
 * One round of the duel at a time: the clock counts down, an answer is picked and turns green, the score moves,
 * then the card fades over to the other round. Everything follows from one beat counter, so the loop never drifts.
 * With reduced motion it holds the last round, answered.
 */
function useDuelLoop(enabled: boolean) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setBeat((b) => b + 1), DUEL_BEAT_MS);
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return { round: DUEL_ROUNDS[DUEL_ROUNDS.length - 1], sec: DUEL_PICK_AT, picked: true, shown: true, fresh: false };
  const t = beat % DUEL_BEATS;
  const round = DUEL_ROUNDS[Math.floor(beat / DUEL_BEATS) % DUEL_ROUNDS.length];
  return {
    round,
    sec: Math.max(DUEL_PICK_AT, DUEL_CLOCK - Math.floor(t / 2)),
    picked: t >= DUEL_COUNT,
    shown: t < DUEL_BEATS - 1,
    fresh: t === 0,
  };
}

/** Slides in from the side once on mount (players walking into the arena). */
function slideIn(fromX: number, delay: number): CSSAnimationProperties {
  return {
    animationName: { from: { opacity: 0, transform: [{ translateX: fromX }] }, to: { opacity: 1, transform: [{ translateX: 0 }] } },
    animationDuration: 600,
    animationDelay: delay,
    animationFillMode: 'backwards',
    animationTimingFunction: EASE_OUT,
  };
}

/** Duel intro: you and a rival face off over the same questions, the clock running. Illustration only. */
export function DuelIllustration() {
  const reduced = useReducedMotion();
  const { round, sec, picked, shown, fresh } = useDuelLoop(!reduced);
  // You score when your answer is in; the rival's score stays.
  const you = round.score[0] + (picked ? 1 : 0);
  return (
    <View style={styles.stage} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.glow, !reduced && loop(PULSE, 2600)]}>
        <HeroGlow />
      </Animated.View>
      <View style={styles.players}>
        <Animated.View style={[styles.player, reduced ? motion.fade : slideIn(-40, 100)]}>
          <PlayerAvatar avatar="f1" size={84} ring="accent" />
          <Text style={styles.name}>You</Text>
          <Animated.Text key={you} style={[styles.score, !reduced && once(POP_IN, 260, 0)]}>
            {you}
          </Animated.Text>
        </Animated.View>
        <Animated.View style={[reduced ? motion.fade : enter(450)]}>
          <Animated.View style={[styles.vs, !reduced && loop(BEAT, 900, 900)]}>
            <Text style={styles.vsText}>VS</Text>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.player, reduced ? motion.fade : slideIn(40, 100)]}>
          <PlayerAvatar avatar="m2" size={84} ring="xp" />
          <Text style={styles.name}>Alex</Text>
          <Text style={[styles.score, styles.scoreRival]}>{round.score[1]}</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.card, reduced ? motion.fade : enter(650)]}>
        <Animated.View style={[styles.round, ROUND_FADE, { opacity: shown ? 1 : 0 }]}>
          <View style={styles.cardHead}>
            <Text style={styles.overline}>{round.label}</Text>
            <View style={styles.timer}>
              <Feather name="clock" size={11} color={colors.feedbackStreak} />
              <Text style={styles.timerText}>0:{String(sec).padStart(2, '0')}</Text>
            </View>
          </View>
          <Text style={styles.question} numberOfLines={2}>
            {round.question}
          </Text>
          <View style={styles.track}>
            {/* Refills at once while the card is faded out; drains second by second after that. */}
            <Animated.View style={[styles.trackFill, TRACK_DRAIN, { width: `${(sec / DUEL_CLOCK) * 100}%`, transitionDuration: fresh ? 0 : DUEL_BEAT_MS * 2 }]} />
          </View>
          {round.options.map((option, i) => {
            const right = picked && i === round.right;
            return (
              <Animated.View key={option} style={[styles.answer, ANSWER_FADE, right && styles.answerRight]}>
                <CheckDot style={[CHECK_FADE, { opacity: right ? 1 : 0 }]} />
                <Text style={[styles.answerText, right && styles.answerTextRight]}>{option}</Text>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'stretch', paddingTop: spacing.lg, gap: spacing.xxl },
  // Starts below the stage's top edge: higher up the scroll view clipped its top.
  glow: { position: 'absolute', left: -40, right: -40, top: 0, height: 220 },
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
    ...illustrationShadow.vsGlow,
  },
  vsText: { ...type.titleSection, color: colors.textOnAccent, letterSpacing: -0.5 },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...elevation.high,
  },
  round: { gap: spacing.smPlus },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: colors.feedbackXp },
  timer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timerText: { ...type.labelStrong, color: colors.feedbackStreak, fontVariant: ['tabular-nums'] },
  // Two lines kept for both questions, so the card does not change height between rounds.
  question: { ...type.titleCard, color: colors.textPrimary, minHeight: (type.titleCard.lineHeight ?? 22) * 2 },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.brandPrimarySoft, overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: radii.bar, backgroundColor: colors.feedbackStreak },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  answerRight: { borderColor: colors.feedbackSuccess, backgroundColor: colors.feedbackSuccessSoft },
  answerText: { ...type.titleCard, color: colors.textPrimary },
  answerTextRight: { color: colors.feedbackSuccess },
});
