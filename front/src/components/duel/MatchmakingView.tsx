import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DuelPage } from '@/components/duel/DuelPage';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import { getStoryCategoryMeta } from '@/lib/duel/meta';
import type { AvatarId } from '@/types/account';
import type { DuelMatchState } from '@/lib/duel/reducer';

type Props = {
  state: DuelMatchState;
  youAvatar: AvatarId;
  onCancel: () => void;
};

/** Matchmaking view while searching for a rival (Figma 157:3800). */
export function MatchmakingView({ state, youAvatar, onCancel }: Props) {
  const categoriesText = state.categories
    .map((c) => getStoryCategoryMeta(c).name)
    .join(', ');

  return (
    <DuelPage
      testID="duel-matchmaking"
      centered
      footer={
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          testID="matchmaking-cancel"
        />
      }
    >
      <View style={styles.card} testID="matchmaking-card">
        <View style={styles.avatarRow}>
          <PlayerAvatar avatar={youAvatar} size={64} ring="accent" />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.rivalSearchCircle}>
            <ActivityIndicator size="small" color={colors.brandAccent} />
          </View>
        </View>

        <Text style={styles.title} testID="matchmaking-title">
          Searching for rival…
        </Text>

        <Text style={styles.categories} numberOfLines={2}>
          Categories: {categoriesText}
        </Text>

        <View style={styles.tipRow}>
          <Feather name="info" size={14} color={colors.onBrandMuted} />
          <Text style={styles.tipText}>
            6 questions · no time pressure, accuracy counts
          </Text>
        </View>
      </View>
    </DuelPage>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandPrimary,
    borderRadius: radii.card,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vsBadge: {
    backgroundColor: colors.brandAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  vsText: {
    ...type.labelStrong,
    color: colors.textOnAccent,
  },
  rivalSearchCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.brandAccent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.titleSection,
    color: colors.textOnBrand,
  },
  categories: {
    ...type.bodyDefault,
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandPrimarySoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  tipText: {
    ...type.labelTab,
    color: colors.onBrandMuted,
  },
});
