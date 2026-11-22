import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HeroBackground } from '@/components/bank/HeroCard';
import { motion } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { Stats } from '@/types/account';

type Props = {
  /** Null until the stats load: the card then shows zeros. */
  stats: Stats | null;
  /** The streak to show: still the old value while a bump is pending. */
  streak: number;
  doneToday: boolean;
  /** Grows with every streak bump: the number remounts and pops. */
  bumped: number;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** Monday = 0, matching the API's week array. */
const todayIndex = () => (new Date().getDay() + 6) % 7;

/** Navy streak card of the profile: current and longest streak, this week's days, total XP and lessons. */
export function StreakCard({ stats, streak, doneToday, bumped }: Props) {
  const week = stats?.week ?? Array<boolean>(7).fill(false);
  const today = todayIndex();

  return (
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
  );
}

const styles = StyleSheet.create({
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
  stat: {
    flex: 1,
    backgroundColor: colors.onBrandTile,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.smPlus,
    gap: spacing.xxs,
  },
  statValue: { ...type.labelStrong, color: colors.textOnBrand },
});
