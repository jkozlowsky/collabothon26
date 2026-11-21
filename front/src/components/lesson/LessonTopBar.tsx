import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** 0–1 */
  progress: number;
  /** Switches to the video form; set only when the lesson has a video track and is not finished. */
  onWatch?: () => void;
  onClose: () => void;
};

/** Close · progress · "Watch" (the video form of the same lesson, when it has one). */
export function LessonTopBar({ progress, onWatch, onClose }: Props) {
  return (
    <View style={styles.bar}>
      <Tappable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close lesson" testID="lesson-close" style={styles.icon}>
        <Icon name="close" size={22} color={colors.brandPrimary} />
      </Tappable>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      {onWatch && (
        <Tappable
          onPress={onWatch}
          accessibilityRole="button"
          accessibilityLabel="Watch this lesson as video"
          testID="lesson-watch"
          style={styles.watch}
        >
          <Icon name="watch" size={16} color={colors.brandPrimary} />
          <Text style={styles.watchLabel}>Watch</Text>
        </Tappable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 8, borderRadius: radii.bar, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.bar, backgroundColor: colors.brandPrimary },
  watch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  watchLabel: { ...type.labelStrong, color: colors.brandPrimary },
});
