import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { RouteStation } from '@/components/categorizing/RouteStation';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { Categorization, FocusArea, Role } from '@/types/categorization';

const SUMMARY_AREAS = 3;
const BULLET = 6;
/** Centres the bullet on the first line of the 18 px body text. */
const BULLET_TOP = 6;

const AREA_LABEL: Record<FocusArea, string> = {
  saving: 'Saving',
  debt: 'Borrowing',
  investing: 'Investing',
  risk: 'Risk',
  retirement: 'Retirement',
};
const ROLE: Record<Role, string> = { novice: 'a beginner', intermediate: 'an intermediate', advanced: 'an advanced' };
const GAP_TITLE = { under: 'You know more than you think', over: 'There is more to explore here' };

type Props = {
  categorization: Categorization;
  /** Some answer was sent to be judged, so a fallback result means the judge was out of reach. */
  answersSent: boolean;
};

export function PathSummary({ categorization: c, answersSent }: Props) {
  const gap = c.confidenceGaps[0];
  const areas = c.focusAreas.slice(0, SUMMARY_AREAS);
  const start = c.startLesson;
  const startArea = start && c.checks.find((check) => check.lessonId === start.lessonId)?.area;
  const roleLines = c.explanation.find((e) => e.output === 'role')?.because ?? [];
  const judgeFailed = answersSent && c.source === 'fallback';

  const why = (area: FocusArea) =>
    c.checks.some((check) => check.area === area)
      ? `Your answer helped place ${AREA_LABEL[area]} on your path.`
      : 'It fits the answers you gave.';
  const icon = (name: 'eye' | 'user' | 'play') => <Feather name={name} size={16} color={colors.brandPrimary} />;

  return (
    <>
      <Text style={styles.overline}>Your learning path</Text>
      {judgeFailed && (
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
          {roleLines.map((line) => (
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
              <Text style={styles.muted}>{why(area)}</Text>
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
  dot: { width: BULLET, height: BULLET, borderRadius: BULLET / 2, backgroundColor: colors.brandPrimary, marginTop: BULLET_TOP },
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
