import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii, spacing, type } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = {
  icon: BankIconName;
  label: string;
  onPress: () => void;
  /** `accent`: the yellow "New" circle on Payments. */
  variant?: 'default' | 'accent';
  testID?: string;
};

/** Round icon with a label under it (Transfer, Scan & pay, To card…). */
export function QuickAction({ icon, label, onPress, variant = 'default', testID }: Props) {
  return (
    <Tappable onPress={onPress} accessibilityRole="button" testID={testID} pressedScale={0.94} containerStyle={styles.container}>
      <View style={styles.item}>
        <View style={[styles.circle, variant === 'accent' && styles.accent]}>
          <Icon name={icon} size={22} color={colors.brandPrimary} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: { alignItems: 'center', gap: 6 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },
  accent: { backgroundColor: colors.brandAccent },
  label: { ...type.labelDefault, marginTop: spacing.xxs },
});
