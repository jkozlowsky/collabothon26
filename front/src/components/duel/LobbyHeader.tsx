import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useContext } from 'react';

import { Icon } from '@/components/bank/Icon';
import { PlayerAvatar } from '@/components/duel/PlayerAvatar';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { AvatarId } from '@/types/account';

type Props = {
  avatar: AvatarId;
  level: number;
};

/** Navy lobby header (Figma v4·1): avatar, "Duel arena" and the level pill. No subtitle lines. */
export function LobbyHeader({ avatar, level }: Props) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0 };
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]} testID="duel-lobby-header">
      <PlayerAvatar avatar={avatar} size={56} ring="accent" />
      <Text style={styles.title} accessibilityRole="header">
        Duel arena
      </Text>
      <View style={styles.pill} testID="duel-level-pill">
        <Icon name="zap" size={14} color={colors.textOnAccent} />
        <Text style={styles.pillText}>Lv {level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: { ...type.displayLarge, color: colors.textOnBrand, flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandAccent,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  pillText: { ...type.labelStrong, color: colors.textOnAccent },
});
