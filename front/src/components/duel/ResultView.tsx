import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { DeltaStatCard } from '@/components/duel/DeltaStatCard';
import { DuelHeading } from '@/components/duel/DuelHeading';
import { DuelPage } from '@/components/duel/DuelPage';
import { ReviewCard } from '@/components/duel/ReviewCard';
import { StatusChip } from '@/components/duel/StatusChip';
import { VersusHero } from '@/components/duel/VersusHero';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { formatNumber, formatSigned, getCategoryMeta } from '@/lib/duel/meta';
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

const OVERLINE = { WIN: 'DUEL WON', DRAW: 'DUEL DRAW', LOSS: 'DUEL FINISHED', SOLO: 'SOLO FINISHED' } as const;

function heading(outcome: MatchEnd['outcome'], name?: string) {
  if (outcome === 'WIN') return name ? `You won, ${name}` : 'You won!';
  if (outcome === 'DRAW') return "It's a draw";
  if (outcome === 'SOLO') return 'Nice practice';
  return name ? `Good match, ${name}` : 'Good match';
}

/** End of a match: score, XP, Elo, level, and the review that teaches (Figma "Duel — Result"). */
export function ResultView({ result, youName, youAvatar, onPlayAgain, onSeeRankings, onBackToLobby }: Props) {
  const cat = getCategoryMeta(result.category);
  const total = result.review.length || 6;
  const isSolo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const elo = result.eloBefore !== null && result.eloAfter !== null ? { before: result.eloBefore, after: result.eloAfter } : null;
  const rival = result.rival;
  const rivalName = rival?.name ?? 'your rival';
  const rivalElo = rival?.elo != null ? ` (Elo ${formatNumber(rival.elo)})` : '';
  const verb = result.outcome === 'WIN' ? 'Beat' : result.outcome === 'DRAW' ? 'Drew with' : 'Played';
  const levelUp = result.levelAfter > result.levelBefore;

  return (
    <DuelPage
      testID="duel-result"
    >
      <View style={styles.top}>
        <DuelHeading overline={`${OVERLINE[result.outcome]} · ${cat.name.toUpperCase()}`} title={heading(result.outcome, youName)} titleTestID="result-heading">
          <StatusChip label={`+${result.xpGained} XP`} tone="xp" icon="zap" testID="result-xp" />
          <StatusChip label={`${result.score} / ${total} correct`} tone="success" icon="check" testID="result-score-chip" />
          {elo && <StatusChip label={`${formatSigned(elo.after - elo.before)} Elo`} tone="elo" icon="trophy" testID="result-elo-chip" />}
        </DuelHeading>
      </View>

      {isSolo ? (
        <View style={styles.soloCard} testID="result-solo-card">
          <View style={styles.soloTile}>
            <Icon name="target" size={22} color={colors.brandPrimary} />
          </View>
          <View style={styles.soloText}>
            <Text style={type.titleCard}>
              Solo · {result.score} / {total} correct
            </Text>
            <Text style={styles.muted}>XP for every right answer · no Elo</Text>
          </View>
        </View>
      ) : (
        <VersusHero
          testID="result-hero-card"
          you={{ avatar: youAvatar, label: 'You' }}
          rival={{ avatar: rival?.avatar, isBot: rival?.isBot, label: rival?.name ?? 'Rival' }}
        >
          <Text style={styles.outcome}>{result.outcome}</Text>
          <Text style={styles.score} testID="result-score">
            {result.score} : {result.rivalScore ?? 0}
          </Text>
          {result.outcome === 'DRAW' && (
            <Text style={styles.caption}>
              +{result.xpGained} XP · {elo ? 'Elo by expected score' : 'practice'}
            </Text>
          )}
          {rival?.isBot && result.outcome !== 'DRAW' && <Text style={styles.caption}>Practice · no Elo</Text>}
        </VersusHero>
      )}

      <View style={styles.stats}>
        {elo && (
          <DeltaStatCard
            testID="result-elo-card"
            overline="ELO · RANKED"
            before={formatNumber(elo.before)}
            after={formatNumber(elo.after)}
            caption={`${verb} ${rivalName}${rivalElo} in a ranked match.`}
          />
        )}
        <DeltaStatCard
          testID="result-level-card"
          overline={`LEVEL · ${cat.shortName.toUpperCase()}`}
          before={levelUp ? String(result.levelBefore) : undefined}
          after={levelUp ? String(result.levelAfter) : `Lv ${result.levelAfter}`}
          progress={result.xpForLevel > 0 ? result.xpIntoLevel / result.xpForLevel : 0}
          caption={`${result.xpIntoLevel} / ${result.xpForLevel} XP to level ${result.levelAfter + 1}`}
        />
      </View>

      <ReviewCard review={result.review} />

      <View style={styles.actions}>
        <Button label="Play again" onPress={onPlayAgain} testID="result-play-again" />
        <View style={styles.secondary}>
          <View style={styles.half}>
            <Button label="Rankings" variant="secondary" onPress={onSeeRankings} testID="result-see-rankings" />
          </View>
          <View style={styles.half}>
            <Button label="Lobby" variant="secondary" onPress={onBackToLobby} testID="result-back-lobby" />
          </View>
        </View>
      </View>
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  secondary: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  soloCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    ...elevation.low,
  },
  soloTile: {
    width: 44,
    height: 44,
    borderRadius: radii.tile,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloText: { flex: 1, gap: spacing.xxs },
  muted: { ...type.bodyDefault, color: colors.textMuted },
  outcome: { ...type.overline, color: colors.brandAccent },
  score: { ...type.displayAmount, color: colors.textOnBrand },
  caption: { ...type.labelDefault, color: colors.onBrandMuted, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md },
});
