import { StyleSheet, Text, View } from 'react-native';

import { IconTile, type as text } from '@/components/onboarding/ui';
import { RULE } from '@/constants/path';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import type { Summary } from '@/lib/learningPath';
import { useCurrentUser } from '@/lib/user';
import type { Role } from '@/types/categorization';
import type { StoryPage } from '@/types/stories';

const BULLET = 6;
/** Centres the bullet on the first line of the 13 px body text. */
const BULLET_TOP = 6;

const ROLE: Record<Role, string> = { novice: 'a beginner', intermediate: 'an intermediate', advanced: 'an advanced' };

/** Result first, then the one lesson to start. */
export function PathSummary({ categorization: c }: Summary) {
  const { userId } = useCurrentUser();
  const start = c.startLesson;
  const { data: stories } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  const lessons = start && stories?.find((s) => s.id === start.storyId)?.lessons;
  const stop = lessons ? lessons.findIndex((l) => l.id === start!.lessonId) + 1 : 0;
  const roleLines = c.explanation.find((e) => e.output === 'role')?.because ?? [];
  const usedModel = c.sharedWithModel !== null;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={text.display} accessibilityRole="header" testID="summary-role">
          You&apos;re {ROLE[c.role]} learner
        </Text>
        {c.answerCount > 0 ? (
          <Text style={styles.muted} testID="summary-based-on">
            Based on {c.answerCount} answers and what your account shows.
          </Text>
        ) : (
          roleLines.map((line) => (
            <View key={line} style={styles.bullet}>
              <View style={styles.dot} />
              <Text style={styles.body}>{line}</Text>
            </View>
          ))
        )}
        {c.source === 'fallback' && usedModel && (
          <Text style={styles.muted} testID="summary-simple">
            We used a simpler check this time
          </Text>
        )}
      </View>
      {start && (
        <View style={styles.lesson} testID="summary-first-lesson">
          <IconTile icon="play" active />
          <View style={styles.lessonText}>
            <Text style={styles.lessonOverline}>Your first stop</Text>
            <Text style={type.titleCard}>{start.title}</Text>
            <Text style={type.labelDefault}>
              {start.storyCity}
              {stop > 0 && ` · stop ${stop} of ${lessons!.length}`}
            </Text>
            {c.readyForNext && <Text style={type.labelDefault}>You&apos;re ready for the next lesson</Text>}
          </View>
        </View>
      )}
      <Text style={styles.muted} testID="summary-disclaimer">
        This picks lessons for you. It is not investment advice.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Result, first stop and disclaimer read as separate blocks.
  root: { gap: spacing.xl, paddingTop: spacing.lg },
  head: { gap: spacing.sm },
  muted: { ...type.labelDefault, color: colors.textMuted },
  body: { ...type.bodyDefault, color: colors.textMuted },
  bullet: {
    flexDirection: 'row',
    gap: spacing.smPlus,
    alignItems: 'flex-start',
  },
  dot: {
    width: BULLET,
    height: BULLET,
    borderRadius: BULLET / 2,
    backgroundColor: colors.brandPrimary,
    marginTop: BULLET_TOP,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdPlus,
    backgroundColor: colors.brandAccentSoft,
    borderWidth: RULE,
    borderColor: colors.brandPrimary,
    borderRadius: radii.card,
  },
  lessonText: { flex: 1, gap: spacing.xxs },
  lessonOverline: { ...type.overline, color: colors.brandPrimary },
});
