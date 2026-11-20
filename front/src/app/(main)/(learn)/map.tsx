import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AsyncContent } from '@/components/AsyncContent';
import { Icon } from '@/components/bank/Icon';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import { USER_ID } from '@/lib/user';
import type { LessonSummary } from '@/types/lessons';

/** Plain lesson list until the globe and story screens land; they open the same /lesson/[id]. */
export default function MapScreen() {
  const { data, loading, error, reload } = useApi<LessonSummary[]>(`/api/lessons?userId=${encodeURIComponent(USER_ID)}`);
  // Coming back from a lesson unlocks the next one.
  useFocusEffect(reload);

  return (
    <Screen title="Learn" testID="screen-learn" scroll>
      <AsyncContent loading={loading} error={error} onRetry={reload}>
        {() => (
          <View style={styles.list}>
            {data?.map((lesson, i) => {
              const locked = lesson.status === 'locked';
              return (
                <Pressable
                  key={lesson.id}
                  testID={`lesson-${lesson.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: locked }}
                  disabled={locked}
                  onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed, locked && styles.locked]}
                >
                  <View style={[styles.tile, lesson.status === 'done' && styles.tileDone]}>
                    {locked ? (
                      <Icon name="lock" size={18} color={colors.storySlate} />
                    ) : lesson.status === 'done' ? (
                      <Icon name="check" size={18} color={colors.feedbackSuccess} />
                    ) : (
                      <Text style={styles.number}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.overline}>{lesson.place}</Text>
                    <Text style={styles.title}>{lesson.title}</Text>
                    <Text style={styles.meta}>
                      {lesson.minutes} min · <Text style={styles.xp}>+{lesson.xp} XP</Text>
                      {locked ? ' · Finish the previous lesson first' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  // Matches the Figma "Story Card" shell.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: 14,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  locked: { opacity: 0.6 },
  tile: { width: 44, height: 44, borderRadius: radii.tile, backgroundColor: colors.brandAccentSoft, alignItems: 'center', justifyContent: 'center' },
  tileDone: { backgroundColor: colors.feedbackSuccessSoft },
  number: { ...type.titleCard, color: colors.brandPrimary },
  cardBody: { flex: 1, gap: spacing.xs },
  overline: { ...type.overline, color: colors.textMuted },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  xp: { ...type.labelStrong, color: colors.feedbackXp },
});
