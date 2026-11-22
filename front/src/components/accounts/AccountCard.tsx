import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Avatar } from '@/components/profile/Avatar';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { DemoAccount } from '@/lib/session';

type Props = {
  account: DemoAccount;
  /** This account is being signed in: its chevron turns into a spinner. */
  picking: boolean;
  /** A sign-in is running, on this card or another one. */
  busy: boolean;
  onPress: () => void;
};

/** One demo account in the picker; an account open on another device is locked. */
export function AccountCard({ account, picking, busy, onPress }: Props) {
  const inUse = account.status === 'in-use';

  return (
    <Pressable
      testID={`account-${account.userId}`}
      accessibilityRole="button"
      accessibilityLabel={`${account.firstName} ${account.lastName}${inUse ? ', in use' : ''}`}
      accessibilityState={{ disabled: inUse || busy }}
      aria-disabled={inUse}
      disabled={inUse || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        inUse ? styles.cardInUse : styles.cardActive,
        pressed && !inUse && styles.cardPressed,
      ]}
    >
      <View style={[styles.content, inUse && styles.contentInUse]}>
        <Avatar id={account.avatar} size={52} />
        <Text style={styles.name} numberOfLines={1}>
          {account.firstName} {account.lastName}
        </Text>
      </View>
      <Trailing userId={account.userId} inUse={inUse} picking={picking} />
    </Pressable>
  );
}

function Trailing({ userId, inUse, picking }: { userId: string; inUse: boolean; picking: boolean }) {
  if (inUse) {
    return (
      <View style={styles.inUsePill} testID={`account-${userId}-in-use`}>
        <Icon name="lock" size={14} color={colors.textMuted} />
        <Text style={styles.inUseText}>In use</Text>
      </View>
    );
  }
  if (picking) return <ActivityIndicator size="small" color={colors.brandPrimary} />;
  return <Icon name="chevron-right" size={20} color={colors.textMuted} />;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    paddingVertical: spacing.mdPlus,
    paddingLeft: spacing.mdPlus,
    paddingRight: spacing.lg,
    gap: spacing.mdPlus,
  },
  cardActive: {
    ...elevation.low,
  },
  cardInUse: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardPressed: {
    backgroundColor: colors.brandPrimarySoft,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.mdPlus,
  },
  contentInUse: {
    opacity: 0.45,
  },
  name: {
    ...type.titleCard,
    color: colors.textPrimary,
    flex: 1,
  },
  inUsePill: {
    backgroundColor: colors.borderDefault,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.smPlus,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inUseText: {
    ...type.labelStrong,
    color: colors.textMuted,
  },
});
