import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, type } from '@/constants/theme';

/** Figma "Button / Large" variants (Type=Primary/Secondary/Dark/Ghost). */
type Variant = 'primary' | 'secondary' | 'dark' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.base, variantStyles[variant], pressed && styles.pressed]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.card,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  label: type.titleCard,
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.brandAccent },
  secondary: { backgroundColor: colors.brandPrimarySoft },
  dark: { backgroundColor: colors.brandPrimary },
  ghost: { backgroundColor: 'transparent' },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.textOnAccent },
  secondary: { color: colors.brandPrimary },
  dark: { color: colors.textOnBrand },
  ghost: { color: colors.brandPrimary },
});
