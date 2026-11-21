import { StyleSheet } from 'react-native';

import { Icon } from '@/components/bank/Icon';
import { Tappable } from '@/components/onboarding/ui';
import { colors, elevation, radii } from '@/constants/theme';
import type { BankIconName } from '@/types/bank';

type Props = {
  icon: BankIconName;
  label: string;
  onPress: () => void;
  /** `onBrand` is the translucent variant for petrol screens. */
  tone?: 'default' | 'onBrand';
  testID?: string;
};

/** Round white header button (search, scan, bell, calendar). */
export function IconButton({ icon, label, onPress, tone = 'default', testID }: Props) {
  const onBrand = tone === 'onBrand';
  return (
    <Tappable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} pressedScale={0.92} style={[styles.button, onBrand && styles.onBrand]}>
      <Icon name={icon} size={20} color={onBrand ? colors.textOnBrand : colors.brandPrimary} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },
  onBrand: { backgroundColor: colors.onBrandTile, shadowOpacity: 0, elevation: 0 },
});
