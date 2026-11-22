import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, pressFeedback, radii, type } from '@/constants/theme';

type Props = {
  count: number;
  active: boolean;
  onPress: () => void;
};

/** Header pill that switches the glossary between all terms and the saved ones. Petrol when active. */
export function SavedToggle({ count, active, onPress }: Props) {
  return (
    <Pressable
      testID="saved-toggle"
      accessibilityRole="button"
      accessibilityLabel={active ? 'Show all terms' : `Show saved terms (${count})`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, active && styles.active, pressed && pressFeedback]}
    >
      <Ionicons
        name={active || count > 0 ? 'star' : 'star-outline'}
        size={16}
        color={active ? colors.brandAccent : count > 0 ? colors.feedbackXp : colors.textPrimary}
      />
      <Text style={[type.labelStrong, active && styles.activeLabel]}>Saved{count > 0 ? ` · ${count}` : ''}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  active: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  activeLabel: { color: colors.textOnBrand },
});
