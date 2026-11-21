import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { formatPlayerName } from '@/lib/duel/meta';
import type { RankingRow } from '@/types/duel';

type Props = {
  row: RankingRow;
  isYou?: boolean;
  variant?: 'default' | 'pinned';
  testID?: string;
};

/** Weekly ranking list row (Figma 153:3824 / Duel v3 Frame 04-06). Weekly XP only, no Elo. */
export function RankingListItem({ row, isYou = false, variant = 'default', testID }: Props) {
  const isPinned = variant === 'pinned';
  const formattedName = formatPlayerName(row.name);
  const metaText = isYou ? `You · Lv ${row.level}` : `Lv ${row.level}`;

  return (
    <View
      style={[
        styles.row,
        isYou && styles.youRow,
        isPinned && styles.pinnedRow,
      ]}
      testID={testID ?? `ranking-row-${row.rank}`}
    >
      <Text style={[styles.rank, isYou && styles.youRank]} testID={`ranking-pos-${row.rank}`}>
        {row.rank}
      </Text>

      <PlayerAvatar avatar={row.avatar} size={36} ring={isYou ? 'accent' : 'none'} />

      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isYou && styles.youName]} numberOfLines={1}>
            {formattedName}
          </Text>
        </View>
        <Text style={styles.level}>{metaText}</Text>
      </View>

      <View style={styles.scoreWrap}>
        <Text style={[styles.xpValue, isYou && styles.youXpValue]}>
          {row.weeklyXp} XP
        </Text>
      </View>
    </View>
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
  youRow: {
    backgroundColor: colors.brandAccentSoft,
  },
  pinnedRow: {
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
  rank: {
    ...type.labelStrong,
    color: colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  youRank: {
    color: colors.brandPrimary,
    fontFamily: fonts.bold,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  youName: {
    color: colors.brandPrimary,
    fontFamily: fonts.bold,
  },
  level: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  xpValue: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
  youXpValue: {
    fontFamily: fonts.bold,
  },
});
