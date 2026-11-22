import Feather from '@expo/vector-icons/Feather';
import { useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icon } from '@/components/bank/Icon';
import { DotTrack } from '@/components/duel/DotTrack';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { CountUpText } from '@/components/duel/result/CountUpText';
import { colors, fonts, spacing, type } from '@/constants/theme';
import type { DotResult } from '@/types/duel';
import type { AvatarId } from '@/types/account';

export type ResultOutcome = 'WIN' | 'LOSS' | 'DRAW' | 'SOLO';

type Side = {
  name: string;
  avatar: AvatarId | null | undefined;
  isBot?: boolean;
  dots: DotResult[];
};

type Props = {
  outcome: ResultOutcome;
  you: Side;
  rival?: Side;
  /** Your score; shown as "you : rival", or "you / total" in solo. */
  score: number;
  rivalScore?: number;
  total: number;
  xpGained: number;
  /** Fireworks and cannons, drawn over the header. */
  overlay?: ReactNode;
  /** Solo only: how well the round went (100 % / at least 60 % / below); sets the headline. */
  soloTier?: 'full' | 'good' | 'low';
  /** Called when the XP pill's number has finished counting. */
  onXpDone?: () => void;
};

/** Header entrance timings (ms): the numbers below are the dopamine script for a win (spec §3). */
const T = { trophy: 200, headline: 450, score: 550, crown: 800, pill: 900, xp: 1000 };

function Crown() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24">
      <Path d="M2.5 8.5l4.5 4 5-8 5 8 4.5-4-1.8 11H4.3L2.5 8.5z" fill={colors.brandAccent} stroke={colors.brandAccent} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M4.3 21.5h15.4" stroke={colors.brandAccent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** The crown drops onto the avatar and bounces once. */
function DroppingCrown({ delayMs }: { delayMs: number }) {
  const reduced = useReducedMotion();
  const drop = useSharedValue(reduced ? 0 : -46);
  const opacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 120 }));
    drop.value = withDelay(delayMs, withSpring(0, { damping: 6, stiffness: 180, mass: 0.7 }));
  }, [reduced, delayMs, drop, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: drop.value }] }));
  return (
    <Animated.View style={[styles.crown, style]} testID="winner-crown">
      <Crown />
    </Animated.View>
  );
}

/** The winner's accent ring pulses (a soft glow breathing out) twice after the crown lands. */
function RingPulse({ size, delayMs }: { size: number; delayMs: number }) {
  const reduced = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    k.value = withDelay(delayMs, withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), 2));
  }, [reduced, delayMs, k]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - k.value), transform: [{ scale: 1 + 0.35 * k.value }] }));
  if (reduced) return null;
  return <Animated.View pointerEvents="none" style={[styles.pulse, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

type PlayerProps = { side: Side; role: string; winner: boolean; delayMs: number; nameTestID: string };

function Player({ side, role, winner, delayMs, nameTestID }: PlayerProps) {
  const size = winner ? 72 : 60;
  return (
    <View style={styles.player}>
      <View style={[styles.avatarStack, { height: winner ? 98 : 90 }]}>
        <View style={styles.crownSlot}>{winner && <DroppingCrown delayMs={delayMs} />}</View>
        <View style={{ width: size, height: size }}>
          {winner && <RingPulse size={size} delayMs={delayMs + 450} />}
          <PlayerAvatar avatar={side.avatar} isBot={side.isBot} size={size} ring={winner ? 'accent' : 'muted'} />
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1} testID={nameTestID}>
        {side.name}
      </Text>
      <Text style={styles.role}>{role}</Text>
      <DotTrack dots={side.dots} onBrand size={10} gap={5} />
    </View>
  );
}

/** Trophy badge: springs 0 → 1.15 → 1, wiggles 10°, then a glow ring pulses twice. */
function TrophyBadge({ delayMs }: { delayMs: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0);
  const wiggle = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    scale.value = withDelay(delayMs, withSequence(withTiming(1.15, { duration: 260, easing: Easing.out(Easing.cubic) }), withSpring(1, { damping: 8, stiffness: 240 })));
    wiggle.value = withDelay(delayMs + 260, withSequence(withTiming(10, { duration: 90 }), withTiming(-10, { duration: 140 }), withTiming(6, { duration: 110 }), withTiming(0, { duration: 90 })));
    glow.value = withDelay(delayMs + 700, withRepeat(withSequence(withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), 2));
  }, [reduced, delayMs, scale, wiggle, glow]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${wiggle.value}deg` }] }));
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - glow.value), transform: [{ scale: 1 + 0.9 * glow.value }] }));
  return (
    <View style={styles.trophyWrap} testID="result-trophy-badge">
      {!reduced && <Animated.View pointerEvents="none" style={[styles.trophyGlow, ring]} />}
      <Animated.View style={[styles.trophy, badge]}>
        <Icon name="trophy" size={28} color={colors.textOnAccent} />
      </Animated.View>
    </View>
  );
}

/** XP pill with a shine sweep and a small bump when its number lands. */
function XpPill({ xp, delayMs, onDone }: { xp: number; delayMs: number; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const shine = useSharedValue(0);
  const bump = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    pop.value = withDelay(delayMs, withSpring(1, { damping: 15, stiffness: 240 }));
    shine.value = withDelay(delayMs + 350, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }));
    bump.value = withDelay(delayMs + 1000, withSequence(withTiming(1.08, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 260 })));
  }, [reduced, delayMs, pop, shine, bump]);
  const pill = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: pop.value * bump.value }] }));
  const sweep = useAnimatedStyle(() => ({ opacity: shine.value > 0 && shine.value < 1 ? 0.7 : 0, transform: [{ translateX: -40 + shine.value * 140 }, { skewX: '-20deg' }] }));
  return (
    <Animated.View style={[styles.xpPill, pill]} testID="result-xp">
      <Feather name="zap" size={12} color={colors.textOnAccent} />
      <CountUpText prefix="+" suffix=" XP" value={xp} delayMs={delayMs + 100} durationMs={800} style={styles.xpPillText} onDone={onDone} />
      <Animated.View pointerEvents="none" style={[styles.shine, sweep]} />
    </Animated.View>
  );
}

/** Loss: the headline and score shake once, gently (6 px). */
function useShake(enabled: boolean, delayMs: number) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!enabled || reduced) return;
    x.value = withDelay(delayMs, withSequence(withTiming(-6, { duration: 70 }), withTiming(6, { duration: 110 }), withTiming(-4, { duration: 100 }), withTiming(0, { duration: 80 })));
  }, [enabled, reduced, delayMs, x]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
}

/**
 * The versus header (Figma frames 7–10): trophy (win), headline, you · score · rival, reward row.
 * Win gets the full show; draw fades and scales in; loss shakes once; solo pops softly.
 */
export function ResultHeader({ outcome, you, rival, score, rivalScore = 0, total, xpGained, soloTier = 'low', overlay, onXpDone }: Props) {
  // Tolerates a missing provider (tests render the header alone).
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0 };
  const reduced = useReducedMotion();
  const solo = outcome === 'SOLO';
  const win = outcome === 'WIN';
  const loss = outcome === 'LOSS';

  const slide = useSharedValue(reduced ? 0 : -40);
  const fade = useSharedValue(reduced ? 1 : 0);
  const headline = useSharedValue(reduced ? 1 : win ? 0 : 0.85);
  const headlineOpacity = useSharedValue(reduced ? 1 : win ? 0 : 0);
  const scoreOpacity = useSharedValue(reduced ? 1 : 0);
  const scoreScale = useSharedValue(reduced ? 1 : 0.8);
  const shake = useShake(loss, 700);

  useEffect(() => {
    if (reduced) return;
    slide.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    fade.value = withTiming(1, { duration: 300 });
    // Win: overshoot scale-in. Others: a plain ease.
    const at = win ? T.headline : 150;
    headline.value = withDelay(at, win ? withSpring(1, { damping: 7, stiffness: 190 }) : withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    headlineOpacity.value = withDelay(at, withTiming(1, { duration: 160 }));
    scoreOpacity.value = withDelay(win ? T.score : 250, withTiming(1, { duration: 220 }));
    scoreScale.value = withDelay(win ? T.score : 250, withSpring(1, { damping: 10, stiffness: 200 }));
  }, [reduced, win, slide, fade, headline, headlineOpacity, scoreOpacity, scoreScale]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: slide.value }] }));
  const headlineStyle = useAnimatedStyle(() => ({ opacity: headlineOpacity.value, transform: [{ scale: headline.value }] }));
  const scoreStyle = useAnimatedStyle(() => ({ opacity: scoreOpacity.value, transform: [{ scale: scoreScale.value }] }));

  const soloHeadline = soloTier === 'full' ? 'Perfect round!' : soloTier === 'good' ? 'Great round!' : 'Practice complete';
  const headlineText = solo ? soloHeadline : win ? 'You won!' : loss ? 'You lost' : 'Draw';
  const headlineColor = win ? colors.brandAccent : loss ? colors.feedbackDanger : colors.textOnBrand;

  const scoreBlock = (
    <Animated.View style={[styles.scoreBlock, solo && styles.scoreSolo, scoreStyle]}>
      <Animated.View style={shake}>
        {win || solo ? (
          <View style={styles.scoreRow} testID="result-score">
            <CountUpText value={score} delayMs={T.score} durationMs={900} style={styles.bigScore} testID="result-score-you" />
            <Text style={styles.bigScore}>{solo ? ` / ${total}` : ` : ${rivalScore}`}</Text>
          </View>
        ) : (
          <Text style={styles.bigScore} testID="result-score">
            {solo ? `${score} / ${total}` : `${score} : ${rivalScore}`}
          </Text>
        )}
      </Animated.View>
      <Text style={styles.caption}>correct answers</Text>
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.header, { paddingTop: Math.max(insets.top + spacing.sm, 60) }, containerStyle]} testID="result-navy-header">
      {win && <TrophyBadge delayMs={T.trophy} />}
      <Animated.View style={[loss && shake]}>
        <Animated.Text style={[styles.headline, { color: headlineColor }, headlineStyle]} accessibilityRole="header" testID="result-heading">
          {headlineText}
        </Animated.Text>
      </Animated.View>

      {solo ? (
        <View style={styles.solo}>
          <PlayerAvatar avatar={you.avatar} size={72} ring="muted" />
          <Text style={styles.name} testID="result-you-name">
            {you.name}
          </Text>
          <Text style={styles.role}>{xpGained > 0 ? 'You · solo' : 'You · solo, no XP'}</Text>
          {scoreBlock}
          <DotTrack dots={you.dots} onBrand size={10} gap={5} />
        </View>
      ) : (
        <View style={styles.versus} testID="result-players-row">
          <Player side={you} role="You" winner={win} delayMs={T.crown} nameTestID="result-you-name" />
          {scoreBlock}
          {rival && <Player side={rival} role="Rival" winner={loss} delayMs={T.crown} nameTestID="result-rival-name" />}
        </View>
      )}

      {(!solo || xpGained > 0) && (
        <View style={styles.reward}>
          <XpPill xp={xpGained} delayMs={win ? T.pill : 400} onDone={onXpDone} />
          <Text style={styles.rewardText}>5 XP per correct answer</Text>
        </View>
      )}
      {overlay}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.mdPlus,
    overflow: 'hidden',
  },
  trophyWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  trophy: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandAccent, alignItems: 'center', justifyContent: 'center' },
  trophyGlow: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandAccent },
  headline: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, textAlign: 'center' },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  player: { width: 108, alignItems: 'center', gap: 6 },
  avatarStack: { alignItems: 'center', justifyContent: 'flex-end' },
  crownSlot: { height: 30, marginBottom: -8, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  crown: { alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', backgroundColor: colors.brandAccent },
  name: { ...type.titleCard, color: colors.textOnBrand, textAlign: 'center' },
  role: { ...type.labelDefault, color: colors.onBrandMuted },
  scoreBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 56 },
  scoreSolo: { paddingBottom: 0, flex: 0, alignSelf: 'stretch' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  bigScore: { fontFamily: fonts.bold, fontSize: 56, lineHeight: 64, color: colors.textOnBrand, textAlign: 'center' },
  caption: { ...type.labelDefault, color: colors.onBrandMuted },
  solo: { alignItems: 'center', gap: 6 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandAccent,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.smPlus,
    overflow: 'hidden',
  },
  xpPillText: { ...type.labelStrong, color: colors.textOnAccent },
  shine: { position: 'absolute', top: -4, bottom: -4, width: 18, backgroundColor: colors.bgSurface },
  rewardText: { ...type.labelDefault, color: colors.onBrandMuted },
});
