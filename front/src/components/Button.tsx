import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Props = { label: string; onPress: () => void; testID?: string };

export function Button({ label, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  pressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.98 }] },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
