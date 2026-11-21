import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DuelPage } from '@/components/duel/DuelPage';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { ReviewCard } from '@/components/duel/ReviewCard';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { AvatarId } from '@/types/account';
import type { MatchEnd } from '@/types/duel';

type Props = {
  result: MatchEnd;
  youName?: string;
  youAvatar: AvatarId;
  onPlayAgain: () => void;
  onSeeRankings: () => void;
  onBackToLobby: () => void;
};

function getOutcomeTitle(outcome: MatchEnd['outcome'], isSolo: boolean): string {
  if (isSolo) return 'Practice complete';
  if (outcome === 'WIN') return 'You won!';
  if (outcome === 'DRAW') return 'Draw';
  return 'You lost';
}

function getOverline(outcome: MatchEnd['outcome'], isSolo: boolean): string {
  if (isSolo) return 'SOLO · NO XP';
  if (outcome === 'WIN') return 'DUEL WON';
  if (outcome === 'DRAW') return 'DUEL DRAW';
  return 'DUEL COMPLETE';
}

/** Result and review screen (Figma 157:4454). */
export function ResultView({ result, youName, youAvatar, onBackToLobby }: Props) {
  const isSolo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const total = result.review.length || 6;
  const outcomeTitle = getOutcomeTitle(result.outcome, isSolo);
  const overline = getOverline(result.outcome, isSolo);

  const scoreText = isSolo
    ? `${result.score} / ${total}`
    : `${result.score} : ${result.rivalScore ?? 0}`;

  const displayName = youName ?? result.you.name ?? 'You';

  return (
    <DuelPage
      testID="duel-result"
      footer={
        <Button
          label="Back to arena"
          onPress={onBackToLobby}
          testID="result-back-lobby"
        />
      }
    >
      {/* Navy Header Block */}
      <View style={styles.navyHeader} testID="result-navy-header">
        <Text style={styles.overline}>{overline}</Text>
        <Text style={styles.title} testID="result-heading">
          {outcomeTitle}
        </Text>

        {/* Players with avatar + name next to the score */}
        <View style={styles.playersScoreRow} testID="result-players-row">
          {/* You */}
          <View style={styles.playerSide}>
            <PlayerAvatar avatar={youAvatar} size={50} ring="accent" />
            <Text style={styles.playerName} numberOfLines={1} testID="result-you-name">
              {displayName}
            </Text>
          </View>

          {/* Middle: score + XP */}
          <View style={styles.scoreWrap}>
            <Text style={styles.score} testID="result-score">
              {scoreText}
            </Text>
            {result.xpGained > 0 && (
              <View style={styles.xpPill} testID="result-xp">
                <Feather name="zap" size={14} color={colors.textOnAccent} />
                <Text style={styles.xpPillText}>+{result.xpGained} XP</Text>
              </View>
            )}
          </View>

          {/* Rival / Solo */}
          {!isSolo && result.rival ? (
            <View style={styles.playerSide}>
              <PlayerAvatar avatar={result.rival.avatar} size={50} ring="xp" />
              <Text style={styles.playerName} numberOfLines={1} testID="result-rival-name">
                {result.rival.name}
              </Text>
            </View>
          ) : (
            <View style={styles.playerSide}>
              <View style={styles.soloPlaceholder}>
                <Feather name="target" size={24} color={colors.textOnBrand} />
              </View>
              <Text style={styles.playerName}>Solo</Text>
            </View>
          )}
        </View>
      </View>

      {/* Review Section */}
      <ReviewCard review={result.review} />
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  navyHeader: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  overline: {
    ...type.overline,
    color: colors.brandAccent,
  },
  title: {
    ...type.displayLarge,
    color: colors.textOnBrand,
    textAlign: 'center',
  },
  playersScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: spacing.sm,
  },
  playerSide: {
    alignItems: 'center',
    width: 80,
    gap: spacing.xs,
  },
  playerName: {
    ...type.labelStrong,
    color: colors.textOnBrand,
    textAlign: 'center',
    fontSize: 12,
  },
  scoreWrap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  score: {
    ...type.displayAmount,
    color: colors.brandAccent,
    textAlign: 'center',
  },
  soloPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderDefault,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  xpPillText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
