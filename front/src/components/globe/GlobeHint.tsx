import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

/** Pill under the globe that explains it; the screen hides it after the first spin. */
export function GlobeHint() {
  return (
    <View style={styles.pill}>
      <Feather name="rotate-cw" size={14} color={colors.textMuted} />
      <Text style={styles.label}>Drag to spin · tap a pin to open its story</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  label: { ...type.labelDefault, color: colors.textMuted },
});
