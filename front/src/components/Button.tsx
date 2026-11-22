import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, pressFeedback, radii, spacing, type } from '@/constants/theme';

/** Figma "Button / Large" variants (Type=Primary/Secondary/Dark/Ghost). */
type Variant = 'primary' | 'secondary' | 'dark' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, variantStyles[variant], pressed && pressFeedback, disabled && styles.disabled]}
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
  disabled: { opacity: 0.4 },
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
