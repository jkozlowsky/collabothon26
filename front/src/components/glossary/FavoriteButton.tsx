import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, elevation, radii } from '@/constants/theme';

type Props = {
  saved: boolean;
  onPress: () => void;
  /** circle: white round button (definition header). compact: bare star inside a list row. */
  variant?: 'circle' | 'compact';
  /** Term name, so screen readers say which term is saved ("Save ETF"). */
  termName?: string;
  testID?: string;
};

/** Star toggle: outline = not saved, filled yellow = saved. Touch area is always 44 px. */
export function FavoriteButton({ saved, onPress, variant = 'circle', termName, testID = 'favorite-button' }: Props) {
  const label = termName
    ? saved
      ? `Remove ${termName} from saved`
      : `Save ${termName}`
    : saved
      ? 'Remove from saved'
      : 'Save term';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={variant === 'compact' ? 4 : 0}
      style={({ pressed }) => [variant === 'circle' ? styles.circle : styles.compact, pressed && styles.pressed]}
    >
      <Ionicons
        name={saved ? 'star' : 'star-outline'}
        size={variant === 'circle' ? 22 : 20}
        color={saved ? colors.brandAccent : variant === 'circle' ? colors.textPrimary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },
  compact: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.9 }] },
});
