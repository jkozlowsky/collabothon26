import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';

type Props = {
  title: string;
  /** Icon drawn inside the 44 px tile. */
  icon: ReactNode;
  /** Tile fill: yellow for Ranking, petrol for History (v4·1). */
  tone: 'accent' | 'primary';
  /** Small chip next to the chevron ("↑ 2"). */
  badge?: string;
  onPress: () => void;
  testID: string;
};

/** Ranking / History tile (Figma v4·1): icon tile, chevron and a short title only. */
export function LobbyTile({ title, icon, tone, badge, onPress, testID }: Props) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      containerStyle={styles.wrap}
      style={styles.tile}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: tone === 'accent' ? colors.brandAccent : colors.brandPrimary }]}>{icon}</View>
        <View style={styles.right}>
          {badge ? (
            <View style={styles.badge}>
              <Feather name="arrow-up" size={12} color={colors.feedbackSuccess} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tile: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.low,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 44, height: 44, borderRadius: radii.tile, alignItems: 'center', justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.feedbackSuccessSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...type.labelStrong, color: colors.feedbackSuccess },
  title: { ...type.titleSection, color: colors.textPrimary },
});
