import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/bank/Icon';
import { Sheet } from '@/components/bank/Sheet';
import { colors, fonts, radii, spacing, type } from '@/constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  city: string;
  /** The locked lesson the user tried to reach. */
  targetTitle: string;
  /** The first open lesson: finishing it starts the chain that unlocks the target. */
  next: { title: string; meta: string; stop: number } | null;
  /** Lessons still to finish before the target opens (the first open one counts). */
  missing: number;
  onStart: () => void;
};

/** "Oops, lesson locked" (Figma frame 16): why it is locked, the two stops that matter, and a way forward. */
export function LockedLessonSheet({ visible, onClose, city, targetTitle, next, missing, onStart }: Props) {
  const finish = next
    ? missing > 1
      ? `Finish "${next.title}" and ${missing - 1} more first.`
      : `Finish "${next.title}" to unlock "${targetTitle}".`
    : `Finish the earlier lessons to unlock "${targetTitle}".`;

  return (
    <Sheet visible={visible} onClose={onClose} testID="story-locked-sheet">
      <View style={styles.content}>
        <View style={styles.badge}>
          <Icon name="lock" size={26} color={colors.feedbackDanger} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Oops, lesson locked
        </Text>
        <Text style={styles.body} testID="story-locked-message">
          Lessons in {city} open one by one. {finish}
        </Text>
        {next && (
          <View style={styles.mini}>
            <View style={styles.stop}>
              <View style={[styles.no, styles.noNext]}>
                <Text style={styles.noText}>{next.stop}</Text>
              </View>
              <View style={styles.stopText}>
                <Text style={styles.stopTitle} numberOfLines={1}>
                  {next.title}
                </Text>
                <Text style={styles.stopMeta}>{next.meta}</Text>
              </View>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textMuted} />
            <View style={styles.stop}>
              <View style={[styles.no, styles.noLocked]}>
                <Icon name="lock" size={14} color={colors.feedbackDanger} />
              </View>
              <View style={styles.stopText}>
                <Text style={styles.stopTitle} numberOfLines={1}>
                  {targetTitle}
                </Text>
                <Text style={[styles.stopMeta, { color: colors.feedbackDanger }]}>Locked</Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.actions}>
          {next && <Button label={`Start "${next.title}"`} onPress={onStart} testID="story-locked-open" />}
          <Button label="Got it" variant="ghost" onPress={onClose} testID="story-locked-close" />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.mdPlus },
  badge: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.feedbackDangerTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.textPrimary, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', backgroundColor: colors.bgCanvas, borderRadius: radii.tile, paddingVertical: spacing.smPlus, paddingHorizontal: spacing.md },
  stop: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  no: { width: 26, height: 26, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  noNext: { backgroundColor: colors.brandAccent, borderColor: colors.brandPrimary },
  noLocked: { backgroundColor: colors.feedbackDangerTint, borderColor: 'transparent' },
  noText: { ...type.labelStrong, color: colors.textOnAccent },
  stopText: { flex: 1, minWidth: 0 },
  stopTitle: { ...type.labelStrong, color: colors.textPrimary },
  stopMeta: { ...type.labelDefault, color: colors.textMuted },
  actions: { alignSelf: 'stretch', gap: spacing.xs },
});
