import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatNumber, formatSigned } from '@/lib/duel/meta';
import type { RankingRow } from '@/types/duel';

type Props = { top3: [RankingRow, RankingRow, RankingRow]; weekly: boolean };

const PEDESTAL = { 1: 84, 2: 58, 3: 46 } as const;
const RING = { 1: 'accent', 2: 'muted', 3: 'xp' } as const;

/** Top three on pedestals, first in the middle. */
export function Podium({ top3, weekly }: Props) {
  const [first, second, third] = top3;
  return (
    <View style={styles.row} testID="rankings-podium">
      <Place row={second} place={2} weekly={weekly} />
      <Place row={first} place={1} weekly={weekly} />
      <Place row={third} place={3} weekly={weekly} />
    </View>
  );
}

function Place({ row, place, weekly }: { row: RankingRow; place: 1 | 2 | 3; weekly: boolean }) {
  const first = place === 1;
  return (
    <View style={styles.col}>
      <PlayerAvatar avatar={row.avatar} size={first ? 68 : 54} ring={RING[place]} />
      <Text style={styles.name} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={[styles.value, weekly && row.value > 0 && styles.gain, weekly && row.value < 0 && styles.loss]}>{weekly ? formatSigned(row.value) : formatNumber(row.value)}</Text>
      <View style={[styles.pedestal, { height: PEDESTAL[place] }, first ? styles.pedestalFirst : styles.pedestalOther]}>
        <Text style={[styles.place, first && styles.placeFirst]}>{place}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingTop: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: spacing.xs },
  name: { ...type.labelStrong, marginTop: spacing.xxs },
  value: { ...type.labelStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  gain: { color: colors.feedbackSuccess },
  loss: { color: colors.feedbackDanger },
  pedestal: {
    alignSelf: 'stretch',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pedestalFirst: { backgroundColor: colors.brandPrimary },
  pedestalOther: { backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderDefault },
  place: { ...type.titleSection, color: colors.textMuted },
  placeFirst: { color: colors.brandAccent },
});
