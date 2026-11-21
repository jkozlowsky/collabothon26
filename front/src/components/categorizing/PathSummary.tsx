import { StyleSheet, Text, View } from 'react-native';

import { AreaMap } from '@/components/categorizing/AreaMap';
import { IconTile } from '@/components/onboarding/ui';
import { RULE } from '@/constants/path';
import { AREAS, AREA_LABEL, SOLID_MIN_ANSWERS } from '@/constants/quickCheck';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useApi } from '@/hooks/useApi';
import type { Summary } from '@/lib/learningPath';
import { areaMarks } from '@/lib/quickCheck';
import { useCurrentUser } from '@/lib/user';
import type { Role } from '@/types/categorization';
import type { StoryPage } from '@/types/stories';

const BULLET = 6;
/** Centres the bullet on the first line of the 13 px body text. */
const BULLET_TOP = 6;

const ROLE: Record<Role, string> = { novice: 'a beginner', intermediate: 'an intermediate', advanced: 'an advanced' };
const GAP_TITLE = { under: 'You know more than you think', over: 'There is more to explore here' };
const ALIGNED = {
  title: 'How sure you felt matches your answers',
  body: 'On the areas we checked, your confidence and your answers line up.',
};

export function PathSummary({ categorization: c, chipped, counts = {} }: Summary) {
  const { userId } = useCurrentUser();
  const start = c.startLesson;
  const { data: stories } = useApi<StoryPage[]>(`/api/stories?userId=${encodeURIComponent(userId)}`);
  const lessons = start && stories?.find((s) => s.id === start.storyId)?.lessons;
  const stop = lessons ? lessons.findIndex((l) => l.id === start!.lessonId) + 1 : 0;
  const roleLines = c.explanation.find((e) => e.output === 'role')?.because ?? [];
  // A reload has no history, so the stored confidence stands in for "an answer carried a chip".
  const hasChip = chipped ?? Object.values(c.confidence).some((v) => v != null);
  const showAligned = c.profile !== null && !c.confidenceGaps.length && hasChip;
  const usedModel = c.sharedWithModel !== null;
  // After a reload the per-area answer counts are gone: Solid shows only when the whole path is ready for the next step.
  const marks = areaMarks(AREAS.filter((a) => a in c.mastery), c.mastery, c.confidence, counts, c.readyForNext ? SOLID_MIN_ANSWERS : 0);

  return (
    <>
      <Text style={styles.overline}>Your learning path</Text>
      {c.source === 'fallback' && usedModel && (
        <Text style={styles.muted} testID="summary-simple">
          We used a simpler check this time
        </Text>
      )}
      {c.confidenceGaps.map((gap) => (
        <View key={gap.area} style={styles.hero} testID={`summary-gap-${gap.area}`}>
          <Text style={styles.heroOverline}>{AREA_LABEL[gap.area]}</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {GAP_TITLE[gap.direction]}
          </Text>
          <Text style={styles.heroBody}>{gap.because}</Text>
        </View>
      ))}
      {showAligned && (
        <View style={styles.hero} testID="summary-aligned">
          <Text style={styles.heroOverline}>Confidence</Text>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {ALIGNED.title}
          </Text>
          <Text style={styles.heroBody}>{ALIGNED.body}</Text>
        </View>
      )}
      <Text style={type.displayLarge} accessibilityRole="header" testID="summary-role">
        You&apos;re {ROLE[c.role]} learner
      </Text>
      {c.answerCount > 0 ? (
        <Text style={styles.body} testID="summary-based-on">
          Based on {c.answerCount} answers and how sure you felt about each.
        </Text>
      ) : (
        roleLines.map((line) => (
          <View key={line} style={styles.bullet}>
            <View style={styles.dot} />
            <Text style={styles.body}>{line}</Text>
          </View>
        ))
      )}
      {start && (
        <View style={styles.lesson} testID="summary-first-lesson">
          <IconTile icon="play" active />
          <View style={styles.lessonText}>
            <Text style={styles.lessonOverline}>
              Your first stop{start.area && ` · ${AREA_LABEL[start.area]}`}
            </Text>
            <Text style={type.titleCard}>{start.title}</Text>
            <Text style={type.labelDefault}>
              {start.storyCity}
              {stop > 0 && ` · stop ${stop} of ${lessons!.length}`}
            </Text>
            {c.readyForNext && <Text style={type.labelDefault}>You&apos;re ready for the next lesson</Text>}
          </View>
        </View>
      )}
      {c.profile !== null && marks.length > 0 && (
        <View style={styles.map}>
          <Text style={styles.overline}>Your map</Text>
          <AreaMap marks={marks} testID="summary-map" />
        </View>
      )}
      <Text style={styles.muted} testID="summary-disclaimer">
        This picks lessons for you. It is not investment advice.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  overline: { ...type.overline, color: colors.textMuted },
  muted: { ...type.labelDefault, color: colors.textMuted },
  body: { ...type.bodyDefault, color: colors.textMuted },
  hero: { backgroundColor: colors.brandPrimary, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  heroOverline: { ...type.overline, color: colors.onBrandMuted },
  heroTitle: { ...type.titleSection, color: colors.textOnBrand },
  heroBody: { ...type.bodyDefault, color: colors.textOnBrand },
  map: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.smPlus, alignItems: 'flex-start' },
  dot: { width: BULLET, height: BULLET, borderRadius: BULLET / 2, backgroundColor: colors.brandPrimary, marginTop: BULLET_TOP },
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
