import { router } from 'expo-router';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { LessonSummary } from '@/types/lessons';

export type StopState = 'done' | 'current' | 'locked' | 'open';

type Props = {
  lesson: LessonSummary;
  index: number;
  state: StopState;
  /** The track above is coloured when the stop before is done. */
  previousDone: boolean;
  last: boolean;
  /** Opened from a link to this lesson: outlined in petrol. */
  highlighted?: boolean;
  accent: string;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/** A slow ring around the current stop's marker: "you are here". Reanimated CSS animation. */
const PULSE = {
  animationName: { from: { opacity: 0.55, transform: [{ scale: 1 }] }, to: { opacity: 0, transform: [{ scale: 1.7 }] } },
  animationDuration: 1600,
  animationIterationCount: 'infinite',
} as const;

const open = (id: string) => router.push({ pathname: '/lesson/[id]', params: { id } });

/**
 * One mission on the path's route. Done: a compact row with replay. Current: the one large card with the yellow
 * action. Locked: dimmed, with a lock. The track between markers fills in the path colour as missions are done.
 */
export function PathStop({ lesson, index, state, previousDone, last, highlighted, accent, onLayout }: Props) {
  const reduceMotion = useReducedMotion();
  const current = state === 'current';
  const done = state === 'done';
  const locked = state === 'locked';
  const filled = { backgroundColor: accent };
  const meta = [`${lesson.minutes} min`, done ? 'Done' : locked ? 'Locked' : `+${lesson.xp} XP`].join(' · ');

  return (
    <View style={styles.stop} onLayout={onLayout} testID={`path-stop-${lesson.id}`}>
      <View style={styles.markerColumn} aria-hidden>
        {index > 0 && <View style={[styles.track, styles.trackAbove, previousDone && filled]} />}
        {!last && <View style={[styles.track, styles.trackBelow, done && filled]} />}
        {current && !reduceMotion && <Animated.View style={[styles.marker, styles.pulse, PULSE]} />}
        <View
          style={[
            styles.marker,
            done && { ...styles.markerDone, ...filled },
            current && styles.markerCurrent,
            locked && styles.markerLocked,
          ]}
        >
          {done ? (
            <Icon name="check" size={18} color={colors.textOnBrand} />
          ) : locked ? (
            <Icon name="lock" size={16} color={colors.textMuted} />
          ) : (
            <Text style={styles.markerNumber}>{index + 1}</Text>
          )}
        </View>
      </View>

      {current || state === 'open' ? (
        <View style={[styles.card, current && styles.cardCurrent, highlighted && styles.cardHighlighted]}>
          {current && (
            <View style={styles.upNext}>
              <Text style={styles.upNextText}>Up next</Text>
            </View>
          )}
          <Text style={[styles.overline, { color: accent }]}>Mission {index + 1}</Text>
          <Text style={styles.titleLarge}>{lesson.title}</Text>
          {lesson.topic && <Text style={styles.topic}>{lesson.topic}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{meta}</Text>
            {lesson.video && (
              <View accessible accessibilityLabel="Also as video" testID={`lesson-video-${lesson.id}`} style={styles.videoChip}>
                <Icon name="film" size={13} color={colors.textMuted} />
                <Text style={styles.meta}>Video</Text>
              </View>
            )}
          </View>
          <View style={styles.action}>
            <Button label="Start mission" testID={`lesson-${lesson.id}`} onPress={() => open(lesson.id)} />
          </View>
        </View>
      ) : (
        <Tappable
          disabled={locked}
          onPress={() => open(lesson.id)}
          accessibilityRole="button"
          accessibilityLabel={locked ? `${lesson.title}, locked` : `Replay ${lesson.title}`}
          testID={done ? `lesson-${lesson.id}` : undefined}
          containerStyle={styles.rowWrap}
          style={[styles.row, highlighted && styles.cardHighlighted, locked && styles.rowLocked]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.overline, { color: locked ? colors.textMuted : accent }]}>Mission {index + 1}</Text>
            <Text style={[styles.title, locked && styles.mutedText]} numberOfLines={2}>
              {lesson.title}
            </Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
          {done && (
            <View style={styles.replay}>
              <Icon name="replay" size={16} color={colors.brandPrimary} />
            </View>
          )}
        </Tappable>
      )}
    </View>
  );
}

const MARKER = 40;

const styles = StyleSheet.create({
  stop: { flexDirection: 'row', gap: spacing.md },
  markerColumn: { width: MARKER, alignItems: 'center' },
  track: { position: 'absolute', width: 6, borderRadius: radii.bar, backgroundColor: colors.borderDefault },
  trackAbove: { top: 0, height: 22 },
  trackBelow: { top: 22, bottom: 0 },
  marker: {
    position: 'absolute',
    top: 2,
    width: MARKER,
    height: MARKER,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDone: { borderColor: colors.bgSurface },
  markerCurrent: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary, ...elevation.pin },
  markerLocked: { backgroundColor: colors.bgCanvas, borderColor: colors.borderDefault },
  pulse: { backgroundColor: colors.brandAccent, borderColor: colors.brandAccent },
  markerNumber: { ...type.titleCard, color: colors.brandPrimary },
  card: {
    flex: 1,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardCurrent: { borderWidth: 2, borderColor: colors.brandAccent, ...elevation.mid },
  cardHighlighted: { borderWidth: 2, borderColor: colors.brandPrimary },
  upNext: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandAccent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  upNextText: { ...type.overline, color: colors.textOnAccent },
  overline: type.overline,
  titleLarge: type.titleSection,
  title: type.titleCard,
  topic: { ...type.bodyDefault, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xxs },
  meta: { ...type.labelDefault, color: colors.textMuted },
  videoChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  action: { marginTop: spacing.sm },
  rowWrap: { flex: 1, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  rowLocked: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  rowText: { flex: 1, gap: spacing.xxs },
  mutedText: { color: colors.textMuted },
  replay: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.brandPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
