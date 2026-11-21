import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getWeeklyLeagueClock } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { RankingRow } from '@/types/duel';

type Props = {
  avatar: AvatarId;
  me: RankingRow | null;
  onOpenRankings: () => void;
};

/** Weekly league navy card in the duel lobby (Figma 157:3800). */
export function LeagueCard({ avatar, me, onOpenRankings }: Props) {
  const clock = getWeeklyLeagueClock();
  const placesToTop10 = me && me.rank > 10 ? me.rank - 10 : 0;
  const progress = me ? (me.rank <= 10 ? 1 : Math.max(0.15, Math.min(0.92, 1 - placesToTop10 / 20))) : 0.1;

  return (
    <View style={styles.card} testID="duel-league-card">
      <View style={styles.top}>
        <PlayerAvatar avatar={avatar} size={54} ring="accent" />
        <View style={styles.copy}>
          <Text style={styles.overline}>LIGA TYGODNIOWA · {clock.shortLabel.toUpperCase()}</Text>
          <Text style={styles.title}>{me ? `Jesteś #${me.rank} w tym tygodniu` : 'Dołącz do ligi w tym tygodniu'}</Text>
          <Text style={styles.sub}>
            {me
              ? placesToTop10 > 0
                ? `+${me.weeklyXp} XP · ${placesToTop10} ${placesToTop10 === 1 ? 'miejsce' : placesToTop10 < 5 ? 'miejsca' : 'miejsc'} do top 10`
                : `+${me.weeklyXp} XP · W top 10 ligi!`
              : 'Zagraj pojedynek z rywalem, aby zdobyć punkty'}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.progressCol}>
          <Text style={styles.progressLabel}>
            {me ? (placesToTop10 > 0 ? `Do top 10 pozostało ${placesToTop10}` : 'Top 10 osiągnięte') : 'Tygodniowy ranking XP'}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <Tappable
          onPress={onOpenRankings}
          accessibilityRole="button"
          accessibilityLabel="Otwórz ranking"
          testID="duel-open-rankings"
          style={styles.rankingsBtn}
        >
          <Text style={styles.rankingsLabel}>Ranking</Text>
          <Feather name="arrow-right" size={14} color={colors.textOnAccent} />
        </Tappable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  overline: {
    ...type.overline,
    color: colors.brandAccent,
  },
  title: {
    ...type.titleSection,
    color: colors.textOnBrand,
  },
  sub: {
    ...type.bodyDefault,
    color: colors.onBrandMuted,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressCol: {
    flex: 1,
    gap: spacing.xs,
  },
  progressLabel: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
  },
  track: {
    height: 6,
    borderRadius: radii.bar,
    backgroundColor: colors.onBrandChip,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.bar,
    backgroundColor: colors.brandAccent,
  },
  rankingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    borderRadius: radii.button,
  },
  rankingsLabel: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
});
