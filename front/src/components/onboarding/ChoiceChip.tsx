import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props = { label: string; selected: boolean; onPress: () => void; testID?: string };

/** Figma "07 Survey · Goals" pill for a multi-select question. */
export function ChoiceChip({ label, selected, onPress, testID }: Props) {
  return (
    <Tappable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={selected}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.94}
      containerStyle={styles.target}
      style={[styles.chip, selected && styles.chipSelected, motion.colors]}
    >
      {/* Re-keyed so the icon pops each time the chip flips. */}
      <Animated.View key={String(selected)} style={motion.pop}>
        <Feather name={selected ? 'check' : 'plus'} size={spacing.mdPlus} color={selected ? colors.brandAccent : colors.textMuted} />
      </Animated.View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  // Taller than the pill: hitSlop does nothing on web.
  target: { minHeight: 44, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smPlus,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  label: { ...type.labelStrong },
  labelSelected: { color: colors.textOnBrand },
});
