import { StyleSheet, Text, View } from 'react-native';

import { motion, Tappable } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix: string;
};

/** Pill switcher with a petrol active segment (Figma "Duel — Rankings"). */
export function SegmentedTabs<T extends string>({ options, value, onChange, testIDPrefix }: Props<T>) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tappable
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => onChange(o.value)}
            haptic="selection"
            containerStyle={styles.item}
            style={[styles.segment, active && styles.segmentActive, motion.colors]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.brandPrimarySoft, borderRadius: radii.pill, padding: spacing.xs },
  item: { flex: 1 },
  segment: { minHeight: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.brandPrimary },
  label: { ...type.labelStrong, color: colors.textMuted },
  labelActive: { color: colors.textOnBrand },
});
