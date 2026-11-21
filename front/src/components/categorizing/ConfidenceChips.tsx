import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HAIRLINE } from '@/constants/path';
import { CONFIDENCE } from '@/constants/quickCheck';
import { colors, radii, spacing, type } from '@/constants/theme';
import type { Confidence } from '@/types/quickCheck';

type Props = {
  disabled: boolean;
  onPick: (confidence: Confidence) => void;
};

const BAR_WIDTH = 4;
const BAR_HEIGHTS = [5, 8, 12];

/** "How sure are you?" inside the tapped tile; the bars show the level so colour is never the only cue. */
export function ConfidenceChips({ disabled, onPick }: Props) {
  return (
    <View style={styles.group} role="group" aria-label="How sure are you?">
      <Text style={type.labelStrong}>How sure are you?</Text>
      <View style={styles.chips}>
        {CONFIDENCE.map(({ value, label, bars }) => (
          <Pressable
            key={value}
            testID={`confidence-${value}`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onPick(value)}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed, disabled && styles.disabled]}
          >
            <View style={styles.bars} aria-hidden>
              {BAR_HEIGHTS.map((height, i) => (
                <View key={height} style={[styles.bar, { height }, i < bars && styles.barOn]} />
              ))}
            </View>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    minHeight: 52,
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.tile,
    borderWidth: HAIRLINE,
    borderColor: colors.textMuted,
    backgroundColor: colors.bgSurface,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  disabled: { opacity: 0.5 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
  bar: { width: BAR_WIDTH, borderRadius: 1, backgroundColor: colors.borderStrong },
  barOn: { backgroundColor: colors.brandPrimary },
  label: { ...type.labelStrong, color: colors.brandPrimary, textAlign: 'center' },
});
