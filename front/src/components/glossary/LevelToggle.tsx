import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, type } from '@/constants/theme';
import type { LanguageLevel } from '@/types/glossary';

type Props = {
  value: LanguageLevel;
  onChange: (level: LanguageLevel) => void;
};

const OPTIONS: { level: LanguageLevel; label: string }[] = [
  { level: 'plain', label: 'In plain words' },
  { level: 'standard', label: 'Standard' },
];

/** Segmented control: the same definition in everyday words or in the precise standard wording. */
export function LevelToggle({ value, onChange }: Props) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map(({ level, label }) => {
        const selected = value === level;
        return (
          <Pressable
            key={level}
            testID={`level-${level}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(level)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[type.labelDefault, styles.label, selected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: radii.pill, backgroundColor: colors.bgTint },
  option: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  optionSelected: { backgroundColor: colors.brandPrimary },
  label: { color: colors.textMuted },
  labelSelected: { ...type.labelStrong, color: colors.textOnBrand },
});
