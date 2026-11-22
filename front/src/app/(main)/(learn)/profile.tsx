import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BankScreen } from '@/components/bank/BankScreen';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { Section } from '@/components/bank/Section';
import { BigButton, Tappable } from '@/components/onboarding/ui';
import { Avatar, DEFAULT_AVATAR } from '@/components/profile/Avatar';
import { AvatarPickerSheet } from '@/components/profile/AvatarPickerSheet';
import { StreakCard } from '@/components/profile/StreakCard';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';

/** Pause before the streak number flips, so the user sees the old value first. */
const BUMP_DELAY_MS = 450;

export default function ProfileScreen() {
  const { account, stats, streakBump, clearStreakBump, setAvatar, resetProgress } = useAccount();
  const { reset } = useOnboarding();
  const { state } = useBank();
  const [picking, setPicking] = useState(false);
  // While a bump is pending the old value shows; on focus it flips to the new one with a pop.
  const [bumped, setBumped] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!streakBump) return;
      const t = setTimeout(() => {
        clearStreakBump();
        setBumped((k) => k + 1);
      }, BUMP_DELAY_MS);
      return () => clearTimeout(t);
    }, [streakBump, clearStreakBump]),
  );

  // The bank owns the name; before the account loads (or offline) show the bank app's own copy of it.
  const name = account ? `${account.firstName} ${account.lastName}` : state.owner.name;
  const avatar = account?.avatar ?? DEFAULT_AVATAR;
  const streak = streakBump ? streakBump.from : (stats?.currentStreak ?? 0);
  const doneToday = !streakBump && !!stats?.doneToday;

  return (
    <BankScreen testID="screen-profile">
      <View style={styles.identity}>
        <Tappable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel="Change avatar"
          pressedScale={0.95}
          testID="profile-avatar"
        >
          <Avatar id={avatar} size={104} />
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={14} color={colors.textOnAccent} />
          </View>
        </Tappable>
        <Text style={styles.name} testID="profile-name">
          {name}
        </Text>
      </View>

      <StreakCard stats={stats} streak={streak} doneToday={doneToday} bumped={bumped} />

      {stats && !doneToday && !streakBump && (
        <View style={styles.nudge} testID="streak-nudge">
          <Text style={styles.nudgeText}>
            {streak > 0 ? `Do a lesson today to keep your ${streak}-day streak.` : 'Do a lesson today to start a streak.'}
          </Text>
          <BigButton label="Start a lesson" onPress={() => router.navigate('/map')} testID="streak-start-lesson" />
        </View>
      )}

      <Section title="Settings">
        <ListCard>
          {/* Demo helper: onboarding shows again on the next Learn tap, and progress goes back to the seed. */}
          <ListRow
            icon="refresh"
            title="Restart onboarding"
            onPress={() => {
              reset();
              resetProgress();
              router.navigate('/');
            }}
            testID="restart-onboarding"
          />
        </ListCard>
      </Section>

      <AvatarPickerSheet visible={picking} value={avatar} onPick={setAvatar} onClose={() => setPicking(false)} />
    </BankScreen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandAccent,
    borderWidth: 2,
    borderColor: colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...type.displayLarge, textAlign: 'center' },
  nudge: {
    gap: spacing.md,
    backgroundColor: colors.brandAccentSoft,
    borderColor: colors.brandAccent,
    borderWidth: 1.5,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  nudgeText: type.titleCard,
});
