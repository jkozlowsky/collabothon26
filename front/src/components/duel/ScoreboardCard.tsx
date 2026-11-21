import { StyleSheet, Text, View } from 'react-native';

import { DotTrack } from '@/components/duel/DotTrack';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { StatusChip } from '@/components/duel/StatusChip';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { LocalDot, RivalProgress } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';
import type { DotResult, PlayerCard } from '@/types/duel';

type Props = {
  youAvatar: AvatarId;
  rival: PlayerCard;
  yourDots: LocalDot[];
  rivalProgress: RivalProgress | null;
  yourScore: number;
  rivalScore: number;
  /** Your current question (ring), or null while feedback shows. */
  activeIndex: number | null;
  questionCount: number;
};

/** Live score strip above the question: both players, their dots and the score. */
export function ScoreboardCard({ youAvatar, rival, yourDots, rivalProgress, yourScore, rivalScore, activeIndex, questionCount }: Props) {
  const rivalDots: DotResult[] = rivalProgress?.results ?? Array.from({ length: questionCount }, () => null);
  const rivalCurrent = !rivalProgress ? 0 : rivalProgress.answered < questionCount ? rivalProgress.answered : null;
  const rivalOffline = rivalProgress !== null && !rivalProgress.connected;

  return (
    <View style={styles.card} testID="duel-scoreboard">
      <View style={styles.main}>
        <PlayerAvatar avatar={youAvatar} size={40} ring="accent" />
        <View style={styles.player}>
          <Text style={styles.name} numberOfLines={1}>
            You
          </Text>
          <DotTrack dots={yourDots} activeIndex={activeIndex} testID="your-dots" />
        </View>

        <Text style={styles.score} testID="live-score">
          {yourScore} : {rivalScore}
        </Text>

        <View style={[styles.player, styles.playerRight]}>
          <Text style={styles.name} numberOfLines={1}>
            {rival.name}
          </Text>
          <DotTrack dots={rivalDots} activeIndex={rivalCurrent} testID="rival-dots" />
        </View>
        <PlayerAvatar avatar={rival.avatar} isBot={rival.isBot} size={40} ring="xp" dimmed={rivalOffline} />
      </View>

      {(rival.isBot || rivalOffline) && (
        <View style={styles.status}>
          {rival.isBot && <StatusChip label="Bot · practice, no Elo" tone="bot" icon="bot" testID="rival-bot-chip" />}
          {rivalOffline && <StatusChip label="Rival reconnecting…" tone="offline" icon="wifi-off" testID="rival-offline-chip" />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.low,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  player: { flex: 1, minWidth: 0, gap: spacing.xs },
  playerRight: { alignItems: 'flex-end' },
  name: type.labelStrong,
  score: { ...type.titleSection, color: colors.brandPrimary, paddingHorizontal: spacing.xxs },
  status: { alignItems: 'center' },
});
