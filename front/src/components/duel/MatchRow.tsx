import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { MatchSummary } from '@/types/duel';

type Props = {
  match: MatchSummary;
  onPress: () => void;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/** Row in the "History" tab (Figma 157:5411). */
export function MatchRow({ match, onPress }: Props) {
  const isSolo = match.mode === 'SOLO';
  const rivalName = isSolo ? 'Solo practice' : match.rival?.name ?? 'Rival';
  const rivalAvatar = isSolo ? null : match.rival?.avatar;
  const categoriesText = match.categories
    .map((c) => getStoryCategoryMeta(c).name)
    .join(', ');

  const scoreText =
    match.status === 'PLAYING'
      ? 'In progress'
      : match.status === 'RIVAL_PLAYING'
        ? `${match.score} : —`
        : isSolo
          ? `${match.score} / 6`
          : `${match.score} : ${match.rivalScore ?? 0}`;

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rivalName}, score ${scoreText}`}
      testID={`match-history-row-${match.matchId}`}
      style={styles.row}
    >
      <PlayerAvatar avatar={rivalAvatar} size={40} ring={isSolo ? 'none' : 'xp'} />

      <View style={styles.main}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {rivalName}
          </Text>
          <Text style={styles.score} testID={`match-row-score-${match.matchId}`}>
            {scoreText}
          </Text>
        </View>

        <View style={styles.bottomLine}>
          <Text style={styles.meta} numberOfLines={1}>
            {formatDate(match.startedAt)} · {categoriesText}
          </Text>
          {match.xpGained > 0 && (
            <View style={styles.xpPill}>
              <Text style={styles.xpText}>+{match.xpGained} XP</Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  score: {
    ...type.titleCard,
    color: colors.brandPrimary,
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    ...type.labelDefault,
    color: colors.textMuted,
    flex: 1,
  },
  xpPill: {
    backgroundColor: colors.brandAccentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  xpText: {
    ...type.labelTab,
    color: colors.brandPrimary,
    fontWeight: '700',
  },
});
