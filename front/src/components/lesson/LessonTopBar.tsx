import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = {
  /** 0–1 */
  progress: number;
  plain: boolean;
  /** Hidden on the end screen. */
  showLangToggle: boolean;
  onTogglePlain: () => void;
  onClose: () => void;
};

/** Close · progress · "Aa" plain-language toggle. */
export function LessonTopBar({ progress, plain, showLangToggle, onTogglePlain, onClose }: Props) {
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
      {showLangToggle && (
        <Tappable
          onPress={onTogglePlain}
          accessibilityRole="switch"
          accessibilityLabel="Plain language"
          accessibilityState={{ checked: plain }}
          testID="lesson-plain-toggle"
          style={[styles.toggle, plain && styles.toggleOn]}
        >
          <Text style={[styles.toggleLabel, plain && styles.toggleLabelOn]}>Aa</Text>
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
  toggle: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  toggleLabel: { ...type.titleCard, color: colors.brandPrimary },
  toggleLabelOn: { color: colors.textOnBrand },
});
