import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';
import { formatPlayerName } from '@/lib/duel/meta';
import type { RankingRow } from '@/types/duel';

export type MedalCardRank = 1 | 2 | 3;

type Props = {
  row: RankingRow;
  rank: MedalCardRank;
  isYou?: boolean;
  testID?: string;
};

const MEDAL_STYLES = {
  1: {
    badgeBg: colors.medalGold,
    cardBg: colors.medalGoldSoft,
    cardBorder: colors.medalGold,
  },
  2: {
    badgeBg: colors.medalSilver,
    cardBg: colors.medalSilverSoft,
    cardBorder: colors.medalSilver,
  },
  3: {
    badgeBg: colors.medalBronze,
    cardBg: colors.medalBronzeSoft,
    cardBorder: colors.medalBronze,
  },
} as const;

/**
 * Top 3 medal card (Figma frame 166:5621, nodes 166:5433 / 166:5470 / 166:5497).
 * Gold/Silver/Bronze tints for top 3, highlighted with brandAccentSoft when state is 'me'.
 */
export function MedalCard({ row, rank, isYou = false, testID }: Props) {
  const medal = MEDAL_STYLES[rank];
  const formattedName = formatPlayerName(row.name);
  const metaText = isYou ? `You · Lv ${row.level}` : `Lv ${row.level}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isYou ? colors.brandAccentSoft : medal.cardBg,
          borderColor: isYou ? colors.brandPrimary : medal.cardBorder,
          borderWidth: isYou ? 2 : 1.5,
        },
      ]}
      testID={testID ?? `medal-card-${rank}`}
    >
      {/* 32px medal badge */}
      <View
        style={[styles.badge, { backgroundColor: medal.badgeBg }]}
        testID={`medal-pos-${rank}`}
      >
        <Text style={styles.badgeText}>{rank}</Text>
      </View>

      {/* 44px Explorer Avatar */}
      <PlayerAvatar avatar={row.avatar} size={44} ring={isYou ? 'accent' : 'none'} />

      {/* Middle info */}
      <View style={styles.main}>
        <Text style={[styles.name, isYou && styles.youName]} numberOfLines={1}>
          {formattedName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaText}
        </Text>
      </View>

      {/* Right XP */}
      <View style={styles.scoreWrap}>
        <Text style={[styles.xp, isYou && styles.youXp]}>{row.weeklyXp} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 72,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textOnBrand,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...type.titleCard,
    color: colors.textPrimary,
  },
  youName: {
    color: colors.brandPrimary,
    fontFamily: fonts.bold,
  },
  meta: {
    ...type.labelDefault,
    color: colors.textMuted,
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  xp: {
    ...type.labelStrong,
    color: colors.brandPrimary,
  },
  youXp: {
    fontFamily: fonts.bold,
  },
});
