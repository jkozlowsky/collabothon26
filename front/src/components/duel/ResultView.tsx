import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { CategoryXpRow } from '@/components/duel/CategoryXpRow';
import { Confetti } from '@/components/duel/Confetti';
import { DuelPage } from '@/components/duel/DuelPage';
import { LevelUpOverlay } from '@/components/duel/LevelUpOverlay';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { ReviewCard } from '@/components/duel/ReviewCard';
import { Tappable } from '@/components/onboarding/ui';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { haptic, playSound } from '@/lib/duel/feedback';
import { formatPlayerName } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { CategoryMatchEnd, MatchEnd } from '@/types/duel';

type Props = {
  result: MatchEnd;
  youName?: string;
  youAvatar?: AvatarId;
  onPlayAgain?: () => void;
  onSeeRankings?: () => void;
  onBackToLobby: () => void;
};

function CrownIcon() {
  return (
    <View style={styles.crownWrap} testID="winner-crown">
      <Svg width={20} height={16} viewBox="0 0 24 20" fill={colors.brandAccent}>
        <Path d="M2 17h20v2H2v-2zm1-13l4 6 5-8 5 8 4-6v11H3V4z" fill={colors.brandAccent} />
      </Svg>
    </View>
  );
}

function DotTrack({ dots }: { dots: (boolean | null)[] }) {
  return (
    <View style={styles.dotTrack}>
      {dots.slice(0, 6).map((dot, idx) => (
        <View
          key={idx}
          style={[
            styles.dot,
            dot === true && styles.dotCorrect,
            dot === false && styles.dotWrong,
          ]}
        />
      ))}
    </View>
  );
}

function normalizeCategories(
  categories: (CategoryMatchEnd | string)[] | undefined,
  xpByCategory: Record<string, number> | undefined
): CategoryMatchEnd[] {
  if (!categories || categories.length === 0) {
    if (!xpByCategory) return [];
    return Object.entries(xpByCategory).map(([story, xp]) => ({
      story,
      xpGained: xp,
      xpBefore: 0,
      xpAfter: xp,
      levelBefore: 1,
      levelAfter: 1,
      xpIntoLevelAfter: xp,
      xpForLevelAfter: 100,
    }));
  }

  return categories.map((cat) => {
    if (typeof cat === 'string') {
      const gained = xpByCategory?.[cat] ?? 0;
      return {
        story: cat,
        xpGained: gained,
        xpBefore: 0,
        xpAfter: gained,
        levelBefore: 1,
        levelAfter: 1,
        xpIntoLevelAfter: gained,
        xpForLevelAfter: 100,
      };
    }
    return cat;
  });
}

/** Result and review screen (Figma frames 07–10, nodes 166:7608 / 166:8955 / 166:7903 / 166:8085). */
export function ResultView({
  result,
  youName,
  youAvatar,
  onSeeRankings,
  onBackToLobby,
}: Props) {
  const isSolo = result.mode === 'SOLO' || result.outcome === 'SOLO';
  const outcome = result.outcome;
  const isWin = outcome === 'WIN';
  const isLoss = outcome === 'LOSS';

  const total = result.review.length || 6;
  const reducedMotion = useReducedMotion();

  const isTest = process.env.NODE_ENV === 'test';
  const [displayedXp, setDisplayedXp] = useState(
    reducedMotion || isTest ? result.xpGained : 0
  );
  const [levelUpDismissed, setLevelUpDismissed] = useState(false);

  const categories = normalizeCategories(result.categories, result.xpByCategory);
  const levelUpCategories = categories.filter((c) => c.levelAfter > c.levelBefore);

  // Sound and haptic on win
  useEffect(() => {
    if (isWin) {
      playSound('win');
      haptic('success');
    }
  }, [isWin]);

  // XP count-up animation
  useEffect(() => {
    if (reducedMotion || isTest || result.xpGained <= 0) {
      return;
    }

    const durationMs = 800;
    const steps = 20;
    const intervalMs = durationMs / steps;
    const increment = result.xpGained / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= result.xpGained) {
        setDisplayedXp(result.xpGained);
        clearInterval(timer);
      } else {
        setDisplayedXp(Math.round(current));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTest, reducedMotion, result.xpGained]);

  // Dot results for you
  const youDots: (boolean | null)[] = result.review.map((r) => r.correct);
  while (youDots.length < 6) youDots.push(null);

  // Dot results for rival: synthesize from rivalScore if not provided
  const rivalDots: (boolean | null)[] = [];
  const rivalScore = result.rivalScore ?? 0;
  for (let i = 0; i < 6; i++) {
    rivalDots.push(i < rivalScore ? true : false);
  }

  const rawYouName =
    result.you?.name && result.you.name.includes(' ')
      ? result.you.name
      : (youName ?? result.you?.name ?? 'Alex');
  const youDisplayName = formatPlayerName(rawYouName);
  const rivalDisplayName = formatPlayerName(result.rival?.name ?? 'Ola');

  // Outcome headlines
  function getHeadline() {
    if (isSolo) return 'Practice complete';
    if (isWin) return 'You won!';
    if (isLoss) return 'You lost';
    return 'Draw';
  }

  function getHeadlineColor() {
    if (isWin) return colors.brandAccent;
    if (isLoss) return colors.feedbackDanger;
    return colors.textOnBrand;
  }

  const scoreText = isSolo
    ? `${result.score} / ${total}`
    : `${result.score} : ${result.rivalScore ?? 0}`;

  return (
    <View style={styles.rootContainer}>
      <DuelPage
      testID="duel-result"
      footer={
        <View style={styles.footerContainer}>
          <Button
            label="Back to arena"
            onPress={onBackToLobby}
            testID="result-back-lobby"
          />
          {onSeeRankings && (
            <Tappable
              onPress={onSeeRankings}
              style={styles.seeRankingsLink}
              testID="result-see-rankings"
              accessibilityRole="button"
              accessibilityLabel="See ranking"
            >
              <Text style={styles.seeRankingsText}>See ranking</Text>
            </Tappable>
          )}
        </View>
      }
    >
      {/* Generous confetti on win (~90 pieces, burst + rain) */}
      {isWin && <Confetti count={90} origin="center" testID="result-confetti" />}

      {/* Versus Header Block */}
      <View style={styles.navyHeader} testID="result-navy-header">
        {/* Win only: Trophy badge (56px brand/accent circle) */}
        {isWin && (
          <View style={styles.trophyBadge} testID="result-trophy-badge">
            <Feather name="award" size={28} color={colors.brandPrimary} />
          </View>
        )}

        {/* Outcome Headline */}
        <Text
          style={[styles.headline, { color: getHeadlineColor() }]}
          testID="result-heading"
        >
          {getHeadline()}
        </Text>

        {/* Versus row / Solo row */}
        {isSolo ? (
          <View style={styles.soloWrap}>
            <PlayerAvatar avatar={youAvatar ?? result.you.avatar} size={72} ring="accent" />
            <Text style={styles.playerName} testID="result-you-name">
              {youDisplayName}
            </Text>
            <Text style={styles.playerRole}>You · solo, no XP</Text>

            <View style={styles.scoreBlock}>
              <Text style={styles.bigScore} testID="result-score">
                {scoreText}
              </Text>
              <Text style={styles.correctAnswersCaption}>correct answers</Text>
            </View>

            <DotTrack dots={youDots} />
          </View>
        ) : (
          <View style={styles.versusRow} testID="result-players-row">
            {/* You (Left) */}
            <View style={styles.sidePlayer}>
              {isWin && <CrownIcon />}
              <PlayerAvatar
                avatar={youAvatar ?? result.you.avatar}
                size={isWin ? 72 : 60}
                ring={isWin ? 'accent' : 'none'}
              />
              <Text style={styles.playerName} numberOfLines={1} testID="result-you-name">
                {youDisplayName}
              </Text>
              <Text style={styles.playerRole}>You</Text>
              <DotTrack dots={youDots} />
            </View>

            {/* Score in middle */}
            <View style={styles.scoreBlock}>
              <Text style={styles.bigScore} testID="result-score">
                {scoreText}
              </Text>
              <Text style={styles.correctAnswersCaption}>correct answers</Text>
            </View>

            {/* Rival (Right) */}
            <View style={styles.sidePlayer}>
              {isLoss && <CrownIcon />}
              <PlayerAvatar
                avatar={result.rival?.avatar}
                size={isLoss ? 72 : 60}
                ring={isLoss ? 'accent' : 'none'}
              />
              <Text style={styles.playerName} numberOfLines={1} testID="result-rival-name">
                {rivalDisplayName}
              </Text>
              <Text style={styles.playerRole}>Rival</Text>
              <DotTrack dots={rivalDots} />
            </View>
          </View>
        )}

        {/* Reward row (Win / Loss / Draw) */}
        {!isSolo && (
          <View style={styles.rewardRow}>
            <View style={styles.xpPill} testID="result-xp">
              <Feather name="zap" size={14} color={colors.textOnAccent} />
              <Text style={styles.xpPillText}>+{displayedXp} XP</Text>
            </View>
            <Text style={styles.rewardCaption}>5 XP per correct answer</Text>
          </View>
        )}
      </View>

      {/* XP Card: Per-category progress */}
      {!isSolo && categories.length > 0 && (
        <View style={styles.xpCard} testID="result-xp-card">
          <View style={styles.xpCardHeader}>
            <Text style={styles.xpCardTitle}>Category progress</Text>
            <Text style={styles.xpCardTotal}>+{displayedXp} XP total</Text>
          </View>

          <View style={styles.categoryList}>
            {categories.map((cat, idx) => (
              <CategoryXpRow
                key={`${cat.story}-${idx}`}
                item={cat}
                delayMs={idx * 200 + 400}
              />
            ))}
          </View>
        </View>
      )}

      {/* Review Section */}
      <ReviewCard review={result.review} />
    </DuelPage>

    {/* Level-Up Full-screen Overlay in sequence */}
    {!levelUpDismissed && levelUpCategories.length > 0 && (
      <LevelUpOverlay
        categories={levelUpCategories}
        onDismiss={() => setLevelUpDismissed(true)}
      />
    )}
  </View>
);
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  navyHeader: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  trophyBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
  },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.sm,
  },
  sidePlayer: {
    alignItems: 'center',
    width: 90,
    gap: spacing.xxs,
  },
  crownWrap: {
    marginBottom: -4,
  },
  playerName: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textOnBrand,
    textAlign: 'center',
  },
  playerRole: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    fontSize: 11,
  },
  scoreBlock: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  bigScore: {
    fontFamily: fonts.bold,
    fontSize: 56,
    lineHeight: 62,
    color: colors.textOnBrand,
    textAlign: 'center',
  },
  correctAnswersCaption: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    fontSize: 12,
  },
  dotTrack: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onBrandHairline,
  },
  dotCorrect: {
    backgroundColor: colors.feedbackSuccess,
  },
  dotWrong: {
    backgroundColor: colors.feedbackDanger,
  },
  soloWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  rewardRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  xpPillText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textOnAccent,
  },
  rewardCaption: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
    fontSize: 12,
  },
  xpCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
  },
  xpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.sm,
  },
  xpCardTitle: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  xpCardTotal: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.brandPrimary,
  },
  categoryList: {
    gap: spacing.sm,
  },
  footerContainer: {
    gap: spacing.sm,
    width: '100%',
  },
  seeRankingsLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  seeRankingsText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
    textDecorationLine: 'underline',
  },
});
