import { StyleSheet, Text, View } from 'react-native';

import { HeroSurface } from '@/components/bank/HeroCard';
import { Icon } from '@/components/bank/Icon';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { formatSigned, getWeeklyLeagueClock } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { RankingRow } from '@/types/duel';

type Props = {
  avatar: AvatarId;
  /** The user's weekly row, or null before their first human match of the week. */
  me: RankingRow | null;
  onOpenRankings: () => void;
};

/** "Weekly league" hero of the duel lobby: rank, Elo gained, progress to the top 10, link to rankings. */
export function LeagueCard({ avatar, me, onOpenRankings }: Props) {
  const clock = getWeeklyLeagueClock();
  const placesToTop10 = me && me.rank > 10 ? me.rank - 10 : 0;
  const places = `${placesToTop10} ${placesToTop10 === 1 ? 'place' : 'places'}`;
  const progress = me ? (me.rank <= 10 ? 1 : Math.max(0.15, Math.min(0.92, 1 - placesToTop10 / 20))) : 0.1;

  return (
    <HeroSurface style={styles.card} testID="duel-league-card">
      <View style={styles.top}>
        <PlayerAvatar avatar={avatar} size={60} ring="accent" />
        <View style={styles.copy}>
          <Text style={styles.overline}>WEEKLY LEAGUE · {clock.shortLabel.toUpperCase()} LEFT</Text>
          <Text style={styles.title}>{me ? `You're #${me.rank} this week` : "Join this week's league"}</Text>
          <Text style={styles.sub}>
            {me
              ? placesToTop10 > 0
                ? `${formatSigned(me.value)} Elo · ${places} to the top 10`
                : `${formatSigned(me.value)} Elo · In the top 10!`
              : 'Play a human match to earn weekly Elo'}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.progressCol}>
          <Text style={styles.progressLabel}>
            {me ? (placesToTop10 > 0 ? `Top 10 · ${places} to go` : 'Top 10 reached') : 'Weekly Elo · all categories'}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <Tappable
          onPress={onOpenRankings}
          accessibilityRole="button"
          accessibilityLabel="Open rankings"
          testID="duel-open-rankings"
          pressedScale={0.96}
          style={styles.rankings}
        >
          <Text style={styles.rankingsLabel}>Rankings</Text>
          <Icon name="arrow-right" size={14} color={colors.brandPrimary} />
        </Tappable>
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xxs },
  overline: { ...type.overline, color: colors.brandAccent },
  title: { ...type.titleSection, color: colors.textOnBrand },
  sub: { ...type.bodyDefault, color: colors.onBrandMuted },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressCol: { flex: 1, gap: spacing.sm },
  progressLabel: { ...type.labelDefault, color: colors.onBrandMuted },
  track: { height: 6, borderRadius: radii.bar, backgroundColor: colors.onBrandTile, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandAccent },
  rankings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radii.button,
  },
  rankingsLabel: { ...type.labelStrong, color: colors.textOnAccent },
});
