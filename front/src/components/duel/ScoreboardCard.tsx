import { StyleSheet, Text, View } from 'react-native';

import { DotTrack } from '@/components/duel/DotTrack';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { LocalDot } from '@/lib/duel/reducer';
import type { AvatarId } from '@/types/account';
import type { DotResult, PlayerCard } from '@/types/duel';

type Props = {
  youAvatar: AvatarId;
  youName?: string;
  youLevels?: Record<string, number>;
  rival: PlayerCard | null;
  currentCategory: string;
  yourDots: LocalDot[];
  rivalDots: DotResult[];
  yourScore: number;
  rivalScore: number;
  activeIndex: number | null;
  questionCount: number;
};

/** Navy scoreboard with both players and dot tracks (Figma 157:5467 / 157:5492). */
export function ScoreboardCard({
  youAvatar,
  youName = 'Ty',
  youLevels,
  rival,
  currentCategory,
  yourDots,
  rivalDots,
  yourScore,
  rivalScore,
  activeIndex,
  questionCount,
}: Props) {
  const catMeta = getStoryCategoryMeta(currentCategory);
  const youLevel = youLevels?.[currentCategory] ?? 1;
  const rivalLevel = rival?.levels?.[currentCategory] ?? 1;
  const rivalCurrent = rival ? rivalDots.filter((d) => d !== null).length : null;

  return (
    <View style={styles.card} testID="duel-scoreboard">
      {/* You */}
      <View style={styles.playerCol}>
        <PlayerAvatar avatar={youAvatar} size={36} ring="accent" />
        <View style={styles.playerMeta}>
          <Text style={styles.playerName} numberOfLines={1}>
            {youName}
          </Text>
          <Text style={styles.categoryMeta} numberOfLines={1}>
            Lv {youLevel} · {catMeta.name}
          </Text>
        </View>
        <DotTrack dots={yourDots} activeIndex={activeIndex} onBrand testID="your-dots" />
      </View>

      {/* Rival or Solo */}
      {rival ? (
        <View style={[styles.playerCol, styles.playerRight]}>
          <PlayerAvatar avatar={rival.avatar} size={36} ring="xp" />
          <View style={[styles.playerMeta, styles.playerMetaRight]}>
            <Text style={styles.playerName} numberOfLines={1}>
              {rival.name}
            </Text>
            <Text style={styles.categoryMeta} numberOfLines={1}>
              Lv {rivalLevel} · {catMeta.name}
            </Text>
          </View>
          <DotTrack
            dots={rivalDots}
            activeIndex={rivalCurrent !== null && rivalCurrent < questionCount ? rivalCurrent : null}
            onBrand
            testID="rival-dots"
          />
        </View>
      ) : (
        <View style={[styles.playerCol, styles.playerRight]}>
          <View style={styles.soloBadge}>
            <Text style={styles.soloText}>Trening Solo</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  playerCol: {
    flex: 1,
    gap: spacing.xs,
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  playerMeta: {
    gap: spacing.xxs,
  },
  playerMetaRight: {
    alignItems: 'flex-end',
  },
  playerName: {
    ...type.labelStrong,
    color: colors.textOnBrand,
  },
  categoryMeta: {
    ...type.labelDefault,
    color: colors.onBrandMuted,
  },
  soloBadge: {
    backgroundColor: colors.onBrandChip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  soloText: {
    ...type.labelStrong,
    color: colors.textOnBrand,
  },
});
