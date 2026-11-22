import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BankScreen } from '@/components/bank/BankScreen';
import { HeroBackground } from '@/components/bank/HeroCard';
import { ListCard } from '@/components/bank/ListCard';
import { ListRow } from '@/components/bank/ListRow';
import { Section } from '@/components/bank/Section';
import { BigButton, motion, Tappable } from '@/components/onboarding/ui';
import { Avatar } from '@/components/profile/Avatar';
import { AvatarPickerSheet } from '@/components/profile/AvatarPickerSheet';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import { useAccount } from '@/hooks/useAccount';
import { useBank } from '@/hooks/useBank';
import { useOnboarding } from '@/hooks/useOnboarding';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** Pause before the streak number flips, so the user sees the old value first. */
const BUMP_DELAY_MS = 450;

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** Monday = 0, matching the API's week array. */
const todayIndex = () => (new Date().getDay() + 6) % 7;

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
  const avatar = account?.avatar ?? 'm1';
  const streak = streakBump ? streakBump.from : (stats?.currentStreak ?? 0);
  const doneToday = !streakBump && !!stats?.doneToday;
  const week = stats?.week ?? Array<boolean>(7).fill(false);
  const today = todayIndex();

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

      <View style={styles.hero} testID="streak-card">
        <HeroBackground />
        <Text style={styles.heroLabel}>Current streak</Text>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={36} color={doneToday ? colors.feedbackStreak : colors.onBrandMuted} />
          <Animated.Text key={bumped} style={[styles.streak, bumped > 0 && motion.pop]} testID="streak-value">
            {days(streak)}
          </Animated.Text>
        </View>
        <Text style={styles.heroLabel}>Longest: {days(stats?.longestStreak ?? 0)}</Text>

        <View style={styles.week}>
          {week.map((done, i) => (
            <View key={i} style={styles.day}>
              <View style={[styles.dot, done && styles.dotDone, i === today && styles.dotToday]}>
                {done && <Ionicons name="checkmark" size={14} color={colors.textOnBrand} />}
              </View>
              <Text style={styles.dayLabel}>{WEEKDAYS[i]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.heroLabel}>Total XP</Text>
            <Text style={styles.statValue} testID="total-xp">
              {stats?.totalXp ?? 0} XP
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.heroLabel}>Lessons completed</Text>
            <Text style={styles.statValue} testID="lessons-completed">
              {stats?.lessonsCompleted ?? 0}
            </Text>
          </View>
        </View>
      </View>

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
  hero: { borderRadius: radii.card, padding: spacing.lg, overflow: 'hidden', gap: spacing.xs, ...elevation.high },
  heroLabel: { ...type.labelDefault, color: colors.onBrandMuted },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streak: { ...type.displayAmount, color: colors.textOnBrand },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  day: { alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.onBrandTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.feedbackStreak },
  dotToday: { borderWidth: 2, borderColor: colors.brandAccent },
  dayLabel: { ...type.labelDefault, color: colors.onBrandMuted },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.onBrandTile, borderRadius: radii.button, paddingVertical: spacing.sm, paddingHorizontal: 10, gap: 2 },
  statValue: { ...type.labelStrong, color: colors.textOnBrand },
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
