import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { StartHereBadge } from '@/components/StartHereBadge';
import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, storyColors, tints, type } from '@/constants/theme';
import { storyLabel, type StoryState } from '@/lib/stories';
import type { Story } from '@/types/stories';

type Props = {
  story: Story;
  state: StoryState;
  onPress: () => void;
  /** Set on the story the Quick check picked as the first stop. */
  startHere?: { why: string };
};

/** Figma "Story Card": icon tile in the story colour, title, "{city} · {topic}", then progress or status. */
export function StoryCard({ story, state, onPress, startHere }: Props) {
  const { done, total } = story.progress;
  const locked = state === 'comingSoon';
  const active = state === 'active';
  const color = locked ? colors.storySlate : storyColors[story.color];

  return (
    <Tappable
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={storyLabel(story)}
      testID={`story-card-${story.id}`}
      style={[styles.card, motion.colors, active && styles.cardActive, locked && styles.cardLocked]}
    >
      <View style={[styles.tile, { backgroundColor: active ? colors.brandAccent : locked ? tints.slate : tints[story.color] }]}>
        <Feather name={locked ? 'lock' : story.icon} size={22} color={active ? colors.textOnAccent : color} />
      </View>
      <View style={styles.body}>
        {startHere && <StartHereBadge testID="story-card-start-here" />}
        <Text style={styles.title} numberOfLines={1}>
          {story.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {story.city} · {story.topic}
        </Text>
        {startHere && (
          <Text style={styles.why} testID="story-card-why-here">
            {startHere.why}
          </Text>
        )}
        {!locked && (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${total ? (done / total) * 100 : 0}%` },
                state === 'done' && styles.fillDone,
              ]}
            />
          </View>
        )}
      </View>
      {state === 'done' ? (
        <View style={styles.status}>
          <Feather name="check" size={14} color={colors.feedbackSuccess} />
          <Text style={styles.done}>Done</Text>
        </View>
      ) : locked ? (
        <Text style={styles.meta}>Coming soon</Text>
      ) : (
        <Text style={styles.count}>
          {done}/{total}
        </Text>
      )}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingLeft: spacing.md,
    paddingRight: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  // The current story: the screen's yellow focal point in the list.
  cardActive: { backgroundColor: colors.brandAccentSoft, borderWidth: 2, borderColor: colors.brandPrimary },
  cardLocked: { opacity: 0.6 },
  tile: { width: 44, height: 44, borderRadius: radii.tile, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xs },
  title: type.titleCard,
  meta: { ...type.labelDefault, color: colors.textMuted },
  why: { ...type.labelDefault, color: colors.textPrimary },
  track: { width: 150, maxWidth: '100%', height: 5, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandPrimary },
  fillDone: { backgroundColor: colors.feedbackSuccess },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  done: { ...type.labelStrong, color: colors.feedbackSuccess },
  count: { ...type.labelStrong, color: colors.textPrimary },
});
