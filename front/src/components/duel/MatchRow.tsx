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
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/** Row in the "Historia" tab (Figma 157:5411). */
export function MatchRow({ match, onPress }: Props) {
  const isSolo = match.mode === 'SOLO';
  const rivalName = isSolo ? 'Trening solo' : match.rival?.name ?? 'Rywal';
  const rivalAvatar = isSolo ? null : match.rival?.avatar;
  const isPending = match.status === 'PLAYING' || match.status === 'RIVAL_PLAYING';
  const categoriesText = match.categories
    .map((c) => getStoryCategoryMeta(c).name)
    .join(', ');

  const scoreText =
    match.status === 'PLAYING'
      ? 'W toku'
      : match.status === 'RIVAL_PLAYING'
        ? `${match.score} : —`
        : isSolo
          ? `${match.score} / 6`
          : `${match.score} : ${match.rivalScore ?? 0}`;

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rivalName}, wynik ${scoreText}`}
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
          {isPending && (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingText}>W toku</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  main: {
    flex: 1,
    gap: spacing.xxs,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...type.titleCard,
    color: colors.textPrimary,
    flex: 1,
  },
  score: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: {
    ...type.labelDefault,
    color: colors.textMuted,
    flex: 1,
  },
  xpPill: {
    backgroundColor: colors.brandAccentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  xpText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
  pendingPill: {
    backgroundColor: colors.brandPrimarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  pendingText: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
});
