import { StyleSheet, Text, View } from 'react-native';

import { StatusChip } from '@/components/duel/StatusChip';
import { colors, spacing, type } from '@/constants/theme';
import { formatNumber } from '@/lib/duel/meta';

type Props = {
  firstName?: string;
  streak: number;
  xp: number;
};

/** Polish lobby header with streak and XP chips (Figma 157:3800). */
export function LobbyHeader({ firstName, streak, xp }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.greeting} numberOfLines={1} testID="duel-greeting">
          {firstName ? `Cześć ${firstName} · Pojedynki 1v1` : 'Pojedynki wiedzy 1v1'}
        </Text>
        <Text style={type.displayLarge} accessibilityRole="header">
          Gotowy na pojedynek?
        </Text>
      </View>
      <View style={styles.chips}>
        <StatusChip label={String(streak)} tone="streak" icon="flame" testID="duel-streak-chip" />
        <StatusChip label={`${formatNumber(xp)} XP`} tone="xp" icon="zap" testID="duel-xp-chip" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  text: { flex: 1, gap: spacing.xxs },
  greeting: { ...type.bodyDefault, color: colors.textMuted },
  chips: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs },
});
