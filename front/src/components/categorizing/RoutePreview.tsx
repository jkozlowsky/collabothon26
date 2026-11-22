import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { motion } from '@/components/onboarding/ui';
import { skyline, StoryLandmark } from '@/components/StoryLandmark';
import { GLYPH, RULE } from '@/constants/path';
import { colors, radii, spacing, storyColors, tints, type } from '@/constants/theme';
import type { StartLesson } from '@/types/categorization';
import type { StoryPage } from '@/types/stories';

const MARKER = 32;
const TRACK = 4;
/** Room for the tallest landmark. */
const HERO_HEIGHT = 152;
/** Low enough that the skyline stays under the text and the landmark stands above it. */
const SKYLINE_SCALE = 0.35;
const STAGGER_MS = 50;

type Props = { story: StoryPage; start: StartLesson; ready: boolean };

/** The start story's city and all its stops. Display only. */
export function RoutePreview({ story, start, ready }: Props) {
  const reduced = useReducedMotion();
  const accent = storyColors[story.color] ?? colors.storySlate;
  const tint = tints[story.color] ?? tints.slate;
  const filled = { backgroundColor: accent };

  return (
    <View style={styles.root} testID="summary-route">
      <View style={[styles.hero, { backgroundColor: tint }]}>
        <View style={styles.art} aria-hidden>
          <View style={styles.skyline}>
            {skyline(story.city).map((height, i) => (
              <View key={i} style={[styles.building, { height: height * SKYLINE_SCALE, backgroundColor: tint }]} />
            ))}
          </View>
          {story.landmark ? (
            <StoryLandmark kind={story.landmark.kind} at={story.landmark.at} color={tint} />
          ) : (
            <Feather name={story.icon} size={MARKER} color={accent} style={styles.icon} />
          )}
        </View>
        <View style={styles.heading}>
          <Text style={[styles.city, { color: accent }]}>{story.city}</Text>
          <Text style={type.titleSection}>{story.area ?? story.category}</Text>
          <Text style={styles.topic}>{story.topic}</Text>
        </View>
      </View>
      <View role="list">
        {story.lessons.map((lesson, i) => {
          const first = lesson.id === start.lessonId;
          const done = lesson.status === 'done';
          const title = first ? start.title : lesson.title;
          const state = first ? `your first stop${ready ? ", you're ready for the next lesson" : ''}` : done ? 'done' : 'not started';
          return (
            <Animated.View
              key={lesson.id}
              role="listitem"
              accessible
              accessibilityLabel={`Stop ${i + 1}, ${title}, ${lesson.minutes} min, ${state}`}
              testID={first ? 'summary-first-lesson' : `route-stop-${lesson.id}`}
              style={
                reduced ? motion.fade : { ...motion.swap, animationDelay: i * STAGGER_MS, animationFillMode: 'backwards' }
              }
            >
              <View style={styles.stop} aria-hidden>
                <View style={styles.markerColumn}>
                  {i > 0 && <View style={[styles.track, styles.above, story.lessons[i - 1].status === 'done' && filled]} />}
                  {i < story.lessons.length - 1 && <View style={[styles.track, styles.below, done && filled]} />}
                  <View style={[styles.marker, first ? styles.markerFirst : done && { ...filled, borderColor: accent }]}>
                    {done && !first ? (
                      <Feather name="check" size={GLYPH} color={colors.textOnBrand} />
                    ) : (
                      <Text style={first ? styles.numberFirst : styles.number}>{i + 1}</Text>
                    )}
                  </View>
                </View>
                <View style={first ? styles.card : styles.row}>
                  {first && <Text style={styles.overline}>Your first stop</Text>}
                  <View style={styles.line}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.minutes}>{lesson.minutes} min</Text>
                  </View>
                  {first && ready && <Text style={type.labelDefault}>You&apos;re ready for the next lesson</Text>}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  hero: {
    minHeight: HERO_HEIGHT,
    padding: spacing.lg,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  art: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  skyline: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  building: { flex: 1, borderTopLeftRadius: radii.bar, borderTopRightRadius: radii.bar },
  icon: { position: 'absolute', right: spacing.xl, bottom: spacing.xl },
  // Landmarks stand in the right 40%.
  heading: { maxWidth: '60%', gap: spacing.xs },
  city: type.overline,
  topic: { ...type.bodyDefault, color: colors.textMuted },
  stop: { flexDirection: 'row', gap: spacing.md },
  markerColumn: { width: MARKER, alignItems: 'center', justifyContent: 'center' },
  track: { position: 'absolute', width: TRACK, backgroundColor: colors.borderDefault },
  above: { top: 0, bottom: '50%' },
  below: { top: '50%', bottom: 0 },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: radii.pill,
    borderWidth: RULE,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFirst: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  number: { ...type.labelStrong, color: colors.textMuted },
  numberFirst: { ...type.labelStrong, color: colors.textOnAccent },
  row: { flex: 1, paddingVertical: spacing.lg },
  card: {
    flex: 1,
    gap: spacing.xs,
    marginVertical: spacing.xs,
    padding: spacing.mdPlus,
    backgroundColor: colors.brandAccentSoft,
    borderWidth: RULE,
    borderColor: colors.brandPrimary,
    borderRadius: radii.card,
  },
  overline: { ...type.overline, color: colors.brandPrimary },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...type.titleCard, flex: 1 },
  minutes: { ...type.labelDefault, color: colors.textMuted },
});
