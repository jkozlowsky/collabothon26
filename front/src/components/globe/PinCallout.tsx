import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { StartHereBadge } from '@/components/StartHereBadge';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { CalloutState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  story: Story;
  state: CalloutState;
  onOpen: () => void;
  /** Set on the story the Quick check picked as the first stop. */
  startHere?: { why: string };
};

export const CALLOUT_WIDTH = 150;

const BUTTON: Record<Exclude<CalloutState, 'comingSoon'>, string> = {
  inProgress: 'Continue',
  notStarted: 'Start',
  done: 'Review',
};

/** Figma "Pin Callout" (3:599): city, what comes next, and the way into the story. */
export function PinCallout({ story, state, onOpen, startHere }: Props) {
  const { done, total } = story.progress;
  const next = story.nextLesson;

  const title = state === 'done' ? story.title : state === 'comingSoon' ? story.topic : (next?.title ?? story.title);
  const meta =
    state === 'done'
      ? `All ${total} lessons done`
      : state === 'comingSoon'
        ? 'Coming soon'
        : `Lesson ${done + 1} of ${total}${next ? ` · ${next.minutes} min` : ''}`;

  return (
    <View style={styles.card} testID="pin-callout">
      {startHere && <StartHereBadge testID="callout-start-here" />}
      <Text style={styles.overline}>{story.city}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{meta}</Text>
      {startHere && (
        <Text style={styles.why} testID="callout-why-here">
          {startHere.why}
        </Text>
      )}
      {state !== 'comingSoon' && (
        <Tappable
          onPress={onOpen}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={`${BUTTON[state]} ${story.city}`}
          testID="pin-callout-open"
          containerStyle={styles.buttonWrap}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{BUTTON[state]}</Text>
          <Feather name="arrow-right" size={16} color={colors.textOnAccent} />
        </Tappable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CALLOUT_WIDTH,
    padding: spacing.md,
    gap: spacing.xxs,
    borderRadius: radii.card,
    backgroundColor: colors.bgSurface,
    ...elevation.mid,
  },
  overline: { ...type.overline, color: colors.brandPrimary },
  title: type.titleCard,
  why: { ...type.labelDefault, color: colors.textPrimary },
  meta: { ...type.labelDefault, color: colors.textMuted },
  buttonWrap: { alignSelf: 'flex-start', marginTop: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.mdPlus,
    paddingRight: spacing.md,
    borderRadius: radii.button,
    backgroundColor: colors.brandAccent,
  },
  buttonLabel: { ...type.labelStrong, color: colors.textOnAccent },
});

/** The arena's callout is the same card with fixed texts. */
export { styles as calloutStyles };
