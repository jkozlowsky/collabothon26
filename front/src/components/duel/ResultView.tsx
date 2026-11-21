import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DuelPage } from '@/components/duel/DuelPage';
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
  if (isSolo) return 'Trening ukończony';
  if (outcome === 'WIN') return 'Wygrałeś!';
  if (outcome === 'DRAW') return 'Remis';
  return 'Przegrałeś';
}

function getOverline(outcome: MatchEnd['outcome'], isSolo: boolean): string {
  if (isSolo) return 'SOLO · BEZ XP';
  if (outcome === 'WIN') return 'POJEDYNEK WYGRANY';
  if (outcome === 'DRAW') return 'POJEDYNEK ZREMISOWANY';
  return 'POJEDYNEK ZAKOŃCZONY';
}

/** Result and review screen (Figma 157:4454). */
export function ResultView({ result, onBackToLobby }: Props) {
  const isSolo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const total = result.review.length || 6;
  const outcomeTitle = getOutcomeTitle(result.outcome, isSolo);
  const overline = getOverline(result.outcome, isSolo);

  const scoreText = isSolo
    ? `${result.score} / ${total}`
    : `${result.score} : ${result.rivalScore ?? 0}`;

  return (
    <DuelPage
      testID="duel-result"
      footer={
        <Button
          label="Wróć do areny"
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
    gap: spacing.xs,
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
  score: {
    ...type.displayAmount,
    color: colors.brandAccent,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  xpPillText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
