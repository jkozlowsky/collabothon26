import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatNumber, formatSigned } from '@/lib/duel/meta';
import type { RankingRow } from '@/types/duel';

type Props = {
  row: RankingRow;
  /** Weekly values are Elo gained (signed, green/red); the others are Elo. */
  weekly: boolean;
  isYou: boolean;
  /** `pinned` is the highlighted "you" card under the list. */
  variant?: 'row' | 'pinned';
  testID?: string;
};

/** Rank, avatar, name with level and Elo, and the ranked value. */
export function RankingListItem({ row, weekly, isYou, variant = 'row', testID }: Props) {
  const pinned = variant === 'pinned';
  const valueColor = !weekly ? colors.textPrimary : row.value > 0 ? colors.feedbackSuccess : row.value < 0 ? colors.feedbackDanger : colors.textMuted;
  return (
    <View style={[styles.row, pinned && styles.pinned]} testID={testID}>
      <Text style={[styles.rank, pinned && styles.rankPinned]}>{row.rank}</Text>
      <PlayerAvatar avatar={row.avatar} size={40} />
      <View style={styles.body}>
        <Text style={type.titleCard} numberOfLines={1}>
          {isYou ? `${row.name} (you)` : row.name}
        </Text>
        <Text style={styles.meta}>
          Lv {row.level} · {formatNumber(row.elo)} Elo
        </Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{weekly ? formatSigned(row.value) : formatNumber(row.value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 60 },
  pinned: {
    backgroundColor: colors.brandAccentSoft,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.brandPrimary,
  },
  rank: { ...type.labelStrong, width: 24, textAlign: 'center', color: colors.textMuted },
  rankPinned: { color: colors.brandPrimary },
  body: { flex: 1, gap: spacing.xxs },
  meta: { ...type.labelDefault, color: colors.textMuted },
  value: type.titleCard,
});
