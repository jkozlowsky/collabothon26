import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DotTrack } from '@/components/duel/DotTrack';
import { LiveBadge } from '@/components/duel/LiveBadge';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { StatusChip } from '@/components/duel/StatusChip';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatPlayerName } from '@/lib/duel/meta';
import type { LocalDot } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';
import type { DotResult, PlayerCard } from '@/types/duel';

type Props = {
  youAvatar: AvatarId;
  youName?: string;
  youLevels?: Record<string, number>;
  rival: PlayerCard | null;
  currentCategory: string;
  yourDots: LocalDot[];
  rivalDots: DotResult[];
  yourScore: number;
  rivalScore: number;
  activeIndex: number | null;
  questionCount: number;
  /** A live duel against another human: shows the LIVE badge on the rival. */
  live?: boolean;
  /** The live rival disconnected; their remaining answers time out. */
  rivalLeft?: boolean;
};

/**
 * Compact Versus ScoreboardCard for in-match view.
 * Score is the hero (~28-32px, tabular numbers). 'VS' small above it.
 * LEFT: you (avatar, 'First L.', 'Lv N'), dot track under you.
 * RIGHT: rival (same, mirrored, right-aligned), dot track under rival.
 * Leader gets subtle accent ring on the avatar.
 */
export function ScoreboardCard({
  youAvatar,
  youName = 'You',
  youLevels,
  rival,
  currentCategory,
  yourDots,
  rivalDots,
  yourScore,
  rivalScore,
  activeIndex,
  questionCount: _questionCount,
  live = false,
  rivalLeft = false,
}: Props) {
  const reducedMotion = useReducedMotion();
  const youLevel = youLevels?.[currentCategory] ?? 1;
  const rivalLevel = rival?.levels?.[currentCategory] ?? 1;

  const formattedYouName = formatPlayerName(youName);
  const formattedRivalName = rival?.name ? formatPlayerName(rival.name) : '';

  // Leadership check
  const isYouLeading = rival !== null && yourScore > rivalScore;
  const isRivalLeading = rival !== null && rivalScore > yourScore;

  // Score pop animation
  const youScoreScale = useSharedValue(1);
  const rivalScoreScale = useSharedValue(1);

  const prevYourScoreRef = useRef(yourScore);
  const prevRivalScoreRef = useRef(rivalScore);

  useEffect(() => {
    if (prevYourScoreRef.current !== yourScore) {
      prevYourScoreRef.current = yourScore;
      if (!reducedMotion) {
        youScoreScale.value = withSequence(
          withTiming(1.25, { duration: 150 }),
          withTiming(1, { duration: 150 }),
        );
      }
    }
  }, [yourScore, reducedMotion, youScoreScale]);

  useEffect(() => {
    if (prevRivalScoreRef.current !== rivalScore) {
      prevRivalScoreRef.current = rivalScore;
      if (!reducedMotion) {
        rivalScoreScale.value = withSequence(
          withTiming(1.25, { duration: 150 }),
          withTiming(1, { duration: 150 }),
        );
      }
    }
  }, [rivalScore, reducedMotion, rivalScoreScale]);

  const animatedYouScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: youScoreScale.value }],
  }));

  const animatedRivalScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rivalScoreScale.value }],
  }));

  return (
    <View style={styles.card} testID="duel-scoreboard">
      <View style={styles.topRow}>
        {/* LEFT: You */}
        <View style={styles.playerCol}>
          <View style={styles.avatarRow}>
            <PlayerAvatar
              avatar={youAvatar}
              size={36}
              ring={isYouLeading ? 'accent' : 'none'}
            />
            <View style={styles.playerMeta}>
              <Text style={styles.playerName} numberOfLines={1}>
                {formattedYouName}
              </Text>
              <Text style={styles.levelMeta} numberOfLines={1}>
                Lv {youLevel}
              </Text>
            </View>
          </View>
          <View style={styles.dotTrackLeft}>
            <DotTrack dots={yourDots} activeIndex={activeIndex} onBrand testID="your-dots" />
          </View>
        </View>

        {/* CENTRE: Hero live score and VS above it */}
        <View style={styles.centreCol}>
          <Text style={styles.vsLabel}>VS</Text>
          <View style={styles.scoreRow}>
            <Animated.Text
              style={[styles.scoreHero, styles.yourScoreColor, animatedYouScoreStyle]}
              testID="duel-scoreboard-your-score"
            >
              {yourScore}
            </Animated.Text>
            <Text style={styles.scoreColon}>:</Text>
            <Animated.Text
              style={[styles.scoreHero, animatedRivalScoreStyle]}
              testID="duel-scoreboard-rival-score"
            >
              {rivalScore}
            </Animated.Text>
          </View>
        </View>

        {/* RIGHT: Rival or Solo */}
        {rival ? (
          <View style={[styles.playerCol, styles.playerRight]}>
            <View style={[styles.avatarRow, styles.avatarRowRight]}>
              <View style={[styles.playerMeta, styles.playerMetaRight]}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {formattedRivalName}
                </Text>
                <Text style={styles.levelMeta} numberOfLines={1}>
                  Lv {rivalLevel}
                </Text>
              </View>
              <PlayerAvatar
                avatar={rival.avatar}
                size={36}
                ring={isRivalLeading ? 'accent' : 'none'}
              />
            </View>
            <View style={styles.dotTrackRight}>
              <DotTrack
                dots={rivalDots}
                activeIndex={null}
                onBrand
                testID="rival-dots"
              />
            </View>
            {live && (
              <View style={styles.liveRow}>
                {rivalLeft ? (
                  <StatusChip
                    label="Rival disconnected · their remaining answers time out"
                    tone="offline"
                    icon="wifi-off"
                    testID="rival-left-chip"
                  />
                ) : (
                  <LiveBadge testID="rival-live-badge" />
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.playerCol, styles.playerRight]}>
            <View style={[styles.avatarRow, styles.avatarRowRight]}>
              <View style={[styles.playerMeta, styles.playerMetaRight]}>
                <Text style={styles.playerName}>Solo</Text>
                <Text style={styles.levelMeta}>Lv 1</Text>
              </View>
              <View style={styles.soloAvatarWrap}>
                <Text style={styles.soloAvatarText}>S</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  liveRow: {
    marginTop: spacing.xs,
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCol: {
    flex: 1,
    gap: spacing.xs,
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  playerMeta: {
    flexShrink: 1,
    gap: 1,
  },
  playerMetaRight: {
    alignItems: 'flex-end',
  },
  playerName: {
    ...type.labelStrong,
    color: colors.textOnBrand,
    fontSize: 13,
  },
  levelMeta: {
    ...type.labelTab,
    color: colors.onBrandMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  centreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  vsLabel: {
    ...type.labelDefault,
    color: colors.brandAccent,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreHero: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.textOnBrand,
  },
  yourScoreColor: {
    color: colors.feedbackSuccess,
  },
  scoreColon: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.onBrandMuted,
  },
  dotTrackLeft: {
    marginTop: 2,
  },
  dotTrackRight: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  soloAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloAvatarText: {
    ...type.labelStrong,
    color: colors.textOnBrand,
  },
});
