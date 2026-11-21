import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { RouteStation } from '@/components/categorizing/RouteStation';
import { colors, radii, spacing, type } from '@/constants/theme';
import { AREA_LABEL, areaWhy, SUMMARY_AREAS } from '@/lib/learningPath';
import type { Categorization, Role } from '@/types/categorization';

const ROLE: Record<Role, string> = { novice: 'a beginner', intermediate: 'an intermediate', advanced: 'an advanced' };
const GAP_TITLE = { under: 'You know more than you think', over: 'There is more to explore here' };

type Props = {
  categorization: Categorization;
  /** Answers were sent to be judged; with a fallback result that means the judge was out of reach. */
  answersSent: boolean;
};

/** The learning path as one route: what we saw, who you are, where to start, ending at the first lesson. */
export function PathSummary({ categorization: c, answersSent }: Props) {
  const gap = c.confidenceGaps[0];
  const areas = c.focusAreas.slice(0, SUMMARY_AREAS);
  const start = c.startLesson;
  const startArea = c.checks.find((k) => k.lessonId === start?.lessonId)?.area;
  const icon = (name: 'eye' | 'user' | 'play') => <Feather name={name} size={16} color={colors.brandPrimary} />;

  return (
    <>
      <Text style={styles.overline}>Your learning path</Text>
      {answersSent && c.source === 'fallback' && (
        <Text style={styles.muted} testID="summary-unchecked">
          We couldn&apos;t check your answers this time
        </Text>
      )}
      <View>
        {gap && (
          <RouteStation node={icon('eye')} testID="summary-gap">
            <View style={styles.gap}>
              <Text style={styles.gapOverline}>{AREA_LABEL[gap.area]}</Text>
              <Text style={styles.gapTitle} accessibilityRole="header">
                {GAP_TITLE[gap.direction]}
              </Text>
              <Text style={styles.gapBody}>{gap.because}</Text>
            </View>
          </RouteStation>
        )}
        <RouteStation node={icon('user')} last={!areas.length && !start}>
          <Text style={type.displayLarge} accessibilityRole="header">
            You&apos;re {ROLE[c.role]} learner
          </Text>
          {c.explanation
            .find((e) => e.output === 'role')
            ?.because.map((line) => (
              <View key={line} style={styles.bullet}>
                <View style={styles.dot} />
                <Text style={styles.because}>{line}</Text>
              </View>
            ))}
        </RouteStation>
        {areas.map((area, i) => (
          <RouteStation
            key={area}
            node={<Text style={type.labelStrong}>{i + 1}</Text>}
            last={i === areas.length - 1 && !start}
            testID={`summary-area-${area}`}
          >
            <View style={styles.card}>
              <Text style={type.titleCard}>{AREA_LABEL[area]}</Text>
              <Text style={styles.muted}>{areaWhy(area, c)}</Text>
            </View>
          </RouteStation>
        ))}
        {start && (
          <RouteStation node={icon('play')} end last>
            <Text style={type.titleCard}>{start.title}</Text>
            <Text style={styles.muted}>Your first lesson{startArea && ` · ${AREA_LABEL[startArea]}`}</Text>
          </RouteStation>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overline: { ...type.overline, color: colors.textMuted },
  muted: { ...type.labelDefault, color: colors.textMuted },
  gap: { backgroundColor: colors.brandPrimary, borderRadius: radii.card, padding: spacing.mdPlus, gap: spacing.xs },
  gapOverline: { ...type.overline, color: colors.onBrandMuted },
  gapTitle: { ...type.titleSection, color: colors.textOnBrand },
  gapBody: { ...type.bodyDefault, color: colors.textOnBrand },
  bullet: { flexDirection: 'row', gap: spacing.smPlus, alignItems: 'flex-start', marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brandPrimary, marginTop: spacing.sm - 2 },
  because: { ...type.bodyDefault, color: colors.textMuted, flex: 1 },
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.mdPlus,
    gap: spacing.xxs,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.card,
  },
});
